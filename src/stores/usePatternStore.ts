import { create } from 'zustand';
import type { PesPatternData } from '../formats/import/pesImporter';

interface PatternState {
  // Pattern data
  pesData: PesPatternData | null;
  currentFileName: string;
  patternOffset: { x: number; y: number };
  patternUploaded: boolean;

  // Actions
  setPattern: (data: PesPatternData, fileName: string) => void;
  setPatternOffset: (x: number, y: number) => void;
  setPatternUploaded: (uploaded: boolean) => void;
  clearPattern: () => void;
  resetPatternOffset: () => void;
}

export const usePatternStore = create<PatternState>((set) => ({
  // Initial state
  pesData: null,
  currentFileName: '',
  patternOffset: { x: 0, y: 0 },
  patternUploaded: false,

  // Set pattern data and filename
  setPattern: (data: PesPatternData, fileName: string) => {
    set({
      pesData: data,
      currentFileName: fileName,
      patternOffset: { x: 0, y: 0 }, // Reset offset when new pattern is loaded
      patternUploaded: false,
    });
  },

  // Update pattern offset
  setPatternOffset: (x: number, y: number) => {
    set({ patternOffset: { x, y } });
    console.log('[PatternStore] Pattern offset changed:', { x, y });
  },

  // Mark pattern as uploaded/not uploaded
  setPatternUploaded: (uploaded: boolean) => {
    set({ patternUploaded: uploaded });
  },

  // Clear pattern (but keep data visible for re-editing)
  clearPattern: () => {
    set({
      patternUploaded: false,
      // Note: We intentionally DON'T clear pesData or currentFileName
      // so the pattern remains visible in the canvas for re-editing
    });
  },

  // Reset pattern offset to default
  resetPatternOffset: () => {
    set({ patternOffset: { x: 0, y: 0 } });
  },
}));

// Selector hooks for common use cases
export const usePesData = () => usePatternStore((state) => state.pesData);
export const usePatternFileName = () => usePatternStore((state) => state.currentFileName);
export const usePatternOffset = () => usePatternStore((state) => state.patternOffset);
export const usePatternUploaded = () => usePatternStore((state) => state.patternUploaded);
