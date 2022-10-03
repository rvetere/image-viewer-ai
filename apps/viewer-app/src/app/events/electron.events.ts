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

ipcMain.handle('nudity-ai', async (event, path) => {
  console.log(`Fetching nudity DeepAI: "${path}"`);

  const result = await deepAi.callStandardApi('content-moderation', {
    image: fs.createReadStream(path),
  });
  console.log({ result });

  return result;
});

// Handle App termination
ipcMain.on('quit', (event, code) => {
  app.exit(code);
});
