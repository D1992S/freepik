/**
 * Electron Preload Script
 * Exposes safe IPC methods to the renderer process
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // File selection
  selectStockPlan: () => ipcRenderer.invoke('select-stockplan'),
  selectOutputDir: () => ipcRenderer.invoke('select-output-dir'),

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: { apiKey: string; outputDir: string }) =>
    ipcRenderer.invoke('save-settings', settings),

  // Operations
  runSearch: (stockPlan: any) => ipcRenderer.invoke('run-search', stockPlan),
  runDownload: (stockPlan: any) => ipcRenderer.invoke('run-download', stockPlan),
  openOutputFolder: () => ipcRenderer.invoke('open-output-folder'),

  // Progress listeners
  onSearchProgress: (callback: (data: any) => void) => {
    ipcRenderer.on('search-progress', (_event, data) => callback(data));
  },
  onDownloadProgress: (callback: (data: any) => void) => {
    ipcRenderer.on('download-progress', (_event, data) => callback(data));
  },
});
