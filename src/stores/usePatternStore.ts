import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { PesPatternData } from "../formats/import/pesImporter";
import { onPatternDeleted } from "./storeEvents";
import { calculatePatternCenter } from "../components/PatternCanvas/patternCanvasHelpers";
import { calculateRotatedBounds } from "../utils/rotationUtils";

interface PatternState {
  // Original pattern (pre-upload)
  pesData: PesPatternData | null;
  currentFileName: string;
  patternOffset: { x: number; y: number };
  patternRotation: number; // rotation in degrees (0-360)

  // Uploaded pattern (post-upload, rotation baked in)
  uploadedPesData: PesPatternData | null; // Pattern with rotation applied
  uploadedPatternOffset: { x: number; y: number }; // Offset with center shift compensation

  patternUploaded: boolean;

  // Actions
  setPattern: (data: PesPatternData, fileName: string) => void;
  setPatternOffset: (x: number, y: number) => void;
  setPatternRotation: (rotation: number) => void;
  setUploadedPattern: (
    uploadedData: PesPatternData,
    uploadedOffset: { x: number; y: number },
    fileName?: string,
  ) => void;
  clearUploadedPattern: () => void;
  resetPatternOffset: () => void;
  resetRotation: () => void;
}

// Computed value types
export interface PatternCenter {
  x: number;
  y: number;
}

export interface PatternBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface TransformedBounds {
  bounds: PatternBounds;
  center: PatternCenter;
}

export interface PatternValidationResult {
  fits: boolean;
  error: string | null;
  worldBounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } | null;
}

export const usePatternStore = create<PatternState>((set) => ({
  // Initial state - original pattern
  pesData: null,
  currentFileName: "",
  patternOffset: { x: 0, y: 0 },
  patternRotation: 0,

  // Uploaded pattern
  uploadedPesData: null,
  uploadedPatternOffset: { x: 0, y: 0 },

  patternUploaded: false,

  // Set pattern data and filename (replaces current pattern)
  setPattern: (data: PesPatternData, fileName: string) => {
    set({
      pesData: data,
      currentFileName: fileName,
      patternOffset: { x: 0, y: 0 },
      patternRotation: 0,
      uploadedPesData: null, // Clear uploaded pattern when loading new
      uploadedPatternOffset: { x: 0, y: 0 },
      patternUploaded: false,
    });
  },

  // Update pattern offset (for original pattern only)
  setPatternOffset: (x: number, y: number) => {
    set({ patternOffset: { x, y } });
    console.log("[PatternStore] Pattern offset changed:", { x, y });
  },

  // Set pattern rotation (for original pattern only)
  setPatternRotation: (rotation: number) => {
    set({ patternRotation: rotation % 360 });
    console.log("[PatternStore] Pattern rotation changed:", rotation);
  },

  // Set uploaded pattern data (called after upload completes)
  setUploadedPattern: (
    uploadedData: PesPatternData,
    uploadedOffset: { x: number; y: number },
    fileName?: string,
  ) => {
    set({
      uploadedPesData: uploadedData,
      uploadedPatternOffset: uploadedOffset,
      patternUploaded: true,
      // Optionally set filename if provided (for resume/reconnect scenarios)
      ...(fileName && { currentFileName: fileName }),
    });
    console.log("[PatternStore] Uploaded pattern set");
  },

  // Clear uploaded pattern (called when deleting from machine)
  // This reverts to pre-upload state, keeping pesData so user can re-adjust and re-upload
  clearUploadedPattern: () => {
    console.log("[PatternStore] CLEARING uploaded pattern...");
    set({
      uploadedPesData: null,
      uploadedPatternOffset: { x: 0, y: 0 },
      patternUploaded: false,
      // Keep pesData, currentFileName, patternOffset, patternRotation
      // so user can adjust and re-upload
    });
    console.log(
      "[PatternStore] Uploaded pattern cleared - back to editable mode",
    );
  },

  // Reset pattern offset to default
  resetPatternOffset: () => {
    set({ patternOffset: { x: 0, y: 0 } });
  },

  // Reset pattern rotation to default
  resetRotation: () => {
    set({ patternRotation: 0 });
  },
}));

// Selector hooks for common use cases
export const usePesData = () => usePatternStore((state) => state.pesData);
export const useUploadedPesData = () =>
  usePatternStore((state) => state.uploadedPesData);
export const usePatternFileName = () =>
  usePatternStore((state) => state.currentFileName);
export const usePatternOffset = () =>
  usePatternStore((state) => state.patternOffset);
export const useUploadedPatternOffset = () =>
  usePatternStore((state) => state.uploadedPatternOffset);
export const usePatternRotation = () =>
  usePatternStore((state) => state.patternRotation);

// Computed selectors (memoized by Zustand)
// These provide single source of truth for derived state

/**
 * Select the geometric center of the pattern's bounds
 */
export const selectPatternCenter = (
  state: PatternState,
): PatternCenter | null => {
  if (!state.pesData) return null;
  return calculatePatternCenter(state.pesData.bounds);
};

/**
 * Select the center of the uploaded pattern's bounds
 */
export const selectUploadedPatternCenter = (
  state: PatternState,
): PatternCenter | null => {
  if (!state.uploadedPesData) return null;
  return calculatePatternCenter(state.uploadedPesData.bounds);
};

