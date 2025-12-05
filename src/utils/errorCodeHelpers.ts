/**
 * Brother PP1 Protocol Error Codes
 * Based on App/Asura.Core/Models/SewingMachineError.cs
 */

export enum SewingMachineError {
  NeedlePositionError = 0x00,
  SafetyError = 0x01,
  LowerThreadSafetyError = 0x02,
  LowerThreadFreeError = 0x03,
  RestartError10 = 0x10,
  RestartError11 = 0x11,
  RestartError12 = 0x12,
  RestartError13 = 0x13,
  RestartError14 = 0x14,
  RestartError15 = 0x15,
  RestartError16 = 0x16,
  RestartError17 = 0x17,
  RestartError18 = 0x18,
  RestartError19 = 0x19,
  RestartError1A = 0x1A,
  RestartError1B = 0x1B,
  RestartError1C = 0x1C,
  NeedlePlateError = 0x20,
  ThreadLeverError = 0x21,
  UpperThreadError = 0x60,
  LowerThreadError = 0x61,
  UpperThreadSewingStartError = 0x62,
  PRWiperError = 0x63,
  HoopError = 0x70,
  NoHoopError = 0x71,
  InitialHoopError = 0x72,
  RegularInspectionError = 0x80,
  Setting = 0x98,
  None = 0xDD,
  Unknown = 0xEE,
  OtherError = 0xFF,
}

/**
 * Human-readable error messages
 */
const ERROR_MESSAGES: Record<number, string> = {
  [SewingMachineError.NeedlePositionError]: 'Needle Position Error',
  [SewingMachineError.SafetyError]: 'Safety Error',
  [SewingMachineError.LowerThreadSafetyError]: 'Lower Thread Safety Error',
  [SewingMachineError.LowerThreadFreeError]: 'Lower Thread Free Error',
  [SewingMachineError.RestartError10]: 'Restart Required (0x10)',
  [SewingMachineError.RestartError11]: 'Restart Required (0x11)',
  [SewingMachineError.RestartError12]: 'Restart Required (0x12)',
  [SewingMachineError.RestartError13]: 'Restart Required (0x13)',
  [SewingMachineError.RestartError14]: 'Restart Required (0x14)',
  [SewingMachineError.RestartError15]: 'Restart Required (0x15)',
  [SewingMachineError.RestartError16]: 'Restart Required (0x16)',
  [SewingMachineError.RestartError17]: 'Restart Required (0x17)',
  [SewingMachineError.RestartError18]: 'Restart Required (0x18)',
  [SewingMachineError.RestartError19]: 'Restart Required (0x19)',
  [SewingMachineError.RestartError1A]: 'Restart Required (0x1A)',
  [SewingMachineError.RestartError1B]: 'Restart Required (0x1B)',
  [SewingMachineError.RestartError1C]: 'Restart Required (0x1C)',
  [SewingMachineError.NeedlePlateError]: 'Needle Plate Error',
  [SewingMachineError.ThreadLeverError]: 'Thread Lever Error',
  [SewingMachineError.UpperThreadError]: 'Upper Thread Error',
  [SewingMachineError.LowerThreadError]: 'Lower Thread Error',
  [SewingMachineError.UpperThreadSewingStartError]: 'Upper Thread Error at Sewing Start',
  [SewingMachineError.PRWiperError]: 'PR Wiper Error',
  [SewingMachineError.HoopError]: 'Hoop Error',
  [SewingMachineError.NoHoopError]: 'No Hoop Detected',
  [SewingMachineError.InitialHoopError]: 'Initial Hoop Error',
  [SewingMachineError.RegularInspectionError]: 'Regular Inspection Required',
  [SewingMachineError.Setting]: 'Settings Error',
  [SewingMachineError.Unknown]: 'Unknown Error',
  [SewingMachineError.OtherError]: 'Other Error',
};

/**
 * Get human-readable error message for an error code
 */
export function getErrorMessage(errorCode: number | undefined): string | null {
  // Handle undefined or null
  if (errorCode === undefined || errorCode === null) {
    return null;
  }

  // 0xDD (221) is the default "no error" value
  if (errorCode === SewingMachineError.None) {
    return null; // No error to display
  }

  // Look up known error message
  const message = ERROR_MESSAGES[errorCode];
  if (message) {
    return message;
  }

  // Unknown error code
  return `Machine Error ${errorCode} (0x${errorCode.toString(16).toUpperCase().padStart(2, '0')})`;
}

/**
 * Check if error code represents an actual error condition
 */
export function hasError(errorCode: number | undefined): boolean {
  return errorCode !== undefined && errorCode !== null && errorCode !== SewingMachineError.None;
}
