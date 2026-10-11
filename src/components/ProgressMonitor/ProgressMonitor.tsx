/**
 * ProgressMonitor Component
 *
 * Orchestrates progress monitoring UI with stats, progress bar, color blocks, and action buttons
 */

import { useMemo, useRef, useState } from "react";
import { useAutoScroll } from "@/hooks";
import { useShallow } from "zustand/react/shallow";
import { useMachineStore } from "../../stores/useMachineStore";
import { usePatternStore } from "../../stores/usePatternStore";
import { ChartBarIcon } from "@heroicons/react/24/solid";
import { MachineStatus } from "../../types/machine";
import { calculatePatternTime } from "../../utils/timeCalculation";
import {
  calculateColorBlocks,
  findCurrentBlockIndex,
} from "../../utils/colorBlockHelpers";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  canChooseStartBlock,
  canShowStepControl,
} from "../../utils/machineStateHelpers";
import { ProgressStats } from "./ProgressStats";
import { ProgressSection } from "./ProgressSection";
import { ColorBlockList } from "./ColorBlockList";
import { ProgressActions } from "./ProgressActions";
import { StitchStepControl } from "./StitchStepControl";

export function ProgressMonitor() {
  // Machine store
  const {
    machineStatus,
    patternInfo,
    sewingProgress,
    isDeleting,
    adjustedStitchIndex,
    lastRolledBackError,
    pausedStitchIndex,
    startMaskTrace,
    startSewing,
    resumeSewing,
    adjustStitchPosition,
    setStitchPosition,
  } = useMachineStore(
    useShallow((state) => ({
      machineStatus: state.machineStatus,
      patternInfo: state.patternInfo,
      sewingProgress: state.sewingProgress,
      isDeleting: state.isDeleting,
      adjustedStitchIndex: state.adjustedStitchIndex,
      lastRolledBackError: state.lastRolledBackError,
      pausedStitchIndex: state.pausedStitchIndex,
      startMaskTrace: state.startMaskTrace,
      startSewing: state.startSewing,
      resumeSewing: state.resumeSewing,
      adjustStitchPosition: state.adjustStitchPosition,
      setStitchPosition: state.setStitchPosition,
    })),
  );

  // Pattern store
  const pesData = usePatternStore((state) => state.pesData);
  const uploadedPesData = usePatternStore((state) => state.uploadedPesData);
  const displayPattern = uploadedPesData || pesData;

  // State indicators
  const isMaskTraceComplete =
    machineStatus === MachineStatus.MASK_TRACE_COMPLETE;

  // Use our own PEN stitch count as the source of truth for total stitches.
  // The machine's patternInfo.totalStitches uses a different counting method than
  // currentStitch (e.g. excludes lock stitches), so it can't be used as the max.
  const totalStitches = displayPattern?.penStitches
    ? displayPattern.penStitches.stitches.length
    : (patternInfo?.totalStitches ?? 0);

  // Use adjustedStitchIndex (from step control) when available, otherwise machine-reported
  const currentStitch =
    adjustedStitchIndex ?? sewingProgress?.currentStitch ?? 0;

  const progressPercent =
    totalStitches > 0 ? (currentStitch / totalStitches) * 100 : 0;

  // Calculate color block information from decoded penStitches
  const colorBlocks = useMemo(
    () => calculateColorBlocks(displayPattern),
    [displayPattern],
  );
  const currentBlockIndex = findCurrentBlockIndex(colorBlocks, currentStitch);

  // Calculate time based on color blocks (matches Brother app calculation)
  const { totalMinutes, elapsedMinutes } = useMemo(() => {
    if (colorBlocks.length === 0) {
      return { totalMinutes: 0, elapsedMinutes: 0 };
    }
    const result = calculatePatternTime(colorBlocks, currentStitch);
    return {
      totalMinutes: result.totalMinutes,
      elapsedMinutes: result.elapsedMinutes,
    };
  }, [colorBlocks, currentStitch]);

  // Opt-in "start from color block" mode: blocks become clickable and the step
  // control shows before the first start. Switched off automatically once the
  // machine leaves the states where a start point can be chosen (e.g. sewing).
  const canChooseStart = canChooseStartBlock(machineStatus);
  const [chooseStart, setChooseStart] = useState(false);
  const [prevCanChooseStart, setPrevCanChooseStart] = useState(canChooseStart);
  // Stitch position when the mode was switched on, restored when switched off
  const positionBeforeChooseRef = useRef<number | null>(null);
  if (canChooseStart !== prevCanChooseStart) {
    setPrevCanChooseStart(canChooseStart);
    if (!canChooseStart) setChooseStart(false);
  }
  const isChoosingStart = chooseStart && canChooseStart;

  const handleChooseStartChange = (enabled: boolean) => {
    setChooseStart(enabled);
    if (enabled) {
      positionBeforeChooseRef.current = currentStitch;
      return;
    }
    const previous = positionBeforeChooseRef.current;
    positionBeforeChooseRef.current = null;
    if (previous !== null && previous !== currentStitch) {
      setStitchPosition(previous, totalStitches);
    }
  };

  const showStepControl =
    canShowStepControl(machineStatus, currentStitch > 0) || isChoosingStart;

  // Auto-scroll to current block
  const currentBlockRef = useAutoScroll<HTMLDivElement>(currentBlockIndex);

  return (
    <Card className="p-0 gap-0 lg:h-full border-l-4 border-accent-600 dark:border-accent-500 flex flex-col lg:overflow-hidden">
      <CardHeader className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <ChartBarIcon className="w-6 h-6 text-accent-600 dark:text-accent-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm">Sewing Progress</CardTitle>
            {sewingProgress && (
              <CardDescription className="text-xs">
                {progressPercent.toFixed(1)}% complete
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pt-0 pb-4 flex-1 flex flex-col lg:overflow-hidden">
        {/* Pattern Info */}
        {patternInfo && (
          <ProgressStats
            currentStitch={currentStitch}
            totalStitches={totalStitches}
            elapsedMinutes={elapsedMinutes}
            totalMinutes={totalMinutes}
            speed={patternInfo.speed}
          />
        )}

        {/* Progress Bar */}
        {sewingProgress && (
          <ProgressSection progressPercent={progressPercent} />
        )}

        {/* Opt-in: start sewing from a chosen color block */}
        {canChooseStart && colorBlocks.length > 1 && (
          <div className="flex items-center justify-between gap-3 mb-3 flex-shrink-0">
            <label
              htmlFor="choose-start-block"
              className="text-xs text-gray-600 dark:text-gray-400"
            >
              Start from color block
            </label>
            <Switch
              id="choose-start-block"
              checked={isChoosingStart}
              onCheckedChange={handleChooseStartChange}
            />
          </div>
        )}

        {/* Color Blocks */}
        <ColorBlockList
          colorBlocks={colorBlocks}
          currentStitch={currentStitch}
          currentBlockIndex={currentBlockIndex}
          currentBlockRef={currentBlockRef}
          onSelectBlock={
            isChoosingStart
              ? (block) => setStitchPosition(block.startStitch, totalStitches)
              : undefined
          }
        />

        {/* Step control for paused/stopped/error states */}
        {showStepControl && (
          <StitchStepControl
            isBeforeStart={isChoosingStart}
            currentStitch={currentStitch}
            adjustedStitchIndex={adjustedStitchIndex}
            pausedStitchIndex={pausedStitchIndex}
            totalStitches={totalStitches}
            lastRolledBackError={lastRolledBackError}
            colorBlocks={colorBlocks}
            onAdjustPosition={(offset) =>
              adjustStitchPosition(offset, totalStitches)
            }
            onSetPosition={(index) => setStitchPosition(index, totalStitches)}
          />
        )}

        {/* Action buttons */}
        <ProgressActions
          machineStatus={machineStatus}
          isDeleting={isDeleting}
          isMaskTraceComplete={isMaskTraceComplete}
          hasSewingProgress={currentStitch > 0}
          onResumeSewing={resumeSewing}
          onStartSewing={startSewing}
          onStartMaskTrace={startMaskTrace}
        />
      </CardContent>
    </Card>
  );
}
