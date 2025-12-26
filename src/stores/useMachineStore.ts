import { create } from "zustand";
import {
  BrotherPP1Service,
  BluetoothPairingError,
} from "../services/BrotherPP1Service";
import type {
  MachineInfo,
  PatternInfo,
  SewingProgress,
} from "../types/machine";
import { MachineStatus, MachineStatusNames } from "../types/machine";
import { SewingMachineError } from "../utils/errorCodeHelpers";
import { uuidToString } from "../services/PatternCacheService";
import { createStorageService } from "../platform";
import type { IStorageService } from "../platform/interfaces/IStorageService";
import { usePatternStore } from "./usePatternStore";

interface MachineState {
  // Service instances
  service: BrotherPP1Service;
  storageService: IStorageService;

  // Connection state
  isConnected: boolean;
  machineInfo: MachineInfo | null;

  // Machine status
  machineStatus: MachineStatus;
  machineStatusName: string;
  machineError: number;

  // Pattern state
  patternInfo: PatternInfo | null;
  sewingProgress: SewingProgress | null;

  // Error state
  error: string | null;
  isPairingError: boolean;

  // Communication state
  isCommunicating: boolean;
  isDeleting: boolean;

  // Polling control
  pollIntervalId: NodeJS.Timeout | null;
  serviceCountIntervalId: NodeJS.Timeout | null;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  refreshPatternInfo: () => Promise<void>;
  refreshProgress: () => Promise<void>;
  refreshServiceCount: () => Promise<void>;
  startMaskTrace: () => Promise<void>;
  startSewing: () => Promise<void>;
  resumeSewing: () => Promise<void>;
  deletePattern: () => Promise<void>;

  // Internal methods
  _setupSubscriptions: () => void;
  _startPolling: () => void;
  _stopPolling: () => void;
}

