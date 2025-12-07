import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { join } from 'path';
import { promises as fs } from 'fs';
import Store from 'electron-store';

import started from 'electron-squirrel-startup';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Enable Web Bluetooth
app.commandLine.appendSwitch('enable-web-bluetooth', 'true');
app.commandLine.appendSwitch('enable-experimental-web-platform-features');

const store = new Store();

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    autoHideMenuBar: true, // Hide the menu bar (can be toggled with Alt key)
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      // Enable SharedArrayBuffer for Pyodide
      additionalArguments: ['--enable-features=SharedArrayBuffer'],
    },
  });

  // Handle Web Bluetooth device selection
  // This is CRITICAL - Electron doesn't show browser's native picker
  // The handler may be called multiple times as new devices are discovered
  let deviceSelectionCallback: ((deviceId: string) => void) | null = null;

  mainWindow.webContents.on('select-bluetooth-device', (event, deviceList, callback) => {
    event.preventDefault();

    console.log('[Bluetooth] Device list updated:', deviceList.map(d => ({
      name: d.deviceName,
      id: d.deviceId
    })));

    // Store the callback for later use (may be called multiple times as devices are discovered)
    console.log('[Bluetooth] Storing new callback, previous callback existed:', !!deviceSelectionCallback);
    deviceSelectionCallback = callback;

    // Always send device list to renderer (even if empty) to show scanning UI
    console.log('[Bluetooth] Sending device list to renderer for selection');
    mainWindow.webContents.send('bluetooth:device-list', deviceList.map(d => ({
      deviceId: d.deviceId,
      deviceName: d.deviceName || 'Unknown Device'
    })));
  });

  // Handle device selection from renderer
  ipcMain.on('bluetooth:select-device', (_event, deviceId: string) => {
    console.log('[Bluetooth] Renderer selected device:', deviceId);
    if (deviceSelectionCallback) {
      console.log('[Bluetooth] Calling callback with deviceId:', deviceId);
      deviceSelectionCallback(deviceId);
      deviceSelectionCallback = null;
    } else {
      console.error('[Bluetooth] No callback available! Device selection may have timed out.');
    }
  });

  // Optional: Handle Bluetooth pairing for Windows/Linux PIN validation
  mainWindow.webContents.session.setBluetoothPairingHandler((details, callback) => {
    console.log('[Bluetooth] Pairing request:', details);
    // Auto-confirm pairing
    callback({ confirmed: true /*pairingKind: 'confirm' */});
  });

  // Set COOP/COEP headers for Pyodide SharedArrayBuffer support
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Cross-Origin-Opener-Policy': ['same-origin'],
        'Cross-Origin-Embedder-Policy': ['require-corp'],
      },
    });
  });

  // Load the app
  // MAIN_WINDOW_VITE_DEV_SERVER_URL is provided by @electron-forge/plugin-vite
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    // MAIN_WINDOW_VITE_NAME is the renderer name from forge.config.js
    mainWindow.loadFile(join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
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

// Storage handlers (using electron-store)
ipcMain.handle('storage:savePattern', async (_event, pattern) => {
  try {
    store.set(`pattern:${pattern.uuid}`, pattern);
    store.set('pattern:latest', pattern);
    console.log('[Storage] Saved pattern:', pattern.fileName, 'UUID:', pattern.uuid);
    return true;
  } catch (err) {
    console.error('[Storage] Failed to save pattern:', err);
    throw err;
  }
});

ipcMain.handle('storage:getPattern', async (_event, uuid) => {
  try {
    const pattern = store.get(`pattern:${uuid}`, null);
    if (pattern) {
      console.log('[Storage] Retrieved pattern for UUID:', uuid);
    }
    return pattern;
  } catch (err) {
    console.error('[Storage] Failed to get pattern:', err);
    return null;
  }
});

ipcMain.handle('storage:getLatest', async () => {
  try {
    const pattern = store.get('pattern:latest', null);
    return pattern;
  } catch (err) {
    console.error('[Storage] Failed to get latest pattern:', err);
    return null;
  }
});

ipcMain.handle('storage:deletePattern', async (_event, uuid) => {
  try {
    store.delete(`pattern:${uuid}`);
    console.log('[Storage] Deleted pattern with UUID:', uuid);
    return true;
  } catch (err) {
    console.error('[Storage] Failed to delete pattern:', err);
    throw err;
  }
});

ipcMain.handle('storage:clear', async () => {
  try {
    const keys = Object.keys(store.store).filter(k => k.startsWith('pattern:'));
    keys.forEach(k => store.delete(k));
    console.log('[Storage] Cleared all patterns');
    return true;
  } catch (err) {
    console.error('[Storage] Failed to clear cache:', err);
    throw err;
  }
});

// File dialog handlers
ipcMain.handle('dialog:openFile', async (_event, options) => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: options.filters,
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const filePath = result.filePaths[0];
    const fileName = filePath.split(/[\\/]/).pop() || '';

    console.log('[Dialog] File selected:', fileName);
    return { filePath, fileName };
  } catch (err) {
    console.error('[Dialog] Failed to open file:', err);
    throw err;
  }
});

ipcMain.handle('dialog:saveFile', async (_event, options) => {
  try {
    const result = await dialog.showSaveDialog({
      defaultPath: options.defaultPath,
      filters: options.filters,
    });

    if (result.canceled) {
      return null;
    }

    console.log('[Dialog] Save file selected:', result.filePath);
    return result.filePath;
  } catch (err) {
    console.error('[Dialog] Failed to save file:', err);
    throw err;
  }
});

// File system handlers
ipcMain.handle('fs:readFile', async (_event, filePath) => {
  try {
    const buffer = await fs.readFile(filePath);
    console.log('[FS] Read file:', filePath, 'Size:', buffer.length);
    return buffer;
  } catch (err) {
    console.error('[FS] Failed to read file:', err);
    throw err;
  }
});

ipcMain.handle('fs:writeFile', async (_event, filePath, data) => {
  try {
    await fs.writeFile(filePath, Buffer.from(data));
    console.log('[FS] Wrote file:', filePath);
    return true;
  } catch (err) {
    console.error('[FS] Failed to write file:', err);
    throw err;
  }
});
