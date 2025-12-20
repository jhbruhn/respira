import { useEffect, useState, useCallback } from "react";
import type { BluetoothDevice } from "../types/electron";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function BluetoothDevicePicker() {
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    // Only set up listener in Electron
    if (window.electronAPI?.onBluetoothDeviceList) {
      window.electronAPI.onBluetoothDeviceList((deviceList) => {
        console.log("[BluetoothPicker] Received device list:", deviceList);
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
    console.log("[BluetoothPicker] User selected device:", deviceId);
    window.electronAPI?.selectBluetoothDevice(deviceId);
    setIsOpen(false);
    setDevices([]);
  }, []);

  const handleCancel = useCallback(() => {
    console.log("[BluetoothPicker] User cancelled device selection");
    window.electronAPI?.selectBluetoothDevice("");
    setIsOpen(false);
    setDevices([]);
    setIsScanning(false);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent
        className="border-t-4 border-primary-600 dark:border-primary-500"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>Select Bluetooth Device</DialogTitle>
          <DialogDescription>
            {isScanning && devices.length === 0 ? (
              <div className="flex items-center gap-3 py-2">
                <svg
                  className="animate-spin h-5 w-5 text-primary-600 dark:text-primary-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Scanning for Bluetooth devices...</span>
              </div>
            ) : (
              `${devices.length} device${devices.length !== 1 ? "s" : ""} found. Select a device to connect:`
            )}
          </DialogDescription>
        </DialogHeader>

        {!isScanning && devices.length > 0 && (
          <div className="space-y-2">
            {devices.map((device) => (
              <Button
                key={device.deviceId}
                onClick={() => handleSelectDevice(device.deviceId)}
                variant="outline"
                className="w-full h-auto px-4 py-3 justify-start"
              >
                <div className="text-left">
                  <div className="font-semibold">{device.deviceName}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {device.deviceId}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
