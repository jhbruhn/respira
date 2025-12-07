import type { IStorageService } from './interfaces/IStorageService';
import type { IFileService } from './interfaces/IFileService';
import { BrowserStorageService } from './browser/BrowserStorageService';
import { BrowserFileService } from './browser/BrowserFileService';
import { ElectronStorageService } from './electron/ElectronStorageService';
import { ElectronFileService } from './electron/ElectronFileService';

/**
 * Detect if running in Electron
 */
export function isElectron(): boolean {
  return !!(typeof window !== 'undefined' && window.process && window.process.type === 'renderer');
}

/**
 * Create storage service based on platform
 */
export function createStorageService(): IStorageService {
  if (isElectron()) {
    return new ElectronStorageService();
  } else {
    return new BrowserStorageService();
  }
}

/**
 * Create file service based on platform
 */
export function createFileService(): IFileService {
  if (isElectron()) {
    return new ElectronFileService();
  } else {
    return new BrowserFileService();
  }
}
