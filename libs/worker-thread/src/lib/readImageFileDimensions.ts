import sizeOf from 'image-size';
import * as fs from 'fs';
import * as sharp from 'sharp';
import { parentPort } from 'worker_threads';

interface IReadImageFileDimensionsParams {
  files: string[];
  appDataPath: string;
}

const getImageSize = (path: string) => {
  return new Promise(
    (
      resolve: (dimensions: { width?: number; height?: number }) => void,
      reject
    ) => {
      sizeOf(path, function (err, dimensions) {
        if (err) {
          reject(err);
        }
        if (dimensions) {
          resolve(dimensions);
        } else {
          reject('No dimensions found');
        }
      });
    }
  );
};

const resizeImageWithSharp = async (path: string, size: { width: number; height: number; }) => {
  try {
    const image = sharp(path);
    const metadata = await image.metadata();
    if (metadata.width && metadata.width > 600) {
      return image.resize(600).toBuffer();
    }
    return image.toBuffer();
  } catch (e) {
    console.log("Image WAY TOO BIG", {size});
    console.error(e);
    return null;
  }  
};

const hashCode = (input: string) => {
  if (!input) {
    return -1;
  }
  let hash = 0,
    i,
    chr;
  if (input.length === 0) return hash;
  for (i = 0; i < input.length; i++) {
    chr = input.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

export const workerThread = async ({
  files,
  appDataPath,
}: IReadImageFileDimensionsParams) => {
  const finalEntries = files.map(async (src, _index) => {
    const extension = src.split('.').pop();
    let size: {width?: number; height?: number} = {};
    try {
      const newSize = await getImageSize(src);
      if (newSize) {
        size = newSize;
      }
    } catch (e) {
      // ignore, probably no image at all
    }    
    const { width = 0, height = 0 } = size;
    const hash = hashCode(src);
    const targetPath = `${appDataPath}/image-viewer/resized/${hash}.jpg`;
    if (fs.existsSync(targetPath)) {
      return {
        src,
        resizedDataUrl: targetPath,
        size: {
          width: 600,
          height: Math.round((height / width) * 600),
        },
      };
    } else if (width > 600 && extension !== 'gif') {
      const newJpeg = await resizeImageWithSharp(src, {width, height});
      if (newJpeg) {
        fs.writeFileSync(targetPath, newJpeg);
      }
      
      return {
        src,
        resizedDataUrl: newJpeg ? targetPath : undefined,
        size: newJpeg ? {
          width: 600,
          height: Math.round((height / width) * 600),
        } : size,
      };
    }
    return {
      src,
      resizedDataUrl: undefined,
      size: { width, height },
    };
  });
  const result = await Promise.all(finalEntries);
  return result;
};

parentPort?.on('message', (param: IReadImageFileDimensionsParams) => {
  workerThread(param).then((result) => {
    // return the result to main thread.
    parentPort?.postMessage(result);
  });
});
