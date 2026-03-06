const path = require('path');
const os = require('os');
const fs = require('fs');
const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const { autoUpdater } = require('electron-updater');

const { startServer } = require('../server');
const { detectRuntime, setRuntimeBinary, loadRuntimeConfig, DEFAULT_DOCS } = require('./runtime-config');

let mainWindow = null;
let serverController = null;
let serverOrigin = 'http://127.0.0.1:5173';
let updateState = {
  status: 'idle',
  message: 'Updates have not been checked yet.',
  version: app.getVersion(),
  availableVersion: null
};

function applyQEnv(runtimeStatus) {
  if (runtimeStatus.platform === 'windows') {
    delete process.env.P5Q_Q_BIN;
    return;
  }

  if (runtimeStatus.configured && runtimeStatus.qBinary) {
    process.env.P5Q_Q_BIN = runtimeStatus.qBinary;
    return;
  }

  delete process.env.P5Q_Q_BIN;
}

async function startBackend() {
  serverController = startServer({ port: 0 });
  const port = await serverController.listening;
  serverOrigin = `http://127.0.0.1:${port}`;
}

async function restartBackend() {
  if (serverController) {
    await serverController.close().catch(() => {});
  }
  await startBackend();
}

async function getRuntimeStatus() {
  const status = await detectRuntime(app.getPath('userData'));
  applyQEnv(status);
  return status;
}

async function configureAndRestart() {
  const status = await getRuntimeStatus();
  await restartBackend();
  return status;
}

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1520,
    height: 960,
    minWidth: 1220,
    minHeight: 760,
    backgroundColor: '#151512',
    title: 'p5q Studio',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  await mainWindow.loadURL(serverOrigin);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function broadcastUpdateState() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  mainWindow.webContents.send('updates:state', updateState);
}

function setUpdateState(nextState) {
  updateState = {
    ...updateState,
    ...nextState,
    version: app.getVersion()
  };
  broadcastUpdateState();
}

function hasLocalUpdateConfig() {
  try {
    return fs.existsSync(path.join(process.resourcesPath, 'app-update.yml'));
  } catch {
    return false;
  }
}

function setupAutoUpdates() {
  if (!app.isPackaged || !hasLocalUpdateConfig()) {
    setUpdateState({
      status: 'idle',
      message: 'Auto-update checks activate in published release builds from GitHub Releases.',
      availableVersion: null
    });
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    setUpdateState({
      status: 'checking',
      message: 'Checking GitHub Releases for a newer version...',
      availableVersion: null
    });
  });

  autoUpdater.on('update-available', (info) => {
    setUpdateState({
      status: 'available',
      message: `Update ${info.version} is downloading now.`,
      availableVersion: info.version
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    setUpdateState({
      status: 'up-to-date',
      message: `You are up to date on ${info.version || app.getVersion()}.`,
      availableVersion: null
    });
  });

  autoUpdater.on('error', (error) => {
    setUpdateState({
      status: 'error',
      message: error?.message || 'Update check failed.',
      availableVersion: null
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    const percent = Number(progress?.percent || 0).toFixed(0);
    setUpdateState({
      status: 'downloading',
      message: `Downloading update: ${percent}%`,
      availableVersion: updateState.availableVersion
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    setUpdateState({
      status: 'downloaded',
      message: `Update ${info.version} is ready. Restart to install.`,
      availableVersion: info.version
    });
  });
}

async function checkForUpdates() {
  if (!app.isPackaged || !hasLocalUpdateConfig()) {
    setUpdateState({
      status: 'idle',
      message: 'Auto-update checks activate in published release builds from GitHub Releases.',
      availableVersion: null
    });
    return updateState;
  }

  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    setUpdateState({
      status: 'error',
      message: error?.message || 'Update check failed.',
      availableVersion: null
    });
  }

  return updateState;
}

app.whenReady().then(async () => {
  const runtimeRoot = path.join(os.tmpdir(), 'p5q-studio-runtime');
  process.env.P5Q_TMP_DIR = path.join(runtimeRoot, 'tmp');
  process.env.P5Q_RUNTIME_CWD = runtimeRoot;
  const saved = await loadRuntimeConfig(app.getPath('userData'));
  if (saved.qBinary) {
    process.env.P5Q_Q_BIN = saved.qBinary;
  }

  await startBackend();
  await createMainWindow();
  setupAutoUpdates();
  checkForUpdates();

  if (app.dock) {
    app.dock.setIcon(path.join(__dirname, '..', 'assets', 'icon.png'));
  }

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  if (serverController) {
    await serverController.close().catch(() => {});
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('runtime:get-status', async () => getRuntimeStatus());

ipcMain.handle('runtime:auto-configure', async () => configureAndRestart());

ipcMain.handle('runtime:choose-binary', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Choose q executable',
    properties: ['openFile'],
    defaultPath: process.platform === 'darwin' ? '/opt/homebrew/bin' : undefined
  });

  if (result.canceled || result.filePaths.length === 0) {
    return getRuntimeStatus();
  }

  await setRuntimeBinary(app.getPath('userData'), result.filePaths[0]);
  return configureAndRestart();
});

ipcMain.handle('runtime:clear-binary', async () => {
  await setRuntimeBinary(app.getPath('userData'), '');
  return configureAndRestart();
});

ipcMain.handle('updates:get-state', async () => updateState);

ipcMain.handle('updates:check', async () => checkForUpdates());

ipcMain.handle('updates:install', async () => {
  if (updateState.status === 'downloaded') {
    autoUpdater.quitAndInstall();
    return true;
  }
  return false;
});

ipcMain.handle('shell:open-external', async (_event, url) => {
  if (typeof url === 'string' && url.startsWith('http')) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});

ipcMain.handle('app:get-server-origin', async () => serverOrigin);

ipcMain.handle('app:get-platform-info', async () => ({
  platform: process.platform,
  docs: DEFAULT_DOCS
}));
