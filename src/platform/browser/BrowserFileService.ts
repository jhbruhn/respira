import type { IFileService } from '../interfaces/IFileService';

/**
 * Browser implementation of file service using HTML input elements
 */
export class BrowserFileService implements IFileService {
  async openFileDialog(options: { accept: string }): Promise<File | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = options.accept;

      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        resolve(file || null);
      };

      input.oncancel = () => {
        resolve(null);
      };

      input.click();
    });
  }

  async saveFileDialog(): Promise<void> {
    // No-op in browser - could implement download if needed in the future
    console.warn('saveFileDialog not implemented in browser');
  }

  hasNativeDialogs(): boolean {
    return false;
  }
}
