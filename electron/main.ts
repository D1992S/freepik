/**
 * Electron Main Process
 * Handles window creation, IPC communication, and system integration
 */

import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { FreepikClient } from '../src/client/freepik-client.js';
import { SearchRunner } from '../src/runner/search-runner.js';
import { DownloadRunner } from '../src/runner/download-runner.js';
import { ErrorLogger } from '../src/utils/error-logger.js';
import { Lockfile } from '../src/utils/lockfile.js';
import { loadAndValidateStockPlan } from '../src/validator/stockplan-validator.js';
import type { StockPlan } from '../src/types/stockplan.js';

let mainWindow: BrowserWindow | null = null;
let currentApiKey: string = '';
let currentOutputDir: string = path.join(app.getPath('documents'), 'StockBot');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    title: 'StockBot - Freepik Video Downloader',
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadFile(path.join(__dirname, '../electron/renderer/index.html'));
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers

ipcMain.handle('select-stockplan', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Stock Plan', extensions: ['json'] }],
  });

  if (result.canceled || !result.filePaths.length) {
    return null;
  }

  const filePath = result.filePaths[0];
  const validationResult = loadAndValidateStockPlan(filePath);

  if (!validationResult.valid || !validationResult.data) {
    return { error: validationResult.errors };
  }

  return { data: validationResult.data, path: filePath };
});

ipcMain.handle('select-output-dir', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
  });

  if (result.canceled || !result.filePaths.length) {
    return null;
  }

  currentOutputDir = result.filePaths[0];
  return currentOutputDir;
});

ipcMain.handle('get-settings', async () => {
  return {
    apiKey: currentApiKey,
    outputDir: currentOutputDir,
  };
});

ipcMain.handle('save-settings', async (_event, settings: { apiKey: string; outputDir: string }) => {
  currentApiKey = settings.apiKey;
  currentOutputDir = settings.outputDir;
  return { success: true };
});

ipcMain.handle('run-search', async (_event, stockPlan: StockPlan) => {
  if (!currentApiKey) {
    return { error: 'API key not set' };
  }

  try {
    const client = new FreepikClient({ apiKey: currentApiKey });
    const lockfile = new Lockfile(currentOutputDir);
    const errorLogger = new ErrorLogger(currentOutputDir);

    await lockfile.acquire('search');

    const runner = new SearchRunner(client, {
      outputDir: currentOutputDir,
      dryRun: false,
      errorLogger,
      progressCallback: (current, total, sceneName) => {
        mainWindow?.webContents.send('search-progress', {
          current,
          total,
          sceneName,
        });
      },
    });

    try {
      const results = await runner.run(stockPlan);
      await lockfile.release();

      return { success: true, results };
    } catch (error) {
      await lockfile.release();
      throw error;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { error: msg };
  }
});

ipcMain.handle('run-download', async (_event, stockPlan: StockPlan) => {
  if (!currentApiKey) {
    return { error: 'API key not set' };
  }

  try {
    // Load selection.json
    const selectionPath = path.join(currentOutputDir, '_meta', 'selection.json');
    const selectionData = await fs.readFile(selectionPath, 'utf-8');
    const selection = JSON.parse(selectionData);

    const client = new FreepikClient({ apiKey: currentApiKey });
    const lockfile = new Lockfile(currentOutputDir);
    const errorLogger = new ErrorLogger(currentOutputDir);

    await lockfile.acquire('download');

    const runner = new DownloadRunner(client, {
      outputDir: currentOutputDir,
      maxConcurrent: 3,
      errorLogger,
      progressCallback: (progress) => {
        mainWindow?.webContents.send('download-progress', progress);
      },
    });

    try {
      await runner.run(stockPlan, selection);
      await lockfile.release();

      return { success: true };
    } catch (error) {
      await lockfile.release();
      throw error;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { error: msg };
  }
});

ipcMain.handle('open-output-folder', async () => {
  const { shell } = require('electron');
  await shell.openPath(currentOutputDir);
});
