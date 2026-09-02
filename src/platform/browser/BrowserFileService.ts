import type { IFileService } from "../interfaces/IFileService";

/**
 * Browser implementation of file service using HTML input elements
 */
export class BrowserFileService implements IFileService {
  async openFileDialog(options: { accept: string }): Promise<File | null> {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
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

  async saveFileDialog(data: Uint8Array, defaultName: string): Promise<void> {
    // Browser: trigger a download of the bytes.
    const blob = new Blob([data as BlobPart], {
      type: "application/octet-stream",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = defaultName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revoke on the next tick so the download has started.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  hasNativeDialogs(): boolean {
    return false;
  }
}
