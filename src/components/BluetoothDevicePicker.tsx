import { useEffect, useState, useCallback } from 'react';
import type { BluetoothDevice } from '../types/electron';

export function BluetoothDevicePicker() {
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    // Only set up listener in Electron
    if (window.electronAPI?.onBluetoothDeviceList) {
      window.electronAPI.onBluetoothDeviceList((deviceList) => {
        console.log('[BluetoothPicker] Received device list:', deviceList);
        setDevices(deviceList);
        // Open the picker when scan starts (even if empty at first)
        if (!isOpen) {
          setIsOpen(true);
          setIsScanning(true);
        }
        // Stop showing scanning state once we have devices
        if (deviceList.length > 0) {
          setIsScanning(false);
        }
      });
    }
  }, [isOpen]);

  const handleSelectDevice = useCallback((deviceId: string) => {
    console.log('[BluetoothPicker] User selected device:', deviceId);
    window.electronAPI?.selectBluetoothDevice(deviceId);
    setIsOpen(false);
    setDevices([]);
  }, []);

  const handleCancel = useCallback(() => {
    console.log('[BluetoothPicker] User cancelled device selection');
    window.electronAPI?.selectBluetoothDevice('');
    setIsOpen(false);
    setDevices([]);
    setIsScanning(false);
  }, []);

  // Handle escape key
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
  }, [handleCancel]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-[1000]" onClick={handleCancel}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-lg w-[90%] m-4 border-t-4 border-blue-600 dark:border-blue-500"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="bluetooth-picker-title"
        aria-describedby="bluetooth-picker-message"
      >
        <div className="p-6 border-b border-gray-300 dark:border-gray-600">
          <h3 id="bluetooth-picker-title" className="m-0 text-xl font-semibold dark:text-white">
            Select Bluetooth Device
          </h3>
        </div>
        <div className="p-6">
          {isScanning && devices.length === 0 ? (
            <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
              <svg className="animate-spin h-5 w-5 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span id="bluetooth-picker-message">Scanning for Bluetooth devices...</span>
            </div>
          ) : (
            <>
              <p id="bluetooth-picker-message" className="mb-4 leading-relaxed text-gray-900 dark:text-gray-100">
                {devices.length} device{devices.length !== 1 ? 's' : ''} found. Select a device to connect:
              </p>
              <div className="space-y-2">
                {devices.map((device) => (
                  <button
                    key={device.deviceId}
                    onClick={() => handleSelectDevice(device.deviceId)}
                    className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 text-left rounded-lg font-medium text-sm hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-900 dark:hover:text-blue-100 active:bg-blue-200 dark:active:bg-blue-800 transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                    aria-label={`Connect to ${device.deviceName}`}
                  >
                    <div className="font-semibold text-gray-900 dark:text-white">{device.deviceName}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{device.deviceId}</div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="p-4 px-6 flex gap-3 justify-end border-t border-gray-300 dark:border-gray-600">
          <button
            onClick={handleCancel}
            className="px-6 py-2.5 bg-gray-600 dark:bg-gray-700 text-white rounded-lg font-semibold text-sm hover:bg-gray-700 dark:hover:bg-gray-600 active:bg-gray-800 dark:active:bg-gray-500 hover:shadow-lg active:scale-[0.98] transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            aria-label="Cancel device selection"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
