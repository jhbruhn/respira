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
  RestartError1A: 0x1a,
  RestartError1B: 0x1b,
  RestartError1C: 0x1c,
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
  None: 0xdd,
  Unknown: 0xee,
  OtherError: 0xff,
} as const;

/**
 * Detailed error information with title, description, and solution steps
 */
interface ErrorInfo {
  title: string;
  /** Short name for badge display (max 15 characters) */
  shortName: string;
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
  [SewingMachineError.NeedlePositionError]: {
    title: "The Needle is Down",
    shortName: "Needle Down",
    description:
      "The needle is in the down position and needs to be raised before continuing.",
    solutions: ["Press the needle position switch to raise the needle"],
  },
  [SewingMachineError.SafetyError]: {
    title: "Safety Error",
    shortName: "Safety Error",
    description: "The machine is sensing an operational issue.",
    solutions: [
      "Remove the thread on the top of the fabric and then remove the needle",
      "Remove the thread on the underside of the fabric and clean the bobbin case of all threads",
      "Check the bobbin case for scratches or contamination",
      "Insert the embroidery needle",
      "Check that the bobbin is inserted correctly",
    ],
  },
  [SewingMachineError.LowerThreadSafetyError]: {
    title: "Lower Thread Safety Error",
    shortName: "Lower Thread",
    description: "The bobbin winder safety device is activated.",
    solutions: ["Check if the thread is tangled"],
  },
  [SewingMachineError.LowerThreadFreeError]: {
    title: "Lower Thread Free Error",
    shortName: "Lower Thread",
    description: "Problem with lower thread.",
    solutions: ["Slide the bobbin winder shaft toward the front"],
  },
  [SewingMachineError.RestartError10]: {
    title: "Restart Required",
    shortName: "Restart Needed",
    description: "A malfunction occurred.",
    solutions: ["Turn the machine off, then on again"],
  },
  [SewingMachineError.RestartError11]: {
    title: "Restart Required (M519411)",
    shortName: "Restart Needed",
    description: "A malfunction occurred. Error code: M519411",
    solutions: [
      "Turn the machine off, then on again",
      "If the problem persists, note error code M519411 and contact technical support",
    ],
  },
  [SewingMachineError.RestartError12]: {
    title: "Restart Required (M519412)",
    shortName: "Restart Needed",
    description: "A malfunction occurred. Error code: M519412",
    solutions: [
      "Turn the machine off, then on again",
      "If the problem persists, note error code M519412 and contact technical support",
    ],
  },
  [SewingMachineError.RestartError13]: {
    title: "Restart Required (M519413)",
    shortName: "Restart Needed",
    description: "A malfunction occurred. Error code: M519413",
    solutions: [
      "Turn the machine off, then on again",
      "If the problem persists, note error code M519413 and contact technical support",
    ],
  },
  [SewingMachineError.RestartError14]: {
    title: "Restart Required (M519414)",
    shortName: "Restart Needed",
    description: "A malfunction occurred. Error code: M519414",
    solutions: [
      "Turn the machine off, then on again",
      "If the problem persists, note error code M519414 and contact technical support",
    ],
  },
  [SewingMachineError.RestartError15]: {
    title: "Restart Required (M519415)",
    shortName: "Restart Needed",
    description: "A malfunction occurred. Error code: M519415",
    solutions: [
      "Turn the machine off, then on again",
      "If the problem persists, note error code M519415 and contact technical support",
    ],
  },
  [SewingMachineError.RestartError16]: {
    title: "Restart Required (M519416)",
    shortName: "Restart Needed",
    description: "A malfunction occurred. Error code: M519416",
    solutions: [
      "Turn the machine off, then on again",
      "If the problem persists, note error code M519416 and contact technical support",
    ],
  },
  [SewingMachineError.RestartError17]: {
    title: "Restart Required (M519417)",
    shortName: "Restart Needed",
    description: "A malfunction occurred. Error code: M519417",
    solutions: [
      "Turn the machine off, then on again",
      "If the problem persists, note error code M519417 and contact technical support",
    ],
  },
  [SewingMachineError.RestartError18]: {
    title: "Restart Required (M519418)",
    shortName: "Restart Needed",
    description: "A malfunction occurred. Error code: M519418",
    solutions: [
      "Turn the machine off, then on again",
      "If the problem persists, note error code M519418 and contact technical support",
    ],
  },
  [SewingMachineError.RestartError19]: {
    title: "Restart Required (M519419)",
    shortName: "Restart Needed",
    description: "A malfunction occurred. Error code: M519419",
    solutions: [
      "Turn the machine off, then on again",
      "If the problem persists, note error code M519419 and contact technical support",
    ],
  },
  [SewingMachineError.RestartError1A]: {
    title: "Restart Required (M51941A)",
    shortName: "Restart Needed",
    description: "A malfunction occurred. Error code: M51941A",
    solutions: [
      "Turn the machine off, then on again",
      "If the problem persists, note error code M51941A and contact technical support",
    ],
  },
  [SewingMachineError.RestartError1B]: {
    title: "Restart Required (M51941B)",
    shortName: "Restart Needed",
    description: "A malfunction occurred. Error code: M51941B",
    solutions: [
      "Turn the machine off, then on again",
      "If the problem persists, note error code M51941B and contact technical support",
    ],
  },
  [SewingMachineError.RestartError1C]: {
    title: "Restart Required (M51941C)",
    shortName: "Restart Needed",
    description: "A malfunction occurred. Error code: M51941C",
    solutions: [
      "Turn the machine off, then on again",
      "If the problem persists, note error code M51941C and contact technical support",
    ],
  },
  [SewingMachineError.NeedlePlateError]: {
    title: "Needle Plate Error",
    shortName: "Needle Plate",
    description: "Check the needle plate cover.",
    solutions: [
      "Reattach the needle plate cover",
      "Check the bobbin case (for misalignment, scratches, etc.) and then reattach the needle plate cover",
    ],
  },
  [SewingMachineError.ThreadLeverError]: {
    title: "Thread Lever Error",
    shortName: "Thread Lever",
    description: "The needle threading lever is not in its original position.",
    solutions: ["Return the needle threading lever to its original position"],
  },
  [SewingMachineError.UpperThreadError]: {
    title: "Upper Thread Error",
    shortName: "Upper Thread",
    description: "Check and rethread the upper thread.",
    solutions: [
      "Check the upper thread and rethread it",
      "If the problem persists, replace the embroidery needle, then check the upper thread and rethread it",
    ],
  },
  [SewingMachineError.LowerThreadError]: {
    title: "Lower Thread Error",
    shortName: "Lower Thread",
    description: "The bobbin thread is almost empty.",
    solutions: [
      "Replace the bobbin thread",
      "Wind the thread onto the empty bobbin in the correct way, then insert the bobbin",
    ],
  },
  [SewingMachineError.UpperThreadSewingStartError]: {
    title: "Upper Thread Error at Sewing Start",
    shortName: "Upper Thread",
    description: "Check and rethread the upper thread.",
    solutions: [
      "Press the Accept button to resolve the error",
      "Check the upper thread and rethread it",
      "If the problem persists, replace the embroidery needle, then check the upper thread and rethread it",
    ],
  },
  [SewingMachineError.PRWiperError]: {
    title: "PR Wiper Error",
    shortName: "PR Wiper",
    description: "PR Wiper Error.",
    solutions: ["Press the Accept button to resolve the error"],
  },
  [SewingMachineError.HoopError]: {
    title: "Hoop Error",
    shortName: "Hoop Error",
    description: "This embroidery frame cannot be used.",
    solutions: ["Use another frame that fits the pattern"],
  },
  [SewingMachineError.NoHoopError]: {
    title: "No Hoop Detected",
    shortName: "No Hoop",
    description: "No hoop attached.",
    solutions: ["Attach the embroidery hoop"],
  },
  [SewingMachineError.InitialHoopError]: {
    title: "Machine Initialization Required",
    shortName: "Init Required",
    description: "An initial homing procedure must be performed.",
    solutions: [
      "Remove the embroidery hoop from the machine completely",
      "Press the Accept button",
      "Wait for the machine to complete its initialization (homing)",
      "Once initialization is complete, reattach the hoop",
      "The machine should now recognize the hoop correctly",
    ],
    isInformational: true, // This is a normal initialization step, not an error
  },
  [SewingMachineError.RegularInspectionError]: {
    title: "Regular Inspection Required",
    shortName: "Inspection Due",
    description:
      "Preventive maintenance is recommended. This message is displayed when maintenance is due.",
    solutions: ["Please contact the service center"],
  },
  [SewingMachineError.Setting]: {
    title: "Settings Error",
    shortName: "Settings Error",
    description: "Stitch count cannot be changed.",
    solutions: ["This setting cannot be modified at this time"],
  },
};

