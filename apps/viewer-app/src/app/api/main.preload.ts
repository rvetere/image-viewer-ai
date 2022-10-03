import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  browse: () => ipcRenderer.invoke('browse'),
  nudityAi: (path: string) => ipcRenderer.invoke('nudity-ai', path),
  platform: process.platform,
});