export const useMachineStore = create<MachineState>((set, get) => ({
  // Initial state
  service: new BrotherPP1Service(),
  storageService: createStorageService(),
  isConnected: false,
  machineInfo: null,
  machineStatus: MachineStatus.None,
  machineStatusName: MachineStatusNames[MachineStatus.None] || "Unknown",
  machineError: SewingMachineError.None,
  patternInfo: null,
  sewingProgress: null,
  error: null,
  isPairingError: false,
  isCommunicating: false,
  isDeleting: false,
  pollIntervalId: null,
  serviceCountIntervalId: null,

  // Connect to machine
  connect: async () => {
    try {
      const { service } = get();
      set({ error: null, isPairingError: false });

      await service.connect();
      set({ isConnected: true });

      // Fetch initial machine info and status
      const info = await service.getMachineInfo();
      const state = await service.getMachineState();

      set({
        machineInfo: info,
        machineStatus: state.status,
        machineStatusName: MachineStatusNames[state.status] || "Unknown",
        machineError: state.error,
      });

      // Check for resume possibility using cache store
      const { useMachineCacheStore } = await import("./useMachineCacheStore");
      await useMachineCacheStore.getState().checkResume();

      // Start polling
      get()._startPolling();
    } catch (err) {
      console.log(err);
      const isPairing = err instanceof BluetoothPairingError;
      set({
        isPairingError: isPairing,
        error: err instanceof Error ? err.message : "Failed to connect",
        isConnected: false,
      });
    }
  },

  // Disconnect from machine
  disconnect: async () => {
    try {
      const { service, _stopPolling } = get();
      _stopPolling();

      await service.disconnect();
      set({
        isConnected: false,
        machineInfo: null,
        machineStatus: MachineStatus.None,
        machineStatusName: MachineStatusNames[MachineStatus.None] || "Unknown",
        patternInfo: null,
        sewingProgress: null,
        error: null,
        machineError: SewingMachineError.None,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to disconnect",
      });
    }
  },

  // Refresh machine status
  refreshStatus: async () => {
    const { isConnected, service } = get();
    if (!isConnected) return;

    try {
      const state = await service.getMachineState();
      set({
        machineStatus: state.status,
        machineStatusName: MachineStatusNames[state.status] || "Unknown",
        machineError: state.error,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to get status",
      });
    }
  },

  // Refresh pattern info
  refreshPatternInfo: async () => {
    const { isConnected, service } = get();
    if (!isConnected) return;

    try {
      const info = await service.getPatternInfo();
      set({ patternInfo: info });
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : "Failed to get pattern info",
      });
    }
  },

  // Refresh sewing progress
  refreshProgress: async () => {
    const { isConnected, service } = get();
    if (!isConnected) return;

    try {
      const progress = await service.getSewingProgress();
      set({ sewingProgress: progress });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to get progress",
      });
    }
  },

  // Refresh service count
  refreshServiceCount: async () => {
    const { isConnected, machineInfo, service } = get();
    if (!isConnected || !machineInfo) return;

    try {
      const counts = await service.getServiceCount();
      set({
        machineInfo: {
          ...machineInfo,
          serviceCount: counts.serviceCount,
          totalCount: counts.totalCount,
        },
      });
    } catch (err) {
      console.warn("Failed to get service count:", err);
    }
  },

  // Start mask trace
  startMaskTrace: async () => {
    const { isConnected, service, refreshStatus } = get();
    if (!isConnected) return;

    try {
      set({ error: null });
      await service.startMaskTrace();
      await refreshStatus();
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : "Failed to start mask trace",
      });
    }
  },

  // Start sewing
  startSewing: async () => {
    const { isConnected, service, refreshStatus } = get();
    if (!isConnected) return;

    try {
      set({ error: null });
      await service.startSewing();
      await refreshStatus();
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to start sewing",
      });
    }
  },

  // Resume sewing
  resumeSewing: async () => {
    const { isConnected, service, refreshStatus } = get();
    if (!isConnected) return;

    try {
      set({ error: null });
      await service.resumeSewing();
      await refreshStatus();
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to resume sewing",
      });
    }
  },

  // Delete pattern from machine
  deletePattern: async () => {
    const { isConnected, service, storageService, refreshStatus } = get();
    if (!isConnected) return;

    try {
      set({ error: null, isDeleting: true });

      // Delete pattern from cache to prevent auto-resume
      try {
        const machineUuid = await service.getPatternUUID();
        if (machineUuid) {
          const uuidStr = uuidToString(machineUuid);
          await storageService.deletePattern(uuidStr);
          console.log("[Cache] Deleted pattern with UUID:", uuidStr);
        }
      } catch (err) {
        console.warn("[Cache] Failed to get UUID for cache deletion:", err);
      }

      await service.deletePattern();

      // Clear machine-related state
      set({
        patternInfo: null,
        sewingProgress: null,
      });

      // Clear uploaded pattern data in pattern store
      usePatternStore.getState().clearUploadedPattern();

      // Clear upload state in upload store
      const { useMachineUploadStore } = await import("./useMachineUploadStore");
      useMachineUploadStore.getState().reset();

      // Clear resume state in cache store
      const { useMachineCacheStore } = await import("./useMachineCacheStore");
      useMachineCacheStore.getState().clearResumeState();

      await refreshStatus();
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to delete pattern",
      });
    } finally {
      set({ isDeleting: false });
    }
  },

  // Setup service subscriptions
  _setupSubscriptions: () => {
    const { service } = get();

    // Subscribe to communication state changes
    service.onCommunicationChange((isCommunicating) => {
      set({ isCommunicating });
    });

    // Subscribe to disconnect events
    service.onDisconnect(() => {
      console.log("[useMachineStore] Device disconnected");
      get()._stopPolling();
      set({
        isConnected: false,
        machineInfo: null,
        machineStatus: MachineStatus.None,
        machineStatusName: MachineStatusNames[MachineStatus.None] || "Unknown",
        machineError: SewingMachineError.None,
        patternInfo: null,
        sewingProgress: null,
        error: "Device disconnected",
        isPairingError: false,
      });
    });
  },

  // Start polling for status updates
  _startPolling: () => {
    const {
      _stopPolling,
      refreshStatus,
      refreshProgress,
      refreshServiceCount,
      refreshPatternInfo,
    } = get();

    // Stop any existing polling
    _stopPolling();

    // Function to determine polling interval based on machine status
    const getPollInterval = () => {
      const status = get().machineStatus;

      // Fast polling for active states
      if (
        status === MachineStatus.SEWING ||
        status === MachineStatus.MASK_TRACING ||
        status === MachineStatus.SEWING_DATA_RECEIVE
      ) {
        return 500;
      } else if (
        status === MachineStatus.COLOR_CHANGE_WAIT ||
        status === MachineStatus.MASK_TRACE_LOCK_WAIT ||
        status === MachineStatus.SEWING_WAIT
      ) {
        return 1000;
      }
      return 2000; // Default for idle states
    };

    // Main polling function
    const poll = async () => {
      await refreshStatus();

      // Refresh progress during sewing
      if (get().machineStatus === MachineStatus.SEWING) {
        await refreshProgress();
      }

      // follows the apps logic:
      // Check if we have a cached pattern and pattern info needs refreshing
      const { useMachineCacheStore } = await import("./useMachineCacheStore");
      if (
        useMachineCacheStore.getState().resumeAvailable &&
        get().patternInfo?.totalStitches == 0
      ) {
        await refreshPatternInfo();
      }

      // Schedule next poll with updated interval
      const newInterval = getPollInterval();
      const pollIntervalId = setTimeout(poll, newInterval);
      set({ pollIntervalId });
    };

    // Start polling
    const initialInterval = getPollInterval();
    const pollIntervalId = setTimeout(poll, initialInterval);

    // Service count polling (every 10 seconds)
    const serviceCountIntervalId = setInterval(refreshServiceCount, 10000);

    set({ pollIntervalId, serviceCountIntervalId });
  },

  // Stop polling
  _stopPolling: () => {
    const { pollIntervalId, serviceCountIntervalId } = get();

    if (pollIntervalId) {
      clearTimeout(pollIntervalId);
      set({ pollIntervalId: null });
    }

    if (serviceCountIntervalId) {
      clearInterval(serviceCountIntervalId);
      set({ serviceCountIntervalId: null });
    }
  },
}));

// Initialize subscriptions when store is created
useMachineStore.getState()._setupSubscriptions();

// Selector hooks for common use cases
export const useIsConnected = () =>
  useMachineStore((state) => state.isConnected);
export const useMachineInfo = () =>
  useMachineStore((state) => state.machineInfo);
export const useMachineStatus = () =>
  useMachineStore((state) => state.machineStatus);
export const useMachineError = () =>
  useMachineStore((state) => state.machineError);
export const usePatternInfo = () =>
  useMachineStore((state) => state.patternInfo);
export const useSewingProgress = () =>
  useMachineStore((state) => state.sewingProgress);
// Derived state: pattern is uploaded if machine has pattern info
export const usePatternUploaded = () =>
  useMachineStore((state) => state.patternInfo !== null);
