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
  try {
    const numChannels = 3;
    const numPixels = image.width * image.height;
    const values = new Int32Array(numPixels * numChannels);
  
    for (let i = 0; i < numPixels; i++)
      for (let c = 0; c < numChannels; ++c)
        values[i * numChannels + c] = image.data[i * 4 + c];
  
    return tf.tensor3d(values, [image.height, image.width, numChannels], 'int32');
  } catch (e) {
    console.error(e);
    return null;
  }
  
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
      if (size.height > 8000 || size.width > 8000) {
        console.log("Skip image as it exceeds a maximum of 8000 pixels");
        return {
          src,
          size,
          resizedDataUrl
        };
      }
      try {
        const sharp = await getSharpImage(resizedDataUrl ? resizedDataUrl : src);
        const image = await convert({ ...sharp.info, data: sharp.data });
        const predictions = image ? await _model.classify(image as any) : undefined;
        return {
          src,
          size,
          resizedDataUrl,
          predictions,
        };
      } catch (e) {
        console.error(e);
        return {
          src,
          size,
          resizedDataUrl,
        };
      }
      
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
