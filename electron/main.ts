import { app, BrowserWindow, ipcMain, dialog, protocol } from "electron";
import { join, resolve, normalize, isAbsolute } from "path";
import { promises as fs } from "fs";
import Store from "electron-store";
import { updateElectronApp, UpdateSourceType } from "update-electron-app";

import started from "electron-squirrel-startup";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

updateElectronApp({
  updateSource: {
    type: UpdateSourceType.StaticStorage,
    baseUrl: `https://jhbruhn.github.io/respira/update/${process.platform}/${process.arch}`,
  },
});

// Enable Web Bluetooth
app.commandLine.appendSwitch("enable-web-bluetooth", "true");
app.commandLine.appendSwitch("enable-experimental-web-platform-features");

// Register custom protocol for serving app files with proper COOP/COEP headers
// This is required for SharedArrayBuffer support in production builds
protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: false,
      bypassCSP: false,
    },
  },
]);

const store = new Store();

// Setup custom protocol handler for production builds
async function setupCustomProtocol() {
  protocol.handle("app", async (request) => {
    // Parse the URL to get the file path
    const url = new URL(request.url);
    let filePath = decodeURIComponent(url.pathname);

    // Handle Windows paths (remove leading slash)
    if (process.platform === "win32" && filePath.startsWith("/")) {
      filePath = filePath.slice(1);
    }

    // Resolve relative to app resources
    const resourcePath = join(
      __dirname,
      "..",
      "renderer",
      MAIN_WINDOW_VITE_NAME,
      filePath,
    );

    try {
      const data = await fs.readFile(resourcePath);

      // Determine content type from extension
      const ext = filePath.split(".").pop()?.toLowerCase();
      const contentTypes: Record<string, string> = {
        html: "text/html",
        js: "application/javascript",
        css: "text/css",
        json: "application/json",
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        svg: "image/svg+xml",
        wasm: "application/wasm",
        whl: "application/zip",
      };
      const contentType = contentTypes[ext || ""] || "application/octet-stream";

      // Return response with proper COOP/COEP/CORP headers
      return new Response(data, {
        headers: {
          "Content-Type": contentType,
          "Cross-Origin-Opener-Policy": "same-origin",
          "Cross-Origin-Embedder-Policy": "require-corp",
          "Cross-Origin-Resource-Policy": "same-origin",
        },
      });
    } catch (err) {
      console.error("[CustomProtocol] Failed to load:", resourcePath, err);
      return new Response("Not Found", { status: 404 });
    }
  });
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1280, // Prevent layout from breaking into single-column mobile view
    minHeight: 800,
    autoHideMenuBar: true, // Hide the menu bar (can be toggled with Alt key)
    title: `Respira v${app.getVersion()}`,
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      // SharedArrayBuffer enabled via proper COOP/COEP headers below
    },
  });

  // Handle Web Bluetooth device selection
  // This is CRITICAL - Electron doesn't show browser's native picker
  // The handler may be called multiple times as new devices are discovered
  let deviceSelectionCallback: ((deviceId: string) => void) | null = null;

  mainWindow.webContents.on(
    "select-bluetooth-device",
    (event, deviceList, callback) => {
      event.preventDefault();

      console.log(
        "[Bluetooth] Device list updated:",
        deviceList.map((d) => ({
          name: d.deviceName,
          id: d.deviceId,
        })),
      );

      // Store the callback for later use (may be called multiple times as devices are discovered)
      console.log(
        "[Bluetooth] Storing new callback, previous callback existed:",
        !!deviceSelectionCallback,
      );
      deviceSelectionCallback = callback;

      // Always send device list to renderer (even if empty) to show scanning UI
      console.log("[Bluetooth] Sending device list to renderer for selection");
      mainWindow.webContents.send(
        "bluetooth:device-list",
        deviceList.map((d) => ({
          deviceId: d.deviceId,
          deviceName: d.deviceName || "Unknown Device",
        })),
      );
    },
  );

  // Handle device selection from renderer
  ipcMain.on("bluetooth:select-device", (_event, deviceId: string) => {
    console.log("[Bluetooth] Renderer selected device:", deviceId);
    if (deviceSelectionCallback) {
      console.log("[Bluetooth] Calling callback with deviceId:", deviceId);
      deviceSelectionCallback(deviceId);
      deviceSelectionCallback = null;
    } else {
      console.error(
        "[Bluetooth] No callback available! Device selection may have timed out.",
      );
    }
  });

  // Optional: Handle Bluetooth pairing for Windows/Linux PIN validation
  mainWindow.webContents.session.setBluetoothPairingHandler(
    (details, callback) => {
      console.log("[Bluetooth] Pairing request:", details);
      // Auto-confirm pairing
      callback({ confirmed: true /*pairingKind: 'confirm' */ });
    },
  );

  // Set COOP/COEP headers for Pyodide SharedArrayBuffer support
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    (details, callback) => {
      // Apply security headers to enable cross-origin isolation (needed for SharedArrayBuffer)
      const headers: Record<string, string[]> = {
        ...details.responseHeaders,
        "Cross-Origin-Opener-Policy": ["same-origin"],
        "Cross-Origin-Embedder-Policy": ["require-corp"],
        // Add CORP to ALL resources since this is a local-only app
        // This allows workers, Pyodide assets, and all other resources to load
        "Cross-Origin-Resource-Policy": ["same-origin"],
      };

      callback({ responseHeaders: headers });
    },
  );

  // Load the app
  // MAIN_WINDOW_VITE_DEV_SERVER_URL is provided by @electron-forge/plugin-vite
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    // Production: Use custom protocol to serve files with proper COOP/COEP/CORP headers
    // This enables SharedArrayBuffer support for Pyodide
    mainWindow.loadURL("app://./index.html");
  }
}

