import { create } from "zustand";
import type { PesPatternData } from "../formats/import/pesImporter";

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
  ) => void;
  clearUploadedPattern: () => void;
  resetPatternOffset: () => void;
  resetRotation: () => void;
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
  ) => {
    set({
      uploadedPesData: uploadedData,
      uploadedPatternOffset: uploadedOffset,
      patternUploaded: true,
    });
    console.log("[PatternStore] Uploaded pattern set");
  },

  // Clear uploaded pattern (called when deleting from machine)
  clearUploadedPattern: () => {
    set({
      uploadedPesData: null,
      uploadedPatternOffset: { x: 0, y: 0 },
      patternUploaded: false,
    });
    console.log("[PatternStore] Uploaded pattern cleared");
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
