import { MachineStatus } from '../types/machine';

/**
 * Machine state categories for safety logic
 */
export const MachineStateCategory = {
  IDLE: 'idle',
  ACTIVE: 'active',
  WAITING: 'waiting',
  COMPLETE: 'complete',
  INTERRUPTED: 'interrupted',
  ERROR: 'error',
} as const;

export type MachineStateCategoryType = typeof MachineStateCategory[keyof typeof MachineStateCategory];

/**
 * Categorize a machine status into a semantic safety category
 */
export function getMachineStateCategory(status: MachineStatus): MachineStateCategoryType {
  switch (status) {
    // IDLE states - safe to perform any action
    case MachineStatus.IDLE:
    case MachineStatus.SEWING_WAIT:
    case MachineStatus.Initial:
    case MachineStatus.LowerThread:
      return MachineStateCategory.IDLE;

    // ACTIVE states - operation in progress, dangerous to interrupt
    case MachineStatus.SEWING:
    case MachineStatus.MASK_TRACING:
    case MachineStatus.SEWING_DATA_RECEIVE:
    case MachineStatus.HOOP_AVOIDANCEING:
      return MachineStateCategory.ACTIVE;

    // WAITING states - waiting for user/machine action
    case MachineStatus.COLOR_CHANGE_WAIT:
    case MachineStatus.MASK_TRACE_LOCK_WAIT:
    case MachineStatus.HOOP_AVOIDANCE:
      return MachineStateCategory.WAITING;

    // COMPLETE states - operation finished
    case MachineStatus.SEWING_COMPLETE:
    case MachineStatus.MASK_TRACE_COMPLETE:
    case MachineStatus.RL_RECEIVED:
      return MachineStateCategory.COMPLETE;

    // INTERRUPTED states - operation paused/stopped
    case MachineStatus.PAUSE:
    case MachineStatus.STOP:
    case MachineStatus.SEWING_INTERRUPTION:
      return MachineStateCategory.INTERRUPTED;

    // ERROR/UNKNOWN states
    case MachineStatus.None:
    case MachineStatus.TryConnecting:
    case MachineStatus.RL_RECEIVING:
    default:
      return MachineStateCategory.ERROR;
  }
}

/**
 * Determines if the pattern can be safely deleted in the current state.
 * Prevents deletion during active operations (SEWING, MASK_TRACING, etc.)
 */
export function canDeletePattern(status: MachineStatus): boolean {
  const category = getMachineStateCategory(status);
  // Can only delete in IDLE or COMPLETE states, never during ACTIVE operations
  return category === MachineStateCategory.IDLE ||
         category === MachineStateCategory.COMPLETE;
}

/**
 * Determines if a pattern can be safely uploaded in the current state.
 * Only allow uploads when machine is idle.
 */
export function canUploadPattern(status: MachineStatus): boolean {
  const category = getMachineStateCategory(status);
  // Can only upload in IDLE state
  return category === MachineStateCategory.IDLE;
}

/**
 * Determines if sewing can be started in the current state.
 * Allows starting from ready state or resuming from interrupted states.
 */
export function canStartSewing(status: MachineStatus): boolean {
  // Only in specific ready states
  return status === MachineStatus.SEWING_WAIT ||
         status === MachineStatus.MASK_TRACE_COMPLETE ||
         status === MachineStatus.PAUSE ||
         status === MachineStatus.STOP ||
         status === MachineStatus.SEWING_INTERRUPTION;
}

/**
 * Determines if mask trace can be started in the current state.
 */
export function canStartMaskTrace(status: MachineStatus): boolean {
  // Can start mask trace when IDLE (after upload), SEWING_WAIT, or after previous trace
  return status === MachineStatus.IDLE ||
         status === MachineStatus.SEWING_WAIT ||
         status === MachineStatus.MASK_TRACE_COMPLETE;
}

/**
 * Determines if sewing can be resumed in the current state.
 * Only for interrupted operations (PAUSE, STOP, SEWING_INTERRUPTION).
 */
export function canResumeSewing(status: MachineStatus): boolean {
  // Only in interrupted states
  const category = getMachineStateCategory(status);
  return category === MachineStateCategory.INTERRUPTED;
}

/**
 * Determines if disconnect should show a confirmation dialog.
 * Confirms if disconnecting during active operation or while waiting.
 */
export function shouldConfirmDisconnect(status: MachineStatus): boolean {
  const category = getMachineStateCategory(status);
  // Confirm if disconnecting during active operation or waiting for action
  return category === MachineStateCategory.ACTIVE ||
         category === MachineStateCategory.WAITING;
}

/**
 * Visual information for a machine state
 */
export interface StateVisualInfo {
  color: string;
  icon: string;
  label: string;
  description: string;
}

/**
 * Get visual styling information for a machine state.
 * Returns color, icon, label, and description for UI display.
 */
export function getStateVisualInfo(status: MachineStatus): StateVisualInfo {
  const category = getMachineStateCategory(status);

  // Map state category to visual properties
  const visualMap: Record<MachineStateCategoryType, StateVisualInfo> = {
    [MachineStateCategory.IDLE]: {
      color: 'info',
      icon: '⭕',
      label: 'Ready',
      description: 'Machine is idle and ready for operations'
    },
    [MachineStateCategory.ACTIVE]: {
      color: 'warning',
      icon: '▶️',
      label: 'Active',
      description: 'Operation in progress - do not interrupt'
    },
    [MachineStateCategory.WAITING]: {
      color: 'warning',
      icon: '⏸️',
      label: 'Waiting',
      description: 'Waiting for user or machine action'
    },
    [MachineStateCategory.COMPLETE]: {
      color: 'success',
      icon: '✅',
      label: 'Complete',
      description: 'Operation completed successfully'
    },
    [MachineStateCategory.INTERRUPTED]: {
      color: 'danger',
      icon: '⏹️',
      label: 'Interrupted',
      description: 'Operation paused or stopped'
    },
    [MachineStateCategory.ERROR]: {
      color: 'danger',
      icon: '❌',
      label: 'Error',
      description: 'Machine in error or unknown state'
    }
  };

  return visualMap[category];
}