app.whenReady().then(async () => {
  // Setup custom protocol for production builds
  await setupCustomProtocol();

  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers

// Storage handlers (using electron-store)
ipcMain.handle("storage:savePattern", async (_event, pattern) => {
  try {
    store.set(`pattern:${pattern.uuid}`, pattern);
    store.set("pattern:latest", pattern);
    console.log(
      "[Storage] Saved pattern:",
      pattern.fileName,
      "UUID:",
      pattern.uuid,
    );
    return true;
  } catch (err) {
    console.error("[Storage] Failed to save pattern:", err);
    throw err;
  }
});

ipcMain.handle("storage:getPattern", async (_event, uuid) => {
  try {
    const pattern = store.get(`pattern:${uuid}`, null);
    if (pattern) {
      console.log("[Storage] Retrieved pattern for UUID:", uuid);
    }
    return pattern;
  } catch (err) {
    console.error("[Storage] Failed to get pattern:", err);
    return null;
  }
});

ipcMain.handle("storage:getLatest", async () => {
  try {
    const pattern = store.get("pattern:latest", null);
    return pattern;
  } catch (err) {
    console.error("[Storage] Failed to get latest pattern:", err);
    return null;
  }
});

ipcMain.handle("storage:deletePattern", async (_event, uuid) => {
  try {
    store.delete(`pattern:${uuid}`);
    console.log("[Storage] Deleted pattern with UUID:", uuid);
    return true;
  } catch (err) {
    console.error("[Storage] Failed to delete pattern:", err);
    throw err;
  }
});

ipcMain.handle("storage:clear", async () => {
  try {
    const keys = Object.keys(store.store).filter((k) =>
      k.startsWith("pattern:"),
    );
    keys.forEach((k) => store.delete(k));
    console.log("[Storage] Cleared all patterns");
    return true;
  } catch (err) {
    console.error("[Storage] Failed to clear cache:", err);
    throw err;
  }
});

// File dialog handlers
ipcMain.handle("dialog:openFile", async (_event, options) => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: options.filters,
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const filePath = result.filePaths[0];
    const fileName = filePath.split(/[\\/]/).pop() || "";

    // Approve path for file operations since user explicitly selected it
    approvePath(filePath);

    console.log("[Dialog] File selected:", fileName);
    return { filePath, fileName };
  } catch (err) {
    console.error("[Dialog] Failed to open file:", err);
    throw err;
  }
});

ipcMain.handle("dialog:saveFile", async (_event, options) => {
  try {
    const result = await dialog.showSaveDialog({
      defaultPath: options.defaultPath,
      filters: options.filters,
    });

    if (result.canceled) {
      return null;
    }

    // Approve path for file operations since user explicitly selected it
    approvePath(result.filePath);

    console.log("[Dialog] Save file selected:", result.filePath);
    return result.filePath;
  } catch (err) {
    console.error("[Dialog] Failed to save file:", err);
    throw err;
  }
});

// File system handlers with dialog-based path validation
// Track paths approved by user through OS file dialogs
// This prevents arbitrary file access while allowing users full freedom
const userApprovedPaths = new Set<string>();

/**
 * Validates that a file path was approved by the user through a dialog
 * Also performs basic sanitization to prevent obvious attacks
 */
function isPathApproved(filePath: string): boolean {
  // Reject empty, null, or undefined paths
  if (!filePath) {
    console.warn("[FS Security] Rejected empty path");
    return false;
  }

  // Reject relative paths - must be absolute
  if (!isAbsolute(filePath)) {
    console.warn("[FS Security] Rejected relative path:", filePath);
    return false;
  }

  // Reject paths with null bytes (security vulnerability)
  if (filePath.includes("\0")) {
    console.warn("[FS Security] Rejected path with null byte:", filePath);
    return false;
  }

  // Normalize the path to prevent traversal tricks
  const normalizedPath = normalize(resolve(filePath));

  // Check if path was approved through a dialog
  const isApproved = userApprovedPaths.has(normalizedPath);

  if (!isApproved) {
    console.warn(
      "[FS Security] Rejected path - not approved through file dialog:",
      filePath,
    );
  }

  return isApproved;
}

/**
 * Approves a path for file operations after user selection via dialog
 */
function approvePath(filePath: string): void {
  const normalizedPath = normalize(resolve(filePath));
  userApprovedPaths.add(normalizedPath);
  console.log("[FS Security] Approved path:", normalizedPath);
}

ipcMain.handle("fs:readFile", async (_event, filePath: string) => {
  // Validate path was approved by user
  if (!isPathApproved(filePath)) {
    throw new Error(
      "Access denied: File path not approved. Please select the file through the file dialog.",
    );
  }

  try {
    const buffer = await fs.readFile(filePath);
    console.log("[FS] Read file:", filePath, "Size:", buffer.length);
    return buffer;
  } catch (err) {
    console.error("[FS] Failed to read file:", err);
    throw err;
  }
});

ipcMain.handle(
  "fs:writeFile",
  async (_event, filePath: string, data: number[]) => {
    // Validate path was approved by user
    if (!isPathApproved(filePath)) {
      throw new Error(
        "Access denied: File path not approved. Please select the file through the save dialog.",
      );
    }

    try {
      await fs.writeFile(filePath, Buffer.from(data));
      console.log("[FS] Wrote file:", filePath);
      return true;
    } catch (err) {
      console.error("[FS] Failed to write file:", err);
      throw err;
    }
  },
);
