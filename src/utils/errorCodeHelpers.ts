/**
 * Brother PP1 Protocol Error Codes
 * Based on App/Asura.Core/Models/SewingMachineError.cs
 */

export const SewingMachineError = {
  NeedlePositionError: 0x00,
  SafetyError: 0x01,
  LowerThreadSafetyError: 0x02,
  LowerThreadFreeError: 0x03,
  RestartError10: 0x10,
  RestartError11: 0x11,
  RestartError12: 0x12,
  RestartError13: 0x13,
  RestartError14: 0x14,
  RestartError15: 0x15,
  RestartError16: 0x16,
  RestartError17: 0x17,
  RestartError18: 0x18,
  RestartError19: 0x19,
  RestartError1A: 0x1A,
  RestartError1B: 0x1B,
  RestartError1C: 0x1C,
  NeedlePlateError: 0x20,
  ThreadLeverError: 0x21,
  UpperThreadError: 0x60,
  LowerThreadError: 0x61,
  UpperThreadSewingStartError: 0x62,
  PRWiperError: 0x63,
  HoopError: 0x70,
  NoHoopError: 0x71,
  InitialHoopError: 0x72,
  RegularInspectionError: 0x80,
  Setting: 0x98,
  None: 0xDD,
  Unknown: 0xEE,
  OtherError: 0xFF,
} as const;

/**
 * Detailed error information with title, description, and solution steps
 */
interface ErrorInfo {
  title: string;
  description: string;
  solutions: string[];
  /** If true, this "error" is really just an informational step, not a real error */
  isInformational?: boolean;
}

/**
 * Detailed error messages with actionable solutions
 * Only errors with verified solutions are included here
 */
const ERROR_DETAILS: Record<number, ErrorInfo> = {
  [SewingMachineError.InitialHoopError]: {
    title: 'Machine Initialization Required',
    description: 'The hoop needs to be removed and an initial homing procedure must be performed.',
    solutions: [
      'Remove the embroidery hoop from the machine completely',
      'Press the Accept button',
      'Wait for the machine to complete its initialization (homing)',
      'Once initialization is complete, reattach the hoop',
      'The machine should now recognize the hoop correctly',
    ],
    isInformational: true, // This is a normal initialization step, not an error
  },
};

/**
 * Simple error titles for all error codes
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
  [SewingMachineError.InitialHoopError]: 'Initial Hoop Position Error',
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

/**
 * Get detailed error information including title, description, and solutions
 */
export function getErrorDetails(errorCode: number | undefined): ErrorInfo | null {
  // Handle undefined or null
  if (errorCode === undefined || errorCode === null) {
    return null;
  }

  // 0xDD (221) is the default "no error" value
  if (errorCode === SewingMachineError.None) {
    return null;
  }

  // Look up known error details with solutions
  const details = ERROR_DETAILS[errorCode];
  if (details) {
    return details;
  }

  // For errors without detailed solutions, return basic info
  const errorTitle = ERROR_MESSAGES[errorCode];
  if (errorTitle) {
    return {
      title: errorTitle,
      description: 'Please check the machine display for more information.',
      solutions: [
        'Consult your machine manual for specific troubleshooting steps',
        'Check the error code on the machine display',
        'Contact technical support if the problem persists',
      ],
    };
  }

  // Unknown error code
  return {
    title: `Machine Error 0x${errorCode.toString(16).toUpperCase().padStart(2, '0')}`,
    description: 'The machine has reported an error code that is not recognized.',
    solutions: [
      'Note the error code and consult your machine manual',
      'Turn the machine off and on again',
      'If error persists, contact technical support with this error code',
    ],
  };
}

/**
 * Export ErrorInfo type for use in other files
 */
export type { ErrorInfo };
