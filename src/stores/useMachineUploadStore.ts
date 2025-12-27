import { create } from "zustand";
import type { PesPatternData } from "../formats/import/pesImporter";
import { uuidToString } from "../services/PatternCacheService";
import { onPatternDeleted } from "./storeEvents";

/**
 * Machine Upload Store
 *
 * Manages the state and logic for uploading patterns to the machine.
 * Extracted from useMachineStore for better separation of concerns.
 */

interface MachineUploadState {
  // Upload state
  uploadProgress: number;
  isUploading: boolean;

  // Actions
  uploadPattern: (
    penData: Uint8Array,
    uploadedPesData: PesPatternData, // Pattern with rotation applied (for machine upload)
    fileName: string,
    patternOffset?: { x: number; y: number },
    patternRotation?: number,
    originalPesData?: PesPatternData, // Original unrotated pattern (for caching)
  ) => Promise<void>;

  reset: () => void;
}

export const useMachineUploadStore = create<MachineUploadState>((set) => ({
  // Initial state
  uploadProgress: 0,
  isUploading: false,

  /**
   * Upload a pattern to the machine
   *
   * @param penData - The PEN-formatted pattern data to upload
   * @param uploadedPesData - Pattern with rotation applied (for machine)
   * @param fileName - Name of the pattern file
   * @param patternOffset - Pattern position offset
   * @param patternRotation - Rotation angle in degrees
   * @param originalPesData - Original unrotated pattern (for caching)
   */
  uploadPattern: async (
    penData: Uint8Array,
    uploadedPesData: PesPatternData,
    fileName: string,
    patternOffset?: { x: number; y: number },
    patternRotation?: number,
    originalPesData?: PesPatternData,
  ) => {
    // Import here to avoid circular dependency
    const { useMachineStore } = await import("./useMachineStore");
    const {
      isConnected,
      service,
      storageService,
      refreshStatus,
      refreshPatternInfo,
    } = useMachineStore.getState();

    if (!isConnected) {
      throw new Error("Not connected to machine");
    }

    try {
      set({ uploadProgress: 0, isUploading: true });

      // Upload to machine using the rotated bounds
      const uuid = await service.uploadPattern(
        penData,
        (progress) => {
          set({ uploadProgress: progress });
        },
        uploadedPesData.bounds,
        patternOffset,
      );

      set({ uploadProgress: 100 });

      // Cache the ORIGINAL unrotated pattern with rotation angle AND the uploaded data
      // This allows us to restore the editable state correctly and ensures the exact
      // uploaded data is used on resume (prevents inconsistencies from version updates)
      const pesDataToCache = originalPesData || uploadedPesData;
      const uuidStr = uuidToString(uuid);
      storageService.savePattern(
        uuidStr,
        pesDataToCache,
        fileName,
        patternOffset,
        patternRotation,
        uploadedPesData, // Cache the exact uploaded data
      );
      console.log(
        "[MachineUpload] Saved pattern:",
        fileName,
        "with UUID:",
        uuidStr,
        "Offset:",
        patternOffset,
        "Rotation:",
        patternRotation,
        "(cached original unrotated data + uploaded data)",
      );

      // Clear resume state in cache store since we just uploaded
      const { useMachineCacheStore } = await import("./useMachineCacheStore");
      useMachineCacheStore.getState().setResumeAvailable(false, null);

      // Refresh status and pattern info after upload
      await refreshStatus();
      await refreshPatternInfo();
    } catch (err) {
      throw err instanceof Error ? err : new Error("Failed to upload pattern");
    } finally {
      set({ isUploading: false });
    }
  },

  /**
   * Reset upload state
   * Called when pattern is deleted from machine
   */
  reset: () => {
    set({ uploadProgress: 0, isUploading: false });
  },
}));

// Subscribe to pattern deleted event
onPatternDeleted(() => {
  useMachineUploadStore.getState().reset();
});
