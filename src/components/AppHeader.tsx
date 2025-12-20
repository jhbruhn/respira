import { useShallow } from "zustand/react/shallow";
import { useMachineStore } from "../stores/useMachineStore";
import { useUIStore } from "../stores/useUIStore";
import { WorkflowStepper } from "./WorkflowStepper";
import { ErrorPopoverContent } from "./ErrorPopover";
import { getStateVisualInfo } from "../utils/machineStateHelpers";
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
import { Popover, PopoverTrigger } from "@/components/ui/popover";
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

  return (
    <header className="bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 dark:from-primary-700 dark:via-primary-800 dark:to-primary-900 px-4 sm:px-6 lg:px-8 py-3 shadow-lg border-b-2 border-primary-900/20 dark:border-primary-800/30 flex-shrink-0">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 lg:gap-8 items-center">
        {/* Machine Connection Status - Responsive width column */}
        <div className="flex items-center gap-3 w-full lg:w-[280px]">
          <div
            className="w-2.5 h-2.5 bg-success-400 rounded-full animate-pulse shadow-lg shadow-success-400/50"
            style={{ visibility: isConnected ? "visible" : "hidden" }}
          ></div>
          <div
            className="w-2.5 h-2.5 bg-gray-400 rounded-full -ml-2.5"
            style={{ visibility: !isConnected ? "visible" : "hidden" }}
          ></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg lg:text-xl font-bold text-white leading-tight">
                Respira
              </h1>
              {isConnected && machineInfo?.serialNumber && (
                <span
                  className="text-xs text-primary-200 cursor-help"
                  title={`Serial: ${machineInfo.serialNumber}${
                    machineInfo.macAddress
                      ? `\nMAC: ${machineInfo.macAddress}`
                      : ""
                  }${
                    machineInfo.totalCount !== undefined
                      ? `\nTotal stitches: ${machineInfo.totalCount.toLocaleString()}`
                      : ""
                  }${
                    machineInfo.serviceCount !== undefined
                      ? `\nStitches since service: ${machineInfo.serviceCount.toLocaleString()}`
                      : ""
                  }`}
                >
                  • {machineInfo.serialNumber}
                </span>
              )}
              {isPolling && (
                <ArrowPathIcon
                  className="w-3.5 h-3.5 text-primary-200 animate-spin"
                  title="Auto-refreshing status"
                />
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
                    title="Disconnect from machine"
                    aria-label="Disconnect from machine"
                  >
                    <XMarkIcon className="w-3 h-3" />
                    Disconnect
                  </Button>
                  <Badge
                    variant="outline"
                    className="gap-1.5 px-2.5 py-1.5 sm:py-1 text-sm font-semibold bg-white/20 text-white border-white/30 flex-shrink-0"
                  >
                    <StatusIcon className="w-3 h-3" />
                    {machineStatusName}
                  </Badge>
                </>
              ) : (
                <p className="text-xs text-primary-200">Not Connected</p>
              )}

              {/* Error indicator - always render to prevent layout shift */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    variant="destructive"
                    className={cn(
                      "gap-1.5 flex-shrink-0",
                      machineErrorMessage || pyodideError
                        ? "animate-pulse hover:animate-none"
                        : "invisible pointer-events-none",
                    )}
                    title="Click to view error details"
                    aria-label="View error details"
                    disabled={!(machineErrorMessage || pyodideError)}
                  >
                    <ExclamationTriangleIcon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>
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
                          return `Machine Error`;
                        }

                        // Default fallback
                        return "Error";
                      })()}
                    </span>
                  </Button>
                </PopoverTrigger>

                {/* Error popover content */}
                {(machineErrorMessage || pyodideError) && (
                  <ErrorPopoverContent
                    machineError={machineError}
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
  );
}