/**
 * Select the rotated bounds of the current pattern
 * Returns original bounds if no rotation or no pattern
 */
export const selectRotatedBounds = (
  state: PatternState,
): TransformedBounds | null => {
  if (!state.pesData) return null;

  const bounds =
    state.patternRotation && state.patternRotation !== 0
      ? calculateRotatedBounds(state.pesData.bounds, state.patternRotation)
      : state.pesData.bounds;

  const center = calculatePatternCenter(bounds);

  return { bounds, center };
};

/**
 * Select the center shift caused by rotation
 * This is used to adjust the offset when rotation is applied
 * Returns null if no pattern or no rotation
 */
export const selectRotationCenterShift = (
  state: PatternState,
  rotatedBounds: PatternBounds,
): { x: number; y: number } | null => {
  if (!state.pesData) return null;
  if (!state.patternRotation || state.patternRotation === 0)
    return { x: 0, y: 0 };

  const originalCenter = calculatePatternCenter(state.pesData.bounds);
  const rotatedCenter = calculatePatternCenter(rotatedBounds);

  return {
    x: rotatedCenter.x - originalCenter.x,
    y: rotatedCenter.y - originalCenter.y,
  };
};

/**
 * Select pattern validation against machine hoop bounds
 * Returns whether pattern fits and error message if not
 */
export const selectPatternValidation = (
  state: PatternState,
  machineInfo: { maxWidth: number; maxHeight: number } | null,
): PatternValidationResult => {
  if (!state.pesData || !machineInfo) {
    return { fits: true, error: null, worldBounds: null };
  }

  // Get rotated bounds
  const transformedBounds = selectRotatedBounds(state);
  if (!transformedBounds) {
    return { fits: true, error: null, worldBounds: null };
  }

  const { bounds, center } = transformedBounds;
  const { maxWidth, maxHeight } = machineInfo;

  // Calculate actual bounds in world coordinates
  // The patternOffset represents the pattern's CENTER position (due to offsetX/offsetY in canvas)
  const patternMinX = state.patternOffset.x - center.x + bounds.minX;
  const patternMaxX = state.patternOffset.x - center.x + bounds.maxX;
  const patternMinY = state.patternOffset.y - center.y + bounds.minY;
  const patternMaxY = state.patternOffset.y - center.y + bounds.maxY;

  const worldBounds = {
    minX: patternMinX,
    maxX: patternMaxX,
    minY: patternMinY,
    maxY: patternMaxY,
  };

  // Hoop bounds (centered at origin)
  const hoopMinX = -maxWidth / 2;
  const hoopMaxX = maxWidth / 2;
  const hoopMinY = -maxHeight / 2;
  const hoopMaxY = maxHeight / 2;

  // Check if pattern exceeds hoop bounds
  const exceedsLeft = patternMinX < hoopMinX;
  const exceedsRight = patternMaxX > hoopMaxX;
  const exceedsTop = patternMinY < hoopMinY;
  const exceedsBottom = patternMaxY > hoopMaxY;

  if (exceedsLeft || exceedsRight || exceedsTop || exceedsBottom) {
    const directions = [];
    if (exceedsLeft)
      directions.push(
        `left by ${((hoopMinX - patternMinX) / 10).toFixed(1)}mm`,
      );
    if (exceedsRight)
      directions.push(
        `right by ${((patternMaxX - hoopMaxX) / 10).toFixed(1)}mm`,
      );
    if (exceedsTop)
      directions.push(`top by ${((hoopMinY - patternMinY) / 10).toFixed(1)}mm`);
    if (exceedsBottom)
      directions.push(
        `bottom by ${((patternMaxY - hoopMaxY) / 10).toFixed(1)}mm`,
      );

    return {
      fits: false,
      error: `Pattern exceeds hoop bounds: ${directions.join(", ")}. Adjust pattern position in preview.`,
      worldBounds,
    };
  }

  return { fits: true, error: null, worldBounds };
};

/**
 * Hook to get pattern center (memoized with shallow comparison)
 */
export const usePatternCenter = () =>
  usePatternStore(useShallow(selectPatternCenter));

/**
 * Hook to get uploaded pattern center (memoized with shallow comparison)
 */
export const useUploadedPatternCenter = () =>
  usePatternStore(useShallow(selectUploadedPatternCenter));

/**
 * Hook to get rotated bounds (memoized with shallow comparison)
 */
export const useRotatedBounds = () =>
  usePatternStore(useShallow(selectRotatedBounds));

/**
 * Hook to get pattern validation result (requires machineInfo)
 * Uses shallow comparison to prevent infinite re-renders from new object references
 */
export const usePatternValidationFromStore = (
  machineInfo: { maxWidth: number; maxHeight: number } | null,
) =>
  usePatternStore(
    useShallow((state) => selectPatternValidation(state, machineInfo)),
  );

// Subscribe to pattern deleted event.
// This subscription is intended to persist for the lifetime of the application,
// so the unsubscribe function returned by `onPatternDeleted` is intentionally
// not stored or called.
onPatternDeleted(() => {
  try {
    usePatternStore.getState().clearUploadedPattern();
  } catch (error) {
    console.error(
      "[PatternStore] Failed to clear uploaded pattern on pattern deleted event:",
      error,
    );
  }
});
