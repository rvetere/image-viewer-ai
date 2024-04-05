import { app, dialog } from 'electron';
import * as fg from 'fast-glob';
import * as fs from 'fs';
import { StaticPool } from 'node-worker-threads-pool-ts';
import { cpus } from 'os';
import { resolve } from 'path';
import { getScanByDirectory, insertFiles, insertScans } from '../../data/db';
import { ImageWithDefinitions } from '../types';

const WORKER_AMOUNT = cpus().length > 3 ? cpus().length - 2 : 1;

export const browse = async (_e) => {
  const path = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });

  const pattern = `${path.filePaths[0]}\\**\\*.(jpg|jpeg|png|webp|gif)`.replace(
    /\\/gi,
    '/'
  );

  const files = await fg([pattern], { dot: false });
  console.log(`Found ${files.length} image files`);
  const appDataPath = app.getPath('userData');
  fs.mkdirSync(`${appDataPath}/image-viewer/resized`, { recursive: true });
  console.log({ appDataPath });

  const batchSize = Math.ceil(files.length / WORKER_AMOUNT);
  console.log(
    `🧵 Create worker pool of ${WORKER_AMOUNT}, each will scan ~${batchSize} files..`
  );
  const batchedFiles = [];
  for (let i = 0; i < files.length; i += batchSize) {
    batchedFiles.push(files.slice(i, i + batchSize));
  }

  const staticPool = new StaticPool({
    size: WORKER_AMOUNT,
    task: resolve(
      __dirname,
      '../../libs/worker-thread/src/lib/readImageFileDimensions.js'
    ),
  });

  const allWorkers = batchedFiles.map((batch) =>
    staticPool.exec({
      files: batch,
      appDataPath,
    })
  );
  const allResults = await Promise.all(allWorkers);
  const finalEntries = allResults.flat() as ImageWithDefinitions[];

  staticPool.destroy();

  const existingScan = getScanByDirectory(path.filePaths[0]);
  const scanId = existingScan
    ? existingScan.id
    : insertScans([path.filePaths[0]]);

  console.log('Processed all images', {
    filesWithDimensions: finalEntries.length,
    existingScan: existingScan ? existingScan.id : 'not existing',
  });

  return [path.filePaths[0], finalEntries, scanId];
};
