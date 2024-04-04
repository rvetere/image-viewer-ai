/**
 * This module is responsible on handling all the inter process communications
 * between the frontend to the electron backend.
 */

import * as deepAi from 'deepai';
import { app, ipcMain } from 'electron';
import * as fs from 'fs';
import { StaticPool } from 'node-worker-threads-pool-ts';
import * as nsfw from 'nsfwjs';
import { cpus } from 'os';
import { resolve } from 'path';
import { environment } from '../../environments/environment';
import { ImageWithDefinitions } from '../types';

deepAi.setApiKey('3e882628-c80d-47d2-b998-79253fd76f15');

let _model = null;
nsfw.load().then((model) => {
  _model = model;
});

const WORKER_AMOUNT = cpus().length > 3 ? cpus().length - 2 : 1;

export default class ElectronEvents {
  static bootstrapElectronEvents(): Electron.IpcMain {
    return ipcMain;
  }
}

// Retrieve app version
ipcMain.handle('get-app-version', (event) => {
  console.log(`Fetching application version... [v${environment.version}]`);

  return environment.version;
});

ipcMain.handle('delete-image', (event, paths) => {
  paths.forEach((path) => {
    console.log('Deleting image: ', path.trim());

    if (fs.existsSync(path.trim())) {
      console.log('Exists, delete now..');

      fs.unlinkSync(path.trim());
    } else {
      console.log('Does not Exists, skip!');
    }
  });
  return true;
});

ipcMain.handle('store-data', (event, path, content) => {
  const appDataPath = app.getPath('userData');
  const targetPath = `${appDataPath}/image-viewer/${path}`;
  console.log({ targetPath });

  fs.writeFileSync(`${targetPath}`, content);
  return true;
});

ipcMain.handle('get-data', (event, path) => {
  const appDataPath = app.getPath('userData');
  const targetPath = `${appDataPath}/image-viewer/${path}`;
  if (fs.existsSync(targetPath)) {
    return fs.readFileSync(`${targetPath}`, 'utf8');
  }
  return null;
});

ipcMain.handle('classify-images', async (event, paths, existingDefs) => {
  let result = [];
  const batchSize = 1000;
  for (let i = 0; i < paths.length; i += batchSize) {
    const batch = paths.slice(i, i + batchSize);
    const batchResult = await classifyImages(batch, existingDefs);
    result = [...result, ...batchResult];
    await sleep(500);
  }

  return result;
});

const classifyImages = async (paths: string[], existingDefs: ImageWithDefinitions[]) => {
  const batchSize = Math.ceil(paths.length / WORKER_AMOUNT);
  console.log(
    `🧵 Create worker pool of ${WORKER_AMOUNT}, each will scan ~${batchSize} files..`
  );
  const batchedFiles = [];
  for (let i = 0; i < paths.length; i += batchSize) {
    batchedFiles.push(paths.slice(i, i + batchSize));
  }

  const staticPool = new StaticPool({
    size: WORKER_AMOUNT,
    task: resolve(
      __dirname,
      '../../libs/worker-thread/src/lib/classifyImages.js'
    ),
  });

  const allWorkers = batchedFiles.map((batch) =>
    staticPool.exec({
      files: batch,
      existingDefs,
    })
  );
  const allResults = await Promise.all(allWorkers);
  const filesWithPredictions = allResults.flat();

  staticPool.destroy();
  return filesWithPredictions;
}

ipcMain.handle('nudity-ai', async (event, path) => {
  console.log(`Fetching nudity DeepAI: "${path}"`);

  const result = await deepAi.callStandardApi('content-moderation', {
    image: fs.createReadStream(path),
  });
  console.log({ result });

  return result;
});

ipcMain.handle('nudity-ai-bulk', async (event, paths) => {
  console.log(`Fetching nudity DeepAI Bulk: "${paths.length}"`);

  const promises = paths.map(async (path) => {
    try {
      const result = await deepAi.callStandardApi('content-moderation', {
        image: fs.createReadStream(path),
      });
      console.log({ result });
      await sleep(1500);

      return result;
    } catch (e) {
      return null;
    }
  });

  const results = await Promise.all(promises);
  console.log(`Finished fetching ${results.length} requests with nudity API..`);

  return results;
});

const sleep = (time: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, time);
  });
};

// Handle App termination
ipcMain.on('quit', (event, code) => {
  app.exit(code);
});
