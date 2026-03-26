/**
 * StitchStepControl Component
 *
 * Compact stitch position control shown when machine is paused/stopped/interrupted.
 * Allows stepping forward/backward by 1, 10, or 100 stitches,
 * jumping to thread color boundaries, and resetting to current position.
 */

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  SwatchIcon,
  ArrowUturnLeftIcon,
} from "@heroicons/react/24/solid";
import { Button } from "@/components/ui/button";
import {
  getErrorStitchRollback,
  getErrorMessage,
} from "../../utils/errorCodeHelpers";
import type { ColorBlock } from "./types";
import { findCurrentBlockIndex } from "../../utils/colorBlockHelpers";

interface StitchStepControlProps {
  currentStitch: number;
  adjustedStitchIndex: number | null;
  pausedStitchIndex: number | null;
  totalStitches: number;
  lastRolledBackError: number | null;
  colorBlocks: ColorBlock[];
  onAdjustPosition: (offset: number) => void;
  onSetPosition: (index: number) => void;
}

export function StitchStepControl({
  currentStitch,
  adjustedStitchIndex,
  pausedStitchIndex,
  totalStitches,
  lastRolledBackError,
  colorBlocks,
  onAdjustPosition,
  onSetPosition,
}: StitchStepControlProps) {
  const displayStitch = adjustedStitchIndex ?? currentStitch;

  const handleGoToThreadStart = () => {
    const blockIndex = findCurrentBlockIndex(colorBlocks, displayStitch);
    if (blockIndex >= 0) {
      onSetPosition(colorBlocks[blockIndex].startStitch);
    }
  };

  const handleGoToPausedStitch = () => {
    if (pausedStitchIndex !== null) {
      onSetPosition(pausedStitchIndex);
    }
  };

  const rollbackAmount = lastRolledBackError
    ? getErrorStitchRollback(lastRolledBackError)
    : null;
  const rollbackErrorName = lastRolledBackError
    ? getErrorMessage(lastRolledBackError)
    : null;

  const showGoToPaused =
    pausedStitchIndex !== null && displayStitch !== pausedStitchIndex;

  return (
    <div className="mb-3 bg-gray-200 dark:bg-gray-700/50 px-3 py-2 rounded-lg">
      {/* Header: label + stitch count on one line */}
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          Stitch Position
        </span>
        <span>
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">
            {displayStitch.toLocaleString()}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
            / {totalStitches.toLocaleString()}
          </span>
        </span>
      </div>

      {/* Rollback info */}
      {rollbackAmount !== null && rollbackErrorName && (
        <div className="text-xs text-amber-600 dark:text-amber-400 text-center mb-1.5">
          Moved back {rollbackAmount} stitches (
          {rollbackErrorName.toLowerCase()})
        </div>
      )}

      {/* Step buttons + navigation in one row */}
      <div className="flex items-center justify-center gap-1">
        {colorBlocks.length > 0 && (
          <Button
            variant="outline"
            size="icon-sm"
            onClick={handleGoToThreadStart}
            title="Go to the beginning of the selected thread color"
            aria-label="Go to the beginning of the selected thread color"
          >
            <SwatchIcon className="w-4 h-4" />
          </Button>
        )}

        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onAdjustPosition(-100)}
          disabled={displayStitch <= 0}
          aria-label="Back 100 stitches"
          title="-100"
        >
          <ChevronDoubleLeftIcon className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onAdjustPosition(-10)}
          disabled={displayStitch <= 0}
          aria-label="Back 10 stitches"
          title="-10"
        >
          <ChevronLeftIcon className="w-4 h-4 -mr-1" />
          <ChevronLeftIcon className="w-4 h-4 -ml-1" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onAdjustPosition(-1)}
          disabled={displayStitch <= 0}
          aria-label="Back 1 stitch"
          title="-1"
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </Button>

        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onAdjustPosition(1)}
          disabled={displayStitch >= totalStitches}
          aria-label="Forward 1 stitch"
          title="+1"
        >
          <ChevronRightIcon className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onAdjustPosition(10)}
          disabled={displayStitch >= totalStitches}
          aria-label="Forward 10 stitches"
          title="+10"
        >
          <ChevronRightIcon className="w-4 h-4 -mr-1" />
          <ChevronRightIcon className="w-4 h-4 -ml-1" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onAdjustPosition(100)}
          disabled={displayStitch >= totalStitches}
          aria-label="Forward 100 stitches"
          title="+100"
        >
          <ChevronDoubleRightIcon className="w-4 h-4" />
        </Button>

        <Button
          variant="outline"
          size="icon-sm"
          onClick={handleGoToPausedStitch}
          disabled={!showGoToPaused}
          title="Go to the current stitch"
          aria-label="Go to the current stitch"
        >
          <ArrowUturnLeftIcon className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
