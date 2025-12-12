import { create } from 'zustand';
import { pyodideLoader } from '../utils/pyodideLoader';

interface UIState {
  // Pyodide state
  pyodideReady: boolean;
  pyodideError: string | null;

  // UI state
  showErrorPopover: boolean;

  // Actions
  initializePyodide: () => Promise<void>;
  toggleErrorPopover: () => void;
  setErrorPopover: (show: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Initial state
  pyodideReady: false,
  pyodideError: null,
  showErrorPopover: false,

  // Initialize Pyodide
  initializePyodide: async () => {
    try {
      await pyodideLoader.initialize();
      set({ pyodideReady: true });
      console.log('[UIStore] Pyodide initialized successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize Python environment';
      set({ pyodideError: errorMessage });
      console.error('[UIStore] Failed to initialize Pyodide:', err);
    }
  },

  // Toggle error popover visibility
  toggleErrorPopover: () => {
    set((state) => ({ showErrorPopover: !state.showErrorPopover }));
  },

  // Set error popover visibility
  setErrorPopover: (show: boolean) => {
    set({ showErrorPopover: show });
  },
}));

// Selector hooks for common use cases
export const usePyodideReady = () => useUIStore((state) => state.pyodideReady);
export const usePyodideError = () => useUIStore((state) => state.pyodideError);
export const useErrorPopover = () => useUIStore((state) => state.showErrorPopover);
