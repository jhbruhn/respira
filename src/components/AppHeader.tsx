import { useState, useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { useMachineStore } from "../stores/useMachineStore";
import { useUIStore } from "../stores/useUIStore";
import { usePrevious } from "../hooks/usePrevious";
import { WorkflowStepper } from "./WorkflowStepper";
import { ErrorPopoverContent } from "./ErrorPopover";
import {
  getStateVisualInfo,
  getStatusIndicatorState,
} from "../utils/machineStateHelpers";
import { hasError, getErrorDetails } from "../utils/errorCodeHelpers";
import {
  CheckCircleIcon,
  BoltIcon,
  PauseCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StatusIndicator from "@/components/ui/status-indicator";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const {
    isConnected,
    machineInfo,
    machineStatus,
    machineStatusName,
    machineError,
    error: machineErrorMessage,
    isPairingError,
    isCommunicating: isPolling,
    disconnect,
  } = useMachineStore(
    useShallow((state) => ({
      isConnected: state.isConnected,
      machineInfo: state.machineInfo,
      machineStatus: state.machineStatus,
      machineStatusName: state.machineStatusName,
      machineError: state.machineError,
      error: state.error,
      isPairingError: state.isPairingError,
      isCommunicating: state.isCommunicating,
      disconnect: state.disconnect,
    })),
  );

  const { pyodideError } = useUIStore(
    useShallow((state) => ({
      pyodideError: state.pyodideError,
    })),
  );

  // State management for error popover auto-open/close
  const [errorPopoverOpen, setErrorPopoverOpen] = useState(false);
  const [dismissedErrorCode, setDismissedErrorCode] = useState<number | null>(
    null,
  );

  // Track previous values for comparison
  const prevMachineError = usePrevious(machineError);
  const prevErrorMessage = usePrevious(machineErrorMessage);
  const prevPyodideError = usePrevious(pyodideError);

  // Get state visual info for header status badge
  const stateVisual = getStateVisualInfo(machineStatus);
  const stateIcons = {
    ready: CheckCircleIcon,
    active: BoltIcon,
    waiting: PauseCircleIcon,
    complete: CheckCircleIcon,
    interrupted: PauseCircleIcon,
    error: ExclamationTriangleIcon,
  };
  const StatusIcon = stateIcons[stateVisual.iconName];

  // Get connection indicator state (idle when disconnected, state-dependent when connected)
  const connectionIndicatorState = isConnected
    ? getStatusIndicatorState(machineStatus)
    : "idle";

  // Auto-open/close error popover based on error state changes
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // Check if there's any error now
    const hasAnyError =
      machineErrorMessage || pyodideError || hasError(machineError);
    // Check if there was any error before
    const hadAnyError =
      prevErrorMessage || prevPyodideError || hasError(prevMachineError);

    // Auto-open popover when new error appears
    const isNewMachineError =
      hasError(machineError) &&
      machineError !== prevMachineError &&
      machineError !== dismissedErrorCode;
    const isNewErrorMessage =
      machineErrorMessage && machineErrorMessage !== prevErrorMessage;
    const isNewPyodideError = pyodideError && pyodideError !== prevPyodideError;

    if (isNewMachineError || isNewErrorMessage || isNewPyodideError) {
      setErrorPopoverOpen(true);
    }

    // Auto-close popover when all errors are cleared
    if (!hasAnyError && hadAnyError) {
      setErrorPopoverOpen(false);
      setDismissedErrorCode(null); // Reset dismissed tracking
    }
  }, [
    machineError,
    machineErrorMessage,
    pyodideError,
    dismissedErrorCode,
    prevMachineError,
    prevErrorMessage,
    prevPyodideError,
  ]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Handle manual popover dismiss
  const handlePopoverOpenChange = (open: boolean) => {
    setErrorPopoverOpen(open);

    // If user manually closes it, remember the current error code to prevent reopening
    if (!open && hasError(machineError)) {
      setDismissedErrorCode(machineError);
    }
  };

  return (
    <TooltipProvider>
      <header className="bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 dark:from-primary-700 dark:via-primary-800 dark:to-primary-900 px-4 sm:px-6 lg:px-8 py-3 shadow-lg border-b-2 border-primary-900/20 dark:border-primary-800/30 flex-shrink-0">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 lg:gap-8 items-center">
          {/* Machine Connection Status - Responsive width column */}
          <div className="flex items-center gap-3 w-full lg:w-[280px]">
            <StatusIndicator state={connectionIndicatorState} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg lg:text-xl font-bold text-white leading-tight">
                  Respira
                </h1>
                {isConnected && machineInfo?.serialNumber && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-xs text-primary-200 cursor-help">
                        • {machineInfo.serialNumber}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <div className="text-sm space-y-1">
                        <p className="font-semibold">
                          Serial: {machineInfo.serialNumber}
                        </p>
                        {machineInfo.macAddress && (
                          <p className="text-xs">
                            MAC: {machineInfo.macAddress}
                          </p>
                        )}
                        {machineInfo.totalCount !== undefined && (
                          <p className="text-xs">
                            Total stitches:{" "}
                            {machineInfo.totalCount.toLocaleString()}
                          </p>
                        )}
                        {machineInfo.serviceCount !== undefined && (
                          <p className="text-xs">
                            Stitches since service:{" "}
                            {machineInfo.serviceCount.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
                {isPolling && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <ArrowPathIcon className="w-3.5 h-3.5 text-primary-200 animate-spin" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Auto-refreshing machine status</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 min-h-[32px]">
                {isConnected ? (
                  <>
                    <Button
                      onClick={disconnect}
                      size="sm"
                      variant="outline"
                      className="gap-1.5 bg-white/10 hover:bg-danger-600 text-primary-100 hover:text-white border-white/20 hover:border-danger-600 flex-shrink-0"
                      aria-label="Disconnect from machine"
                    >
                      <XMarkIcon className="w-3 h-3" />
                      Disconnect
                    </Button>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="outline"
                          className="gap-1.5 px-2.5 py-1.5 sm:py-1 text-sm font-semibold bg-white/20 text-white border-white/30 flex-shrink-0 cursor-help"
                        >
                          <StatusIcon className="w-3 h-3" />
                          {machineStatusName}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">{stateVisual.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </>
                ) : (
                  <p className="text-xs text-primary-200">Not Connected</p>
                )}

                {/* Error indicator - always render to prevent layout shift */}
                <Popover
                  open={errorPopoverOpen}
                  onOpenChange={handlePopoverOpenChange}
                >
                  <PopoverTrigger asChild>
                    <button
                      className={cn(
                        "inline-flex items-center rounded-full border border-transparent bg-destructive text-white px-2.5 py-1.5 text-xs font-semibold gap-1.5 cursor-pointer hover:bg-destructive/90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2",
                        machineErrorMessage || pyodideError
                          ? "animate-pulse hover:animate-none"
                          : "invisible pointer-events-none",
                      )}
                      aria-label="View error details"
                    >
                      <ExclamationTriangleIcon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="font-semibold">
                        {(() => {
                          if (pyodideError) return "Python Error";
                          if (isPairingError) return "Pairing Required";

                          const errorMsg = machineErrorMessage || "";

                          // Categorize by error message content
                          if (
                            errorMsg.toLowerCase().includes("bluetooth") ||
                            errorMsg.toLowerCase().includes("connection")
                          ) {
                            return "Connection Error";
                          }
                          if (errorMsg.toLowerCase().includes("upload")) {
                            return "Upload Error";
                          }
                          if (errorMsg.toLowerCase().includes("pattern")) {
                            return "Pattern Error";
                          }
                          if (machineError !== undefined) {
                            // Get short name from error details
                            const errorDetails = getErrorDetails(machineError);
                            return errorDetails?.shortName || "Machine Error";
                          }

                          // Default fallback
                          return "Error";
                        })()}
                      </span>
                    </button>
                  </PopoverTrigger>

                  {/* Error popover content - unchanged */}
                  {(machineErrorMessage || pyodideError) && (
                    <ErrorPopoverContent
                      machineError={
                        machineError != 0xdd ? machineError : undefined
                      }
                      isPairingError={isPairingError}
                      errorMessage={machineErrorMessage}
                      pyodideError={pyodideError}
                    />
                  )}
                </Popover>
              </div>
            </div>
          </div>

          {/* Workflow Stepper - Flexible width column */}
          <div>
            <WorkflowStepper />
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}
