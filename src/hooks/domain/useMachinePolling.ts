/**
 * useMachinePolling Hook
 *
 * Implements dynamic polling for machine status based on machine state.
 * Uses adaptive polling intervals and conditional progress polling during sewing.
 *
 * Polling intervals:
 * - 500ms for active states (SEWING, MASK_TRACING, SEWING_DATA_RECEIVE)
 * - 1000ms for waiting states (COLOR_CHANGE_WAIT, MASK_TRACE_LOCK_WAIT, SEWING_WAIT)
 * - 2000ms for idle/other states
 *
 * Additionally polls service count every 10 seconds.
 *
 * @param options - Configuration options
 * @param options.machineStatus - Current machine status to determine polling interval
 * @param options.patternInfo - Current pattern info for resumable pattern check
 * @param options.onStatusRefresh - Callback to refresh machine status
 * @param options.onProgressRefresh - Callback to refresh sewing progress
 * @param options.onServiceCountRefresh - Callback to refresh service count
 * @param options.onPatternInfoRefresh - Callback to refresh pattern info
 * @param options.shouldCheckResumablePattern - Function to check if resumable pattern exists
 * @returns Object containing start/stop functions and polling state
 *
 * @example
 * ```tsx
 * const { startPolling, stopPolling, isPolling } = useMachinePolling({
 *   machineStatus,
 *   patternInfo,
 *   onStatusRefresh: async () => { ... },
 *   onProgressRefresh: async () => { ... },
 *   onServiceCountRefresh: async () => { ... },
 *   onPatternInfoRefresh: async () => { ... },
 *   shouldCheckResumablePattern: () => resumeAvailable
 * });
 *
 * useEffect(() => {
 *   startPolling();
 *   return () => stopPolling();
 * }, []);
 * ```
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { MachineStatus } from "../../types/machine";
import type { PatternInfo } from "../../types/machine";

export interface UseMachinePollingOptions {
  machineStatus: MachineStatus;
  patternInfo: PatternInfo | null;
  onStatusRefresh: () => Promise<void>;
  onProgressRefresh: () => Promise<void>;
  onServiceCountRefresh: () => Promise<void>;
  onPatternInfoRefresh: () => Promise<void>;
  shouldCheckResumablePattern: () => boolean;
}

export interface UseMachinePollingReturn {
  startPolling: () => void;
  stopPolling: () => void;
  isPolling: boolean;
}

export function useMachinePolling(
  options: UseMachinePollingOptions,
): UseMachinePollingReturn {
  const {
    machineStatus,
    patternInfo,
    onStatusRefresh,
    onProgressRefresh,
    onServiceCountRefresh,
    onPatternInfoRefresh,
    shouldCheckResumablePattern,
  } = options;

  const [isPolling, setIsPolling] = useState(false);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const serviceCountIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollFunctionRef = useRef<() => Promise<void>>();

  // Function to determine polling interval based on machine status
  const getPollInterval = useCallback((status: MachineStatus) => {
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
  }, []);

  // Main polling function
  const poll = useCallback(async () => {
    await onStatusRefresh();

    // Refresh progress during sewing
    if (machineStatus === MachineStatus.SEWING) {
      await onProgressRefresh();
    }

    // Check if we have a cached pattern and pattern info needs refreshing
    // This follows the app's logic for resumable patterns
    if (shouldCheckResumablePattern() && patternInfo?.totalStitches === 0) {
      await onPatternInfoRefresh();
    }

    // Schedule next poll with updated interval
    const newInterval = getPollInterval(machineStatus);
    if (pollFunctionRef.current) {
      pollTimeoutRef.current = setTimeout(pollFunctionRef.current, newInterval);
    }
  }, [
    machineStatus,
    patternInfo,
    onStatusRefresh,
    onProgressRefresh,
    onPatternInfoRefresh,
    shouldCheckResumablePattern,
    getPollInterval,
  ]);

  // Store poll function in ref for recursive setTimeout
  useEffect(() => {
    pollFunctionRef.current = poll;
  }, [poll]);

  const stopPolling = useCallback(() => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }

    if (serviceCountIntervalRef.current) {
      clearInterval(serviceCountIntervalRef.current);
      serviceCountIntervalRef.current = null;
    }

    setIsPolling(false);
  }, []);

  const startPolling = useCallback(() => {
    // Stop any existing polling
    stopPolling();

    // Start main polling
    const initialInterval = getPollInterval(machineStatus);
    pollTimeoutRef.current = setTimeout(poll, initialInterval);

    // Start service count polling (every 10 seconds)
    serviceCountIntervalRef.current = setInterval(onServiceCountRefresh, 10000);

    setIsPolling(true);
  }, [
    machineStatus,
    poll,
    stopPolling,
    getPollInterval,
    onServiceCountRefresh,
  ]);

  return {
    startPolling,
    stopPolling,
    isPolling,
  };
}
