import {
  BrowserWindow,
  app,
  dialog,
  ipcMain,
  nativeImage,
  screen,
  shell,
} from 'electron';
import * as fg from 'fast-glob';
import * as fs from 'fs';
import { StaticPool } from 'node-worker-threads-pool-ts';
import { cpus } from 'os';
import { join } from 'path';
import { format } from 'url';
import { environment } from '../environments/environment';
import { rendererAppName, rendererAppPort } from './constants';
// const Store = require('electron-store');

// const store = new Store();

const WORKER_AMOUNT = cpus().length > 3 ? cpus().length - 2 : 1;

export default class App {
  // Keep a global reference of the window object, if you don't, the window will
  // be closed automatically when the JavaScript object is garbage collected.
  static mainWindow: Electron.BrowserWindow;
  static application: Electron.App;
  static BrowserWindow;

  public static isDevelopmentMode() {
    const isEnvironmentSet: boolean = 'ELECTRON_IS_DEV' in process.env;
    const getFromEnvironment: boolean =
      parseInt(process.env.ELECTRON_IS_DEV, 10) === 1;

    return isEnvironmentSet ? getFromEnvironment : !environment.production;
  }

  private static onWindowAllClosed() {
    if (process.platform !== 'darwin') {
      App.application.quit();
    }
  }

  private static onClose() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    App.mainWindow = null;
  }

  private static onRedirect(event: any, url: string) {
    if (url !== App.mainWindow.webContents.getURL()) {
      // this is a normal external redirect, open it in a new browser window
      event.preventDefault();
      shell.openExternal(url);
    }
  }

  private static onReady() {
    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    App.initMainWindow();
    App.loadMainWindow();
  }

  private static onActivate() {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (App.mainWindow === null) {
      App.onReady();
    }
  }

  private static initMainWindow() {
    const workAreaSize = screen.getPrimaryDisplay().workAreaSize;
    const width = Math.min(1280, workAreaSize.width || 1280);
    const height = Math.min(720, workAreaSize.height || 720);

    // Create the browser window.
    App.mainWindow = new BrowserWindow({
      width: width,
      height: height,
      show: false,
      webPreferences: {
        contextIsolation: true,
        webSecurity: false,
        backgroundThrottling: false,
        preload: join(__dirname, 'main.preload.js'),
      },
    });
    App.mainWindow.webContents.openDevTools();
    ipcMain.handle('browse', async (e) => {
      const path = await dialog.showOpenDialog({
        properties: ['openDirectory'],
      });

      const pattern =
        `${path.filePaths[0]}\\**\\*.(jpg|jpeg|png|webp|gif)`.replace(
          /\\/gi,
          '/'
        );
      console.log({ pattern: pattern });

      const entries = await fg([pattern], { dot: false });
      console.log(`Found ${entries.length} image files`);
      const appDataPath = app.getPath('userData');
      fs.mkdirSync(`${appDataPath}/image-viewer/resized`, { recursive: true });
      console.log({ appDataPath });

      const staticPool = new StaticPool({
        size: WORKER_AMOUNT,
        task: (n: number) => n + 1,
      });

      staticPool.exec(1).then((result) => {
        console.log('💜 result from thread pool:', result); // result will be 2.
      });

      // let progress = 0;

      const finalEntries = entries.map((entry, _index) => {
        // progress = (100 * index) / entries.length;
        // console.log(`Progress: ${progress}%`);

        const hash = hashCode(entry);
        const targetPath = `${appDataPath}/image-viewer/resized/${hash}.jpg`;
        if (fs.existsSync(targetPath)) {
          return {
            src: entry,
            resizedDataUrl: targetPath,
          };
        } else {
          const image = nativeImage.createFromPath(entry);
          const size = image.getSize();
          const extension = entry.split('.').pop();
          if (extension !== 'gif') {
            if (size.width > 600) {
              console.log(
                `Image too big (${size.width}x${size.height}) detected, resizing..`
              );
              const newJpeg = image.resize({ width: 600 }).toJPEG(100);
              fs.writeFileSync(targetPath, newJpeg);
              return {
                src: entry,
                resizedDataUrl: targetPath,
              };
            }
          }
          return {
            src: entry,
            resizedDataUrl: undefined,
          };
        }
      });

      console.log('Processed all images', {
        finalEntries: finalEntries.length,
      });

      return [path.filePaths[0], finalEntries];
    });
    App.mainWindow.setMenu(null);
    App.mainWindow.center();

    // if main window is ready to show, close the splash window and show the main window
    App.mainWindow.once('ready-to-show', () => {
      App.mainWindow.show();
    });

    // handle all external redirects in a new browser window
    // App.mainWindow.webContents.on('will-navigate', App.onRedirect);
    // App.mainWindow.webContents.on('new-window', (event, url, frameName, disposition, options) => {
    //     App.onRedirect(event, url);
    // });

    // Emitted when the window is closed.
    App.mainWindow.on('closed', () => {
      // Dereference the window object, usually you would store windows
      // in an array if your app supports multi windows, this is the time
      // when you should delete the corresponding element.
      App.mainWindow = null;
    });
  }

  private static loadMainWindow() {
    // load the index.html of the app.
    if (!App.application.isPackaged) {
      App.mainWindow.loadURL(`http://localhost:${rendererAppPort}`);
    } else {
      App.mainWindow.loadURL(
        format({
          pathname: join(__dirname, '..', rendererAppName, 'index.html'),
          protocol: 'file:',
          slashes: true,
        })
      );
    }
  }

  static main(app: Electron.App, browserWindow: typeof BrowserWindow) {
    // we pass the Electron.App object and the
    // Electron.BrowserWindow into this function
    // so this class has no dependencies. This
    // makes the code easier to write tests for

    App.BrowserWindow = browserWindow;
    App.application = app;

    App.application.on('window-all-closed', App.onWindowAllClosed); // Quit when all windows are closed.
    App.application.on('ready', App.onReady); // App is ready to load data
    App.application.on('activate', App.onActivate); // App is activated
  }
}

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
