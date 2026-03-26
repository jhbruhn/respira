/**
 * ProgressActions Component
 *
 * Renders action buttons (Resume Sewing, Start Sewing, Start Mask Trace)
 */

import { PlayIcon, ArrowPathIcon } from "@heroicons/react/24/solid";
import { Button } from "@/components/ui/button";
import { MachineStatus } from "../../types/machine";
import {
  canStartSewing,
  canStartMaskTrace,
  canResumeSewing,
} from "../../utils/machineStateHelpers";

interface ProgressActionsProps {
  machineStatus: MachineStatus;
  isDeleting: boolean;
  isMaskTraceComplete: boolean;
  hasSewingProgress: boolean;
  onResumeSewing: () => void;
  onStartSewing: () => void;
  onStartMaskTrace: () => void;
}

export function ProgressActions({
  machineStatus,
  isDeleting,
  isMaskTraceComplete,
  hasSewingProgress,
  onResumeSewing,
  onStartSewing,
  onStartMaskTrace,
}: ProgressActionsProps) {
  return (
    <div className="flex gap-2 flex-shrink-0">
      {/* Resume has highest priority when available */}
      {canResumeSewing(machineStatus) && (
        <Button
          onClick={onResumeSewing}
          disabled={isDeleting}
          className="flex-1"
          aria-label="Resume sewing the current pattern"
        >
          <PlayIcon className="w-3.5 h-3.5" />
          Resume Sewing
        </Button>
      )}

      {/* Start Sewing - primary action, takes more space */}
      {canStartSewing(machineStatus) && !canResumeSewing(machineStatus) && (
        <Button
          onClick={onStartSewing}
          disabled={isDeleting}
          className="flex-[2]"
          aria-label="Start sewing the pattern"
        >
          <PlayIcon className="w-3.5 h-3.5" />
          Start Sewing
        </Button>
      )}

      {/* Start Mask Trace - secondary action */}
      {canStartMaskTrace(machineStatus, hasSewingProgress) && (
        <Button
          onClick={onStartMaskTrace}
          disabled={isDeleting}
          variant="outline"
          className="flex-1"
          aria-label={
            isMaskTraceComplete ? "Start mask trace again" : "Start mask trace"
          }
        >
          <ArrowPathIcon className="w-3.5 h-3.5" />
          {isMaskTraceComplete ? "Trace Again" : "Start Mask Trace"}
        </Button>
      )}
    </div>
  );
}
