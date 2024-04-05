/**
 * This module is responsible on handling all the inter process communications
 * between the frontend to the electron backend.
 */

import { app, ipcMain } from 'electron';
import * as fs from 'fs';
import { environment } from '../../environments/environment';
import { classifyImages } from '../lib/classifyImages';
import { sleep } from '../lib/sleep';
import {
  getFiles,
  insertFiles,
  insertScans,
  updateFileFavorite,
} from '../../data/db';

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

ipcMain.handle('classify-images', async (event, paths, existingDefs) => {
  // filter out images that already have definitions
  const filteredPaths = paths.filter(({ src }) => {
    const existing = existingDefs.find((def) => def.src === src);
    if (existing) {
      return !Boolean(existing.nudenet);
    }
    return true;
  });
  // get all existing defs with nudenet
  const validExistingDefs = existingDefs.filter(({ nudenet }) =>
    Boolean(nudenet)
  );

  let result = [...validExistingDefs];
  const batchSize = 2000;
  for (let i = 0; i < filteredPaths.length; i += batchSize) {
    const batch = filteredPaths.slice(i, i + batchSize);
    const batchResult = await classifyImages(batch);
    result = [...result, ...batchResult];
    await sleep(500);
  }

  return result;
});

ipcMain.handle('insert-files', (event, scanId, files) => {
  return insertFiles(scanId, files);
});

ipcMain.handle('get-files', (event, scanId) => {
  return getFiles(scanId);
});

ipcMain.handle('update-file-favorite', (event, id, favorite) => {
  return updateFileFavorite(id, favorite);
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

// Handle App termination
ipcMain.on('quit', (event, code) => {
  app.exit(code);
});
