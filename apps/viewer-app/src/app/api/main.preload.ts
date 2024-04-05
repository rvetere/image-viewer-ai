import { contextBridge, ipcRenderer } from 'electron';
import { ImageWithDefinitions } from '../types';

contextBridge.exposeInMainWorld('electron', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  browse: () => ipcRenderer.invoke('browse'),
  classifyImages: (paths: string[], existingDefs: ImageWithDefinitions[]) =>
    ipcRenderer.invoke('classify-images', paths, existingDefs),
  insertScans: (directories: string[]) =>
    ipcRenderer.invoke('insert-scans', directories),
  insertFiles: (scanId: number, files: ImageWithDefinitions[]) =>
    ipcRenderer.invoke('insert-files', scanId, files),
  updateFileFavorite: (id: number, favorite: boolean) =>
    ipcRenderer.invoke('update-file-favorite', id, favorite),
  getFiles: (scanId: number) => ipcRenderer.invoke('get-files', scanId),
  deleteImage: (paths: string[]) => ipcRenderer.invoke('delete-image', paths),
  platform: process.platform,
});
