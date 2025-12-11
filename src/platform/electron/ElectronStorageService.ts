import type { IStorageService, ICachedPattern } from '../interfaces/IStorageService';
import type { PesPatternData } from '../../utils/pystitchConverter';

/**
 * Electron implementation of storage service using electron-store via IPC
 */
export class ElectronStorageService implements IStorageService {
  private async invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }
    return window.electronAPI.invoke(channel, ...args);
  }

  async savePattern(
    uuid: string,
    pesData: PesPatternData,
    fileName: string,
    patternOffset?: { x: number; y: number }
  ): Promise<void> {
    // Convert Uint8Array to array for JSON serialization over IPC
    const serializable = {
      uuid,
      pesData: {
        ...pesData,
        penData: Array.from(pesData.penData),
      },
      fileName,
      timestamp: Date.now(),
      patternOffset,
    };

    // Fire and forget (sync-like behavior to match interface)
    this.invoke('storage:savePattern', serializable).catch(err => {
      console.error('[ElectronStorage] Failed to save pattern:', err);
    });
  }

  async getPatternByUUID(uuid: string): Promise<ICachedPattern | null> {
    try {
      const pattern = await this.invoke<ICachedPattern | null>('storage:getPattern', uuid);

      if (pattern && Array.isArray(pattern.pesData.penData)) {
        // Restore Uint8Array from array
        pattern.pesData.penData = new Uint8Array(pattern.pesData.penData);
      }

      return pattern;
    } catch (err) {
      console.error('[ElectronStorage] Failed to get pattern:', err);
      return null;
    }
  }

  async getMostRecentPattern(): Promise<ICachedPattern | null> {
    try {
      const pattern = await this.invoke<ICachedPattern | null>('storage:getLatest');

      if (pattern && Array.isArray(pattern.pesData.penData)) {
        // Restore Uint8Array from array
        pattern.pesData.penData = new Uint8Array(pattern.pesData.penData);
      }

      return pattern;
    } catch (err) {
      console.error('[ElectronStorage] Failed to get latest pattern:', err);
      return null;
    }
  }

  async hasPattern(): Promise<boolean> {
    // Since this is async in Electron, we can't truly implement this synchronously
    // Returning false as a safe default
    console.warn('[ElectronStorage] hasPattern called synchronously, returning false');
    return false;
  }

  async deletePattern(uuid: string): Promise<void> {
    try {
      await this.invoke('storage:deletePattern', uuid);
    } catch (err) {
      console.error('[ElectronStorage] Failed to delete pattern:', err);
    }
  }

  async clearCache(): Promise<void> {
    try {
      await this.invoke('storage:clear');
    } catch (err) {
      console.error('[ElectronStorage] Failed to clear cache:', err);
    }
  }

  async getCacheInfo(): Promise<{ hasCache: boolean; fileName?: string; uuid?: string; age?: number }> {
    // This needs to be async in Electron, return empty info synchronously
    console.warn('[ElectronStorage] getCacheInfo called synchronously, returning empty');
    return { hasCache: false };
  }
}
