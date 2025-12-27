/**
 * ProgressMonitor Component
 *
 * Orchestrates progress monitoring UI with stats, progress bar, color blocks, and action buttons
 */

import { useMemo } from "react";
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
import { ProgressStats } from "./ProgressStats";
import { ProgressSection } from "./ProgressSection";
import { ColorBlockList } from "./ColorBlockList";
import { ProgressActions } from "./ProgressActions";

export function ProgressMonitor() {
  // Machine store
  const {
    machineStatus,
    patternInfo,
    sewingProgress,
    isDeleting,
    startMaskTrace,
    startSewing,
    resumeSewing,
  } = useMachineStore(
    useShallow((state) => ({
      machineStatus: state.machineStatus,
      patternInfo: state.patternInfo,
      sewingProgress: state.sewingProgress,
      isDeleting: state.isDeleting,
      startMaskTrace: state.startMaskTrace,
      startSewing: state.startSewing,
      resumeSewing: state.resumeSewing,
    })),
  );

  // Pattern store
  const pesData = usePatternStore((state) => state.pesData);
  const uploadedPesData = usePatternStore((state) => state.uploadedPesData);
  const displayPattern = uploadedPesData || pesData;

  // State indicators
  const isMaskTraceComplete =
    machineStatus === MachineStatus.MASK_TRACE_COMPLETE;

  // Use PEN stitch count as fallback when machine reports 0 total stitches
  const totalStitches = patternInfo
    ? patternInfo.totalStitches === 0 && displayPattern?.penStitches
      ? displayPattern.penStitches.stitches.length
      : patternInfo.totalStitches
    : 0;

  const progressPercent =
    totalStitches > 0
      ? ((sewingProgress?.currentStitch || 0) / totalStitches) * 100
      : 0;

  // Calculate color block information from decoded penStitches
  const colorBlocks = useMemo(
    () => calculateColorBlocks(displayPattern),
    [displayPattern],
  );

  // Determine current color block based on current stitch
  const currentStitch = sewingProgress?.currentStitch || 0;
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
            totalStitches={totalStitches}
            totalMinutes={totalMinutes}
            speed={patternInfo.speed}
          />
        )}

        {/* Progress Bar */}
        {sewingProgress && (
          <ProgressSection
            currentStitch={sewingProgress.currentStitch}
            totalStitches={totalStitches}
            elapsedMinutes={elapsedMinutes}
            totalMinutes={totalMinutes}
            progressPercent={progressPercent}
          />
        )}

        {/* Color Blocks */}
        <ColorBlockList
          colorBlocks={colorBlocks}
          currentStitch={currentStitch}
          currentBlockIndex={currentBlockIndex}
          currentBlockRef={currentBlockRef}
        />

        {/* Action buttons */}
        <ProgressActions
          machineStatus={machineStatus}
          isDeleting={isDeleting}
          isMaskTraceComplete={isMaskTraceComplete}
          onResumeSewing={resumeSewing}
          onStartSewing={startSewing}
          onStartMaskTrace={startMaskTrace}
        />
      </CardContent>
    </Card>
  );
}
