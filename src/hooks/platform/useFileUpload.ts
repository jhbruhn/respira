import { useState, useCallback } from "react";
import {
  convertPesToPen,
  type PesPatternData,
} from "../../formats/import/pesImporter";
import type { IFileService } from "../../platform/interfaces/IFileService";

export interface UseFileUploadParams {
  fileService: IFileService;
  pyodideReady: boolean;
  initializePyodide: () => Promise<void>;
  onFileLoaded: (data: PesPatternData, fileName: string) => void;
}

export interface UseFileUploadReturn {
  isLoading: boolean;
  handleFileChange: (
    event?: React.ChangeEvent<HTMLInputElement>,
  ) => Promise<void>;
}

/**
 * Custom hook for handling file upload and PES to PEN conversion
 *
 * Manages file selection (native dialog or browser input), Pyodide initialization,
 * PES file conversion, and error handling.
 *
 * @param params - File service, Pyodide state, and callback
 * @returns Loading state and file change handler
 */
export function useFileUpload({
  fileService,
  pyodideReady,
  initializePyodide,
  onFileLoaded,
}: UseFileUploadParams): UseFileUploadReturn {
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = useCallback(
    async (event?: React.ChangeEvent<HTMLInputElement>) => {
      setIsLoading(true);
      try {
        // Wait for Pyodide if it's still loading
        if (!pyodideReady) {
          console.log("[FileUpload] Waiting for Pyodide to finish loading...");
          await initializePyodide();
          console.log("[FileUpload] Pyodide ready");
        }

        let file: File | null = null;

        // In Electron, use native file dialogs
        if (fileService.hasNativeDialogs()) {
          file = await fileService.openFileDialog({ accept: ".pes" });
        } else {
          // In browser, use the input element
          file = event?.target.files?.[0] || null;
        }

        if (!file) {
          setIsLoading(false);
          return;
        }

        const data = await convertPesToPen(file);
        onFileLoaded(data, file.name);
      } catch (err) {
        alert(
          `Failed to load PES file: ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
        );
      } finally {
        setIsLoading(false);
      }
    },
    [fileService, pyodideReady, initializePyodide, onFileLoaded],
  );

  return {
    isLoading,
    handleFileChange,
  };
}