/**
 * Simple error titles for all error codes
 */
const ERROR_MESSAGES: Record<number, string> = {
  [SewingMachineError.NeedlePositionError]: "Needle Position Error",
  [SewingMachineError.SafetyError]: "Safety Error",
  [SewingMachineError.LowerThreadSafetyError]: "Lower Thread Safety Error",
  [SewingMachineError.LowerThreadFreeError]: "Lower Thread Free Error",
  [SewingMachineError.RestartError10]: "Restart Required (0x10)",
  [SewingMachineError.RestartError11]: "Restart Required (0x11)",
  [SewingMachineError.RestartError12]: "Restart Required (0x12)",
  [SewingMachineError.RestartError13]: "Restart Required (0x13)",
  [SewingMachineError.RestartError14]: "Restart Required (0x14)",
  [SewingMachineError.RestartError15]: "Restart Required (0x15)",
  [SewingMachineError.RestartError16]: "Restart Required (0x16)",
  [SewingMachineError.RestartError17]: "Restart Required (0x17)",
  [SewingMachineError.RestartError18]: "Restart Required (0x18)",
  [SewingMachineError.RestartError19]: "Restart Required (0x19)",
  [SewingMachineError.RestartError1A]: "Restart Required (0x1A)",
  [SewingMachineError.RestartError1B]: "Restart Required (0x1B)",
  [SewingMachineError.RestartError1C]: "Restart Required (0x1C)",
  [SewingMachineError.NeedlePlateError]: "Needle Plate Error",
  [SewingMachineError.ThreadLeverError]: "Thread Lever Error",
  [SewingMachineError.UpperThreadError]: "Upper Thread Error",
  [SewingMachineError.LowerThreadError]: "Lower Thread Error",
  [SewingMachineError.UpperThreadSewingStartError]:
    "Upper Thread Error at Sewing Start",
  [SewingMachineError.PRWiperError]: "PR Wiper Error",
  [SewingMachineError.HoopError]: "Hoop Error",
  [SewingMachineError.NoHoopError]: "No Hoop Detected",
  [SewingMachineError.InitialHoopError]: "Initial Hoop Position Error",
  [SewingMachineError.RegularInspectionError]: "Regular Inspection Required",
  [SewingMachineError.Setting]: "Settings Error",
  [SewingMachineError.Unknown]: "Unknown Error",
  [SewingMachineError.OtherError]: "Other Error",
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
  return `Machine Error ${errorCode} (0x${errorCode.toString(16).toUpperCase().padStart(2, "0")})`;
}

/**
 * Check if error code represents an actual error condition
 */
export function hasError(errorCode: number | undefined): boolean {
  return (
    errorCode !== undefined &&
    errorCode !== null &&
    errorCode !== SewingMachineError.None
  );
}

/**
 * Get detailed error information including title, description, and solutions
 */
export function getErrorDetails(
  errorCode: number | undefined,
): ErrorInfo | null {
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
      description: "Please check the machine display for more information.",
      solutions: [
        "Consult your machine manual for specific troubleshooting steps",
        "Check the error code on the machine display",
        "Contact technical support if the problem persists",
      ],
    };
  }

  // Unknown error code
  return {
    title: `Machine Error 0x${errorCode.toString(16).toUpperCase().padStart(2, "0")}`,
    description:
      "The machine has reported an error code that is not recognized.",
    solutions: [
      "Note the error code and consult your machine manual",
      "Turn the machine off and on again",
      "If error persists, contact technical support with this error code",
    ],
  };
}

/**
 * Export ErrorInfo type for use in other files
 */
export type { ErrorInfo };
