/**
 * Workflow step calculation utilities
 *
 * Determines the current workflow step based on machine state and pattern status
 */

import { MachineStatus } from "../types/machine";

/**
 * Calculate the current workflow step based on machine state
 *
 * @param machineStatus - Current machine status
 * @param isConnected - Whether machine is connected
 * @param hasPattern - Whether a pattern is loaded
 * @param patternUploaded - Whether pattern has been uploaded to machine
 * @returns Current step number (1-8)
 */
export function getCurrentStep(
  machineStatus: MachineStatus,
  isConnected: boolean,
  hasPattern: boolean,
  patternUploaded: boolean,
): number {
  if (!isConnected) return 1;

  // Check if machine needs homing (Initial state)
  if (machineStatus === MachineStatus.Initial) return 2;

  if (!hasPattern) return 3;
  if (!patternUploaded) return 4;

  // After upload, determine step based on machine status
  switch (machineStatus) {
    case MachineStatus.IDLE:
    case MachineStatus.MASK_TRACE_LOCK_WAIT:
    case MachineStatus.MASK_TRACING:
      return 5;

    case MachineStatus.MASK_TRACE_COMPLETE:
    case MachineStatus.SEWING_WAIT:
      return 6;

    case MachineStatus.SEWING:
    case MachineStatus.COLOR_CHANGE_WAIT:
    case MachineStatus.PAUSE:
    case MachineStatus.STOP:
    case MachineStatus.SEWING_INTERRUPTION:
      return 7;

    case MachineStatus.SEWING_COMPLETE:
      return 8;

    default:
      return 5;
  }
}
