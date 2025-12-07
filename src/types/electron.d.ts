export interface BluetoothDevice {
  deviceId: string;
  deviceName: string;
}

export interface ElectronAPI {
  invoke<T = unknown>(channel: string, ...args: unknown[]): Promise<T>;
  onBluetoothDeviceList: (callback: (devices: BluetoothDevice[]) => void) => void;
  selectBluetoothDevice: (deviceId: string) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    process?: {
      type?: string;
    };
  }
}

export {};
