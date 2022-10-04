import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  browse: () => ipcRenderer.invoke('browse'),
  nudityAi: (path: string) => ipcRenderer.invoke('nudity-ai', path),
  nudityAiBulk: (paths: string[]) =>
    ipcRenderer.invoke('nudity-ai-bulk', paths),
  deleteImage: (paths: string[]) => ipcRenderer.invoke('delete-image', paths),
  platform: process.platform,
});
