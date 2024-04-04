import * as sharp from 'sharp';
import { parentPort } from 'worker_threads';
import { ImageWithDefinitions } from '../types';
import { initNudenet, runDetection } from './nudenet';

interface IClassifyImagesParams {
  files: ImageWithDefinitions[];
}

const getSharpJpgImageBuffer = (filePath: string) => {
  return new Promise(
    (
      resolve: (result: { data: Buffer; info: sharp.OutputInfo }) => void,
      reject
    ) => {
      sharp(filePath)
        // .raw()
        .toFormat('jpeg')
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

export const workerThread = async ({ files }: IClassifyImagesParams) => {
  const model = await initNudenet();

  const finalEntries = files.map(async ({ src, size, resizedDataUrl }) => {
    if (size.height > 8000 || size.width > 8000) {
      console.log('Skip image as it exceeds a maximum of 8000 pixels');
      return {
        src,
        size,
        resizedDataUrl,
      };
    }
    try {
      const res = await getSharpJpgImageBuffer(
        resizedDataUrl ? resizedDataUrl : src
      );
      const predictions = model
        ? await runDetection(model, src, res.data)
        : null;
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
  });
  const result = await Promise.all(finalEntries);
  return result;
};

parentPort?.on('message', (param: IClassifyImagesParams) => {
  workerThread(param).then((result) => {
    // return the result to main thread.
    parentPort?.postMessage(result);
  });
});
