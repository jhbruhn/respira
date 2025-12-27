import { create } from "zustand";
import type { PesPatternData } from "../formats/import/pesImporter";
import { uuidToString } from "../services/PatternCacheService";
import { onPatternDeleted } from "./storeEvents";

/**
 * Machine Cache Store
 *
 * Manages pattern caching and resume functionality.
 * Handles checking for cached patterns on the machine and loading them.
 * Extracted from useMachineStore for better separation of concerns.
 */

interface MachineCacheState {
  // Resume state
  resumeAvailable: boolean;
  resumeFileName: string | null;
  resumedPattern: {
    pesData: PesPatternData;
    uploadedPesData?: PesPatternData;
    patternOffset?: { x: number; y: number };
    patternRotation?: number;
  } | null;

  // Actions
  checkResume: () => Promise<PesPatternData | null>;
  loadCachedPattern: () => Promise<{
    pesData: PesPatternData;
    uploadedPesData?: PesPatternData;
    patternOffset?: { x: number; y: number };
    patternRotation?: number;
  } | null>;

  // Helper methods for inter-store communication
  setResumeAvailable: (available: boolean, fileName: string | null) => void;
  clearResumeState: () => void;
}

export const useMachineCacheStore = create<MachineCacheState>((set, get) => ({
  // Initial state
  resumeAvailable: false,
  resumeFileName: null,
  resumedPattern: null,

  /**
   * Check for resumable pattern on the machine
   * Queries the machine for its current pattern UUID and checks if we have it cached
   */
  checkResume: async (): Promise<PesPatternData | null> => {
    try {
      // Import here to avoid circular dependency
      const { useMachineStore } = await import("./useMachineStore");
      const { service, storageService } = useMachineStore.getState();

      console.log("[Resume] Checking for cached pattern...");

      const machineUuid = await service.getPatternUUID();
      console.log(
        "[Resume] Machine UUID:",
        machineUuid ? uuidToString(machineUuid) : "none",
      );

      if (!machineUuid) {
        console.log("[Resume] No pattern loaded on machine");
        set({ resumeAvailable: false, resumeFileName: null });
        return null;
      }

      const uuidStr = uuidToString(machineUuid);
      const cached = await storageService.getPatternByUUID(uuidStr);

      if (cached) {
        console.log(
          "[Resume] Pattern found in cache:",
          cached.fileName,
          "Offset:",
          cached.patternOffset,
          "Rotation:",
          cached.patternRotation,
          "Has uploaded data:",
          !!cached.uploadedPesData,
        );
        console.log("[Resume] Auto-loading cached pattern...");
        set({
          resumeAvailable: true,
          resumeFileName: cached.fileName,
          resumedPattern: {
            pesData: cached.pesData,
            uploadedPesData: cached.uploadedPesData,
            patternOffset: cached.patternOffset,
            patternRotation: cached.patternRotation,
          },
        });

        // Fetch pattern info from machine
        try {
          const info = await service.getPatternInfo();
          useMachineStore.setState({ patternInfo: info });
          console.log("[Resume] Pattern info loaded from machine");
        } catch (err) {
          console.error("[Resume] Failed to load pattern info:", err);
        }

        return cached.pesData;
      } else {
        console.log("[Resume] Pattern on machine not found in cache");
        set({ resumeAvailable: false, resumeFileName: null });
        return null;
      }
    } catch (err) {
      console.error("[Resume] Failed to check resume:", err);
      set({ resumeAvailable: false, resumeFileName: null });
      return null;
    }
  },

  /**
   * Load cached pattern data
   * Used when the user wants to restore a previously uploaded pattern
   */
  loadCachedPattern: async (): Promise<{
    pesData: PesPatternData;
    uploadedPesData?: PesPatternData;
    patternOffset?: { x: number; y: number };
    patternRotation?: number;
  } | null> => {
    const { resumeAvailable } = get();
    if (!resumeAvailable) return null;

    try {
      // Import here to avoid circular dependency
      const { useMachineStore } = await import("./useMachineStore");
      const { service, storageService, refreshPatternInfo } =
        useMachineStore.getState();

      const machineUuid = await service.getPatternUUID();
      if (!machineUuid) return null;

      const uuidStr = uuidToString(machineUuid);
      const cached = await storageService.getPatternByUUID(uuidStr);

      if (cached) {
        console.log(
          "[Resume] Loading cached pattern:",
          cached.fileName,
          "Offset:",
          cached.patternOffset,
          "Rotation:",
          cached.patternRotation,
          "Has uploaded data:",
          !!cached.uploadedPesData,
        );
        await refreshPatternInfo();
        return {
          pesData: cached.pesData,
          uploadedPesData: cached.uploadedPesData,
          patternOffset: cached.patternOffset,
          patternRotation: cached.patternRotation,
        };
      }

      return null;
    } catch (err) {
      console.error(
        "[Resume] Failed to load cached pattern:",
        err instanceof Error ? err.message : "Unknown error",
      );
      return null;
    }
  },

  /**
   * Set resume availability
   * Used by other stores to update resume state
   */
  setResumeAvailable: (available: boolean, fileName: string | null) => {
    set({
      resumeAvailable: available,
      resumeFileName: fileName,
      ...(available === false && { resumedPattern: null }),
    });
  },

  /**
   * Clear resume state
   * Called when pattern is deleted from machine
   */
  clearResumeState: () => {
    set({
      resumeAvailable: false,
      resumeFileName: null,
      resumedPattern: null,
    });
  },
}));

// Subscribe to pattern deleted event.
// This subscription is intended to persist for the lifetime of the application,
// so the unsubscribe function returned by `onPatternDeleted` is intentionally
// not stored or called.
onPatternDeleted(() => {
  try {
    useMachineCacheStore.getState().clearResumeState();
  } catch (error) {
    console.error(
      "[MachineCacheStore] Failed to clear resume state on pattern deleted event:",
      error,
    );
  }
});
