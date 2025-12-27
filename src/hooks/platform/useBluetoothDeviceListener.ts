/**
 * useBluetoothDeviceListener Hook
 *
 * Listens for Bluetooth device discovery events from Electron IPC.
 * Automatically manages device list state and provides platform detection.
 *
 * This hook is Electron-specific and will gracefully handle browser environments
 * by returning empty state.
 *
 * @param onDevicesChanged - Optional callback when device list changes
 * @returns Object containing devices array, scanning state, and platform support flag
 *
 * @example
 * ```tsx
 * const { devices, isScanning, isSupported } = useBluetoothDeviceListener(
 *   (devices) => {
 *     if (devices.length > 0) {
 *       console.log('Devices found:', devices);
 *     }
 *   }
 * );
 *
 * if (!isSupported) {
 *   return <div>Bluetooth pairing only available in Electron app</div>;
 * }
 *
 * return (
 *   <div>
 *     {isScanning && <p>Scanning...</p>}
 *     {devices.map(device => <div key={device.id}>{device.name}</div>)}
 *   </div>
 * );
 * ```
 */

import { useEffect, useState } from "react";
import type { BluetoothDevice } from "../../types/electron";

export interface UseBluetoothDeviceListenerReturn {
  devices: BluetoothDevice[];
  isScanning: boolean;
  isSupported: boolean;
}

export function useBluetoothDeviceListener(
  onDevicesChanged?: (devices: BluetoothDevice[]) => void,
): UseBluetoothDeviceListenerReturn {
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  // Check if Electron API is available
  const isSupported =
    typeof window !== "undefined" &&
    !!window.electronAPI?.onBluetoothDeviceList;

  useEffect(() => {
    // Only set up listener in Electron
    if (!isSupported) {
      return;
    }

    const handleDeviceList = (deviceList: BluetoothDevice[]) => {
      setDevices(deviceList);

      // Start scanning when first update received
      if (deviceList.length === 0) {
        setIsScanning(true);
      } else {
        // Stop showing scanning state once we have devices
        setIsScanning(false);
      }

      // Call optional callback
      onDevicesChanged?.(deviceList);
    };

    // Register listener
    window.electronAPI!.onBluetoothDeviceList(handleDeviceList);

    // Note: Electron IPC listeners are typically not cleaned up individually
    // as they're meant to persist. If cleanup is needed, the Electron main
    // process should handle it.
  }, [isSupported, onDevicesChanged]);

  return {
    devices,
    isScanning,
    isSupported,
  };
}
