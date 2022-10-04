/**
 * This module is responsible on handling all the inter process communications
 * between the frontend to the electron backend.
 */

import { app, ipcMain } from 'electron';
import { environment } from '../../environments/environment';
import * as fs from 'fs';
import * as deepAi from 'deepai';

deepAi.setApiKey('3e882628-c80d-47d2-b998-79253fd76f15');

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
