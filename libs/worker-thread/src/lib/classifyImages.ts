import * as tf from '@tensorflow/tfjs-node';
import * as nsfw from 'nsfwjs';
import * as sharp from 'sharp';
import { parentPort } from 'worker_threads';
import { ImageWithDefinitions } from '../types';

interface IClassifyImagesParams {
  files: ImageWithDefinitions[];
  existingDefs: ImageWithDefinitions[];
}

const convert = async (image: any) => {
  const numChannels = 3;
  const numPixels = image.width * image.height;
  const values = new Int32Array(numPixels * numChannels);

  for (let i = 0; i < numPixels; i++)
    for (let c = 0; c < numChannels; ++c)
      values[i * numChannels + c] = image.data[i * 4 + c];

  return tf.tensor3d(values, [image.height, image.width, numChannels], 'int32');
};

const getSharpImage = (filePath: string) => {
  return new Promise(
    (
      resolve: (result: { data: Buffer; info: sharp.OutputInfo }) => void,
      reject
    ) => {
      sharp(filePath)
        .raw()
        .toBuffer({ resolveWithObject: true })
        .then(({ data, info }) => {
          resolve({ data, info });
        })
        .catch((err) => {
          console.error('Error processing image:', err);
          reject('Error processing image!');
        });
    }
  );
};

export const workerThread = async ({
  files,
  existingDefs,
}: IClassifyImagesParams) => {
  const _model = await nsfw.load();
  const finalEntries = files.map(
    async ({ src, size, resizedDataUrl }, _index) => {
      const existing = existingDefs.find((def) => def.src === src);
      if (existing) {
        return { ...existing, resizedDataUrl, size };
      }
      const sharp = await getSharpImage(src);
      const image = await convert({ ...sharp.info, data: sharp.data });
      const predictions = await _model.classify(image as any);
      return {
        src,
        size,
        resizedDataUrl,
        predictions,
      };
    }
  );
  const result = await Promise.all(finalEntries);
  return result;
};

parentPort?.on('message', (param: IClassifyImagesParams) => {
  workerThread(param).then((result) => {
    // return the result to main thread.
    parentPort?.postMessage(result);
  });
});
