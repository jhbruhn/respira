/**
 * useErrorPopoverState Hook
 *
 * Manages error popover state with sophisticated auto-open/close behavior.
 * Automatically opens when new errors appear and closes when all errors are cleared.
 * Tracks manual dismissal to prevent reopening for the same error.
 *
 * This hook is designed for multi-source error handling (e.g., machine errors,
 * pyodide errors, error messages) and provides a consistent UX for error notification.
 *
 * @param options - Configuration options
 * @param options.machineError - Current machine error code
 * @param options.machineErrorMessage - Current machine error message
 * @param options.pyodideError - Current Pyodide error message
 * @param options.hasError - Function to check if an error code represents an error
 * @returns Object containing popover state and control functions
 *
 * @example
 * ```tsx
 * const { isOpen, handleOpenChange } = useErrorPopoverState({
 *   machineError,
 *   machineErrorMessage,
 *   pyodideError,
 *   hasError: (code) => code !== 0 && code !== undefined
 * });
 *
 * return (
 *   <Popover open={isOpen} onOpenChange={handleOpenChange}>
 *     <PopoverContent>{errorMessage}</PopoverContent>
 *   </Popover>
 * );
 * ```
 */

import { useState, useEffect } from "react";
import { usePrevious } from "../utility/usePrevious";

export interface UseErrorPopoverStateOptions {
  machineError: number | undefined;
  machineErrorMessage: string | null;
  pyodideError: string | null;
  hasError: (error: number | undefined) => boolean;
}

export interface UseErrorPopoverStateReturn {
  isOpen: boolean;
  handleOpenChange: (open: boolean) => void;
  dismissedErrorCode: number | null;
  wasManuallyDismissed: boolean;
}

export function useErrorPopoverState(
  options: UseErrorPopoverStateOptions,
): UseErrorPopoverStateReturn {
  const { machineError, machineErrorMessage, pyodideError, hasError } = options;

  // Internal state
  const [isOpen, setIsOpen] = useState(false);
  const [dismissedErrorCode, setDismissedErrorCode] = useState<number | null>(
    null,
  );
  const [wasManuallyDismissed, setWasManuallyDismissed] = useState(false);

  // Track previous values for comparison
  const prevMachineError = usePrevious(machineError);
  const prevErrorMessage = usePrevious(machineErrorMessage);
  const prevPyodideError = usePrevious(pyodideError);

  // Auto-open/close logic
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // Check if there's any error now
    const hasAnyError =
      machineErrorMessage || pyodideError || hasError(machineError);
    // Check if there was any error before
    const hadAnyError =
      prevErrorMessage || prevPyodideError || hasError(prevMachineError);

    // Auto-open popover when new error appears (but not if user manually dismissed)
    const isNewMachineError =
      hasError(machineError) &&
      machineError !== prevMachineError &&
      machineError !== dismissedErrorCode;
    const isNewErrorMessage =
      machineErrorMessage && machineErrorMessage !== prevErrorMessage;
    const isNewPyodideError = pyodideError && pyodideError !== prevPyodideError;

    if (
      !wasManuallyDismissed &&
      (isNewMachineError || isNewErrorMessage || isNewPyodideError)
    ) {
      setIsOpen(true);
    }

    // Auto-close popover when all errors are cleared
    if (!hasAnyError && hadAnyError) {
      setIsOpen(false);
      setDismissedErrorCode(null); // Reset dismissed tracking
      setWasManuallyDismissed(false); // Reset manual dismissal flag
    }
  }, [
    machineError,
    machineErrorMessage,
    pyodideError,
    dismissedErrorCode,
    wasManuallyDismissed,
    prevMachineError,
    prevErrorMessage,
    prevPyodideError,
    hasError,
  ]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Handle manual popover dismiss
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);

    // If user manually closes it while any error is present, remember this to prevent reopening
    if (
      !open &&
      (hasError(machineError) || machineErrorMessage || pyodideError)
    ) {
      setWasManuallyDismissed(true);
      // Also track the specific machine error code if present
      if (hasError(machineError)) {
        setDismissedErrorCode(machineError);
      }
    }
  };

  return {
    isOpen,
    handleOpenChange,
    dismissedErrorCode,
    wasManuallyDismissed,
  };
}
