import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel: string, ...args: unknown[]) => {
    const validChannels = [
      'storage:savePattern',
      'storage:getPattern',
      'storage:getLatest',
      'storage:deletePattern',
      'storage:clear',
      'dialog:openFile',
      'dialog:saveFile',
      'fs:readFile',
      'fs:writeFile',
    ];

    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }

    throw new Error(`Invalid IPC channel: ${channel}`);
  },
  // Bluetooth device selection
  onBluetoothDeviceList: (callback: (devices: Array<{ deviceId: string; deviceName: string }>) => void) => {
    ipcRenderer.on('bluetooth:device-list', (_event, devices) => callback(devices));
  },
  selectBluetoothDevice: (deviceId: string) => {
    ipcRenderer.send('bluetooth:select-device', deviceId);
  },
});

// Also expose process type for platform detection
contextBridge.exposeInMainWorld('process', {
  type: 'renderer',
});
