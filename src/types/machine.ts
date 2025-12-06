// Brother PP1 Machine Types

export const MachineStatus = {
  Initial: 0x00,
  LowerThread: 0x01,
  IDLE: 0x10,
  SEWING_WAIT: 0x11,
  SEWING_DATA_RECEIVE: 0x12,
  MASK_TRACE_LOCK_WAIT: 0x20,
  MASK_TRACING: 0x21,
  MASK_TRACE_COMPLETE: 0x22,
  SEWING: 0x30,
  SEWING_COMPLETE: 0x31,
  SEWING_INTERRUPTION: 0x32,
  COLOR_CHANGE_WAIT: 0x40,
  PAUSE: 0x41,
  STOP: 0x42,
  HOOP_AVOIDANCE: 0x50,
  HOOP_AVOIDANCEING: 0x51,
  RL_RECEIVING: 0x60,
  RL_RECEIVED: 0x61,
  None: 0xDD,
  TryConnecting: 0xFF,
} as const;

export type MachineStatus = typeof MachineStatus[keyof typeof MachineStatus];

export const MachineStatusNames: Record<MachineStatus, string> = {
  [MachineStatus.Initial]: 'Initial',
  [MachineStatus.LowerThread]: 'Lower Thread',
  [MachineStatus.IDLE]: 'Idle',
  [MachineStatus.SEWING_WAIT]: 'Ready to Sew',
  [MachineStatus.SEWING_DATA_RECEIVE]: 'Receiving Data',
  [MachineStatus.MASK_TRACE_LOCK_WAIT]: 'Waiting for Mask Trace',
  [MachineStatus.MASK_TRACING]: 'Mask Tracing',
  [MachineStatus.MASK_TRACE_COMPLETE]: 'Mask Trace Complete',
  [MachineStatus.SEWING]: 'Sewing',
  [MachineStatus.SEWING_COMPLETE]: 'Complete',
  [MachineStatus.SEWING_INTERRUPTION]: 'Interrupted',
  [MachineStatus.COLOR_CHANGE_WAIT]: 'Waiting for Color Change',
  [MachineStatus.PAUSE]: 'Paused',
  [MachineStatus.STOP]: 'Stopped',
  [MachineStatus.HOOP_AVOIDANCE]: 'Hoop Avoidance',
  [MachineStatus.HOOP_AVOIDANCEING]: 'Hoop Avoidance In Progress',
  [MachineStatus.RL_RECEIVING]: 'RL Receiving',
  [MachineStatus.RL_RECEIVED]: 'RL Received',
  [MachineStatus.None]: 'None',
  [MachineStatus.TryConnecting]: 'Connecting',
};

export interface MachineInfo {
  serialNumber: string;
  modelNumber: string;
  softwareVersion: string;
  bluetoothVersion: number;
  maxWidth: number; // in 0.1mm units
  maxHeight: number; // in 0.1mm units
  macAddress: string;
  serviceCount?: number; // Cumulative service counter
  totalCount?: number; // Total stitches sewn by machine
}

export interface PatternInfo {
  totalStitches: number;
  totalTime: number; // seconds
  speed: number; // stitches per minute
  boundLeft: number;
  boundTop: number;
  boundRight: number;
  boundBottom: number;
}

export interface SewingProgress {
  currentStitch: number;
  currentTime: number; // seconds
  stopTime: number;
  positionX: number; // in 0.1mm units
  positionY: number; // in 0.1mm units
}

export interface PenStitch {
  x: number;
  y: number;
  flags: number;
  isJump: boolean;
}

export interface PenColorBlock {
  startStitch: number;
  endStitch: number;
  colorIndex: number;
}

export interface PenData {
  stitches: PenStitch[];
  colorBlocks: PenColorBlock[];
  totalStitches: number;
  colorCount: number;
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}
