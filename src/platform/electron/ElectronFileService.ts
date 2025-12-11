import type { IFileService } from '../interfaces/IFileService';

/**
 * Electron implementation of file service using native dialogs via IPC
 */
export class ElectronFileService implements IFileService {
  async openFileDialog(): Promise<File | null> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }

    try {
      const result = await window.electronAPI.invoke<{ filePath: string; fileName: string } | null>('dialog:openFile', {
        filters: [
          { name: 'PES Files', extensions: ['pes'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (!result) {
        return null;
      }

      // Read the file content
      const buffer = await window.electronAPI.invoke<ArrayBuffer>('fs:readFile', result.filePath);
      const blob = new Blob([buffer]);
      return new File([blob], result.fileName, { type: 'application/octet-stream' });
    } catch (err) {
      console.error('[ElectronFileService] Failed to open file:', err);
      return null;
    }
  }

  async saveFileDialog(data: Uint8Array, defaultName: string): Promise<void> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }

    try {
      const filePath = await window.electronAPI.invoke<string | null>('dialog:saveFile', {
        defaultPath: defaultName,
        filters: [
          { name: 'PEN Files', extensions: ['pen'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (filePath) {
        await window.electronAPI.invoke('fs:writeFile', filePath, Array.from(data));
      }
    } catch (err) {
      console.error('[ElectronFileService] Failed to save file:', err);
      throw err;
    }
  }

  hasNativeDialogs(): boolean {
    return true;
  }
}
