export interface IFileService {
  /**
   * Open file picker and return File object
   * @param options File picker options (e.g., accept filter)
   * @returns Selected File or null if cancelled
   */
  openFileDialog(options: { accept: string }): Promise<File | null>;

  /**
   * Save a file: native dialog in Electron, browser download otherwise.
   * @param data File data as Uint8Array
   * @param defaultName Default filename (with extension)
   * @param options Optional file-type hints for the native dialog
   */
  saveFileDialog(
    data: Uint8Array,
    defaultName: string,
    options?: { description?: string; extensions?: string[] },
  ): Promise<void>;

  /**
   * Check if native file dialogs are available
   * @returns true if running in Electron with native dialogs, false otherwise
   */
  hasNativeDialogs(): boolean;
}
