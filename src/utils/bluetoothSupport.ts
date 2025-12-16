/**
 * Check if the current browser/environment supports Web Bluetooth API
 * @returns true if Web Bluetooth is supported (or running in Electron), false otherwise
 */
export function isBluetoothSupported(): boolean {
  // Always supported in Electron app
  if (typeof window !== "undefined" && "electronAPI" in window) {
    return true;
  }

  // Check for Web Bluetooth API support in browser
  if (typeof navigator !== "undefined" && "bluetooth" in navigator) {
    return true;
  }

  return false;
}
