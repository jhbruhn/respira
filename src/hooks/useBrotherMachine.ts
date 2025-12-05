import { useState, useCallback, useEffect } from "react";
import { BrotherPP1Service } from "../services/BrotherPP1Service";
import type {
  MachineInfo,
  PatternInfo,
  SewingProgress,
} from "../types/machine";
import { MachineStatus, MachineStatusNames } from "../types/machine";
import {
  PatternCacheService,
  uuidToString,
} from "../services/PatternCacheService";
import type { PesPatternData } from "../utils/pystitchConverter";

export function useBrotherMachine() {
  const [service] = useState(() => new BrotherPP1Service());
  const [isConnected, setIsConnected] = useState(false);
  const [machineInfo, setMachineInfo] = useState<MachineInfo | null>(null);
  const [machineStatus, setMachineStatus] = useState<MachineStatus>(
    MachineStatus.None,
  );
  const [machineError, setMachineError] = useState<number>(0);
  const [patternInfo, setPatternInfo] = useState<PatternInfo | null>(null);
  const [sewingProgress, setSewingProgress] = useState<SewingProgress | null>(
    null,
  );
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [resumeAvailable, setResumeAvailable] = useState(false);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [resumedPattern, setResumedPattern] = useState<PesPatternData | null>(
    null,
  );

  // Define checkResume first (before connect uses it)
  const checkResume = useCallback(async (): Promise<PesPatternData | null> => {
    try {
      console.log("[Resume] Checking for cached pattern...");

      // Get UUID from machine
      const machineUuid = await service.getPatternUUID();

      console.log(
        "[Resume] Machine UUID:",
        machineUuid ? uuidToString(machineUuid) : "none",
      );

      if (!machineUuid) {
        console.log("[Resume] No pattern loaded on machine");
        setResumeAvailable(false);
        setResumeFileName(null);
        return null;
      }

      // Check if we have this pattern cached
      const uuidStr = uuidToString(machineUuid);
      const cached = PatternCacheService.getPatternByUUID(uuidStr);

      if (cached) {
        console.log("[Resume] Pattern found in cache:", cached.fileName);
        console.log("[Resume] Auto-loading cached pattern...");
        setResumeAvailable(true);
        setResumeFileName(cached.fileName);
        setResumedPattern(cached.pesData);

        // Fetch pattern info from machine
        try {
          const info = await service.getPatternInfo();
          setPatternInfo(info);
          console.log("[Resume] Pattern info loaded from machine");
        } catch (err) {
          console.error("[Resume] Failed to load pattern info:", err);
        }

        // Return the cached pattern data to be loaded
        return cached.pesData;
      } else {
        console.log("[Resume] Pattern on machine not found in cache");
        setResumeAvailable(false);
        setResumeFileName(null);
        return null;
      }
    } catch (err) {
      console.error("[Resume] Failed to check resume:", err);
      setResumeAvailable(false);
      setResumeFileName(null);
      return null;
    }
  }, [service]);

  const connect = useCallback(async () => {
    try {
      setError(null);
      await service.connect();
      setIsConnected(true);

      // Fetch initial machine info and status
      const info = await service.getMachineInfo();
      setMachineInfo(info);

      const state = await service.getMachineState();
      setMachineStatus(state.status);
      setMachineError(state.error);

      // Check for resume possibility
      await checkResume();
    } catch (err) {
      console.log(err);
      setError(err instanceof Error ? err.message : "Failed to connect");
      setIsConnected(false);
    }
  }, [service, checkResume]);

  const disconnect = useCallback(async () => {
    try {
      await service.disconnect();
      setIsConnected(false);
      setMachineInfo(null);
      setMachineStatus(MachineStatus.None);
      setPatternInfo(null);
      setSewingProgress(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect");
    }
  }, [service]);

  const refreshStatus = useCallback(async () => {
    if (!isConnected) return;

    try {
      setIsPolling(true);
      const state = await service.getMachineState();
      setMachineStatus(state.status);
      setMachineError(state.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get status");
    } finally {
      setIsPolling(false);
    }
  }, [service, isConnected]);

  const refreshPatternInfo = useCallback(async () => {
    if (!isConnected) return;

    try {
      const info = await service.getPatternInfo();
      setPatternInfo(info);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to get pattern info",
      );
    }
  }, [service, isConnected]);

  const refreshProgress = useCallback(async () => {
    if (!isConnected) return;

    try {
      const progress = await service.getSewingProgress();
      setSewingProgress(progress);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get progress");
    }
  }, [service, isConnected]);

  const loadCachedPattern =
    useCallback(async (): Promise<PesPatternData | null> => {
      if (!resumeAvailable) return null;

      try {
        const machineUuid = await service.getPatternUUID();
        if (!machineUuid) return null;

        const uuidStr = uuidToString(machineUuid);
        const cached = PatternCacheService.getPatternByUUID(uuidStr);

        if (cached) {
          console.log("[Resume] Loading cached pattern:", cached.fileName);
          // Refresh pattern info from machine
          await refreshPatternInfo();
          return cached.pesData;
        }

        return null;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load cached pattern",
        );
        return null;
      }
    }, [service, resumeAvailable, refreshPatternInfo]);

  const uploadPattern = useCallback(
    async (penData: Uint8Array, pesData: PesPatternData, fileName: string) => {
      if (!isConnected) {
        setError("Not connected to machine");
        return;
      }

      try {
        setError(null);
        setUploadProgress(0);
        const uuid = await service.uploadPattern(
          penData,
          (progress) => {
            setUploadProgress(progress);
          },
          pesData.bounds,
        );
        setUploadProgress(100);

        // Cache the pattern with its UUID
        const uuidStr = uuidToString(uuid);
        PatternCacheService.savePattern(uuidStr, pesData, fileName);
        console.log("[Cache] Saved pattern:", fileName, "with UUID:", uuidStr);

        // Clear resume state since we just uploaded
        setResumeAvailable(false);
        setResumeFileName(null);

        // Refresh status and pattern info after upload
        await refreshStatus();
        await refreshPatternInfo();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to upload pattern",
        );
      }
    },
    [service, isConnected, refreshStatus, refreshPatternInfo],
  );

  const startMaskTrace = useCallback(async () => {
    if (!isConnected) return;

    try {
      setError(null);
      await service.startMaskTrace();
      await refreshStatus();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start mask trace",
      );
    }
  }, [service, isConnected, refreshStatus]);

  const startSewing = useCallback(async () => {
    if (!isConnected) return;

    try {
      setError(null);
      await service.startSewing();
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start sewing");
    }
  }, [service, isConnected, refreshStatus]);

  const resumeSewing = useCallback(async () => {
    if (!isConnected) return;

    try {
      setError(null);
      await service.resumeSewing();
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resume sewing");
    }
  }, [service, isConnected, refreshStatus]);

  const deletePattern = useCallback(async () => {
    if (!isConnected) return;

    try {
      setError(null);
      await service.deletePattern();
      setPatternInfo(null);
      setSewingProgress(null);
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete pattern");
    }
  }, [service, isConnected, refreshStatus]);

  // Periodic status monitoring when connected
  useEffect(() => {
    if (!isConnected) {
      return;
    }

    // Determine polling interval based on machine status
    let pollInterval = 2000; // Default: 2 seconds for idle states

    // Fast polling for active states
    if (
      machineStatus === MachineStatus.SEWING ||
      machineStatus === MachineStatus.MASK_TRACING ||
      machineStatus === MachineStatus.SEWING_DATA_RECEIVE
    ) {
      pollInterval = 500; // 500ms for active operations
    } else if (
      machineStatus === MachineStatus.COLOR_CHANGE_WAIT ||
      machineStatus === MachineStatus.MASK_TRACE_LOCK_WAIT ||
      machineStatus === MachineStatus.SEWING_WAIT
    ) {
      pollInterval = 1000; // 1 second for waiting states
    }

    const interval = setInterval(async () => {
      await refreshStatus();

      // Also refresh progress during sewing
      if (machineStatus === MachineStatus.SEWING) {
        await refreshProgress();
      }
    }, pollInterval);

    return () => clearInterval(interval);
  }, [isConnected, machineStatus, refreshStatus, refreshProgress]);

  // Refresh pattern info when status changes to SEWING_WAIT
  // (indicates pattern was just uploaded or is ready)
  useEffect(() => {
    if (!isConnected) return;

    if (machineStatus === MachineStatus.SEWING_WAIT && !patternInfo) {
      refreshPatternInfo();
    }
  }, [isConnected, machineStatus, patternInfo, refreshPatternInfo]);

  return {
    isConnected,
    machineInfo,
    machineStatus,
    machineStatusName: MachineStatusNames[machineStatus] || "Unknown",
    machineError,
    patternInfo,
    sewingProgress,
    uploadProgress,
    error,
    isPolling,
    resumeAvailable,
    resumeFileName,
    resumedPattern,
    connect,
    disconnect,
    refreshStatus,
    refreshPatternInfo,
    uploadPattern,
    startMaskTrace,
    startSewing,
    resumeSewing,
    deletePattern,
    checkResume,
    loadCachedPattern,
  };
}
