import { useMemo } from "react";
import { useAutoScroll } from "@/hooks";
import { useShallow } from "zustand/react/shallow";
import { useMachineStore } from "../stores/useMachineStore";
import { usePatternStore } from "../stores/usePatternStore";
import {
  CheckCircleIcon,
  ArrowRightIcon,
  CircleStackIcon,
  PlayIcon,
  ChartBarIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/solid";
import { MachineStatus } from "../types/machine";
import {
  canStartSewing,
  canStartMaskTrace,
  canResumeSewing,
} from "../utils/machineStateHelpers";
import { calculatePatternTime } from "../utils/timeCalculation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const colorBlocks = useMemo(() => {
    if (!displayPattern || !displayPattern.penStitches) return [];

    const blocks: Array<{
      colorIndex: number;
      threadHex: string;
      startStitch: number;
      endStitch: number;
      stitchCount: number;
      threadCatalogNumber: string | null;
      threadBrand: string | null;
      threadDescription: string | null;
      threadChart: string | null;
    }> = [];

    // Use the pre-computed color blocks from decoded PEN data
    for (const penBlock of displayPattern.penStitches.colorBlocks) {
      const thread = displayPattern.threads[penBlock.colorIndex];
      blocks.push({
        colorIndex: penBlock.colorIndex,
        threadHex: thread?.hex || "#000000",
        threadCatalogNumber: thread?.catalogNumber ?? null,
        threadBrand: thread?.brand ?? null,
        threadDescription: thread?.description ?? null,
        threadChart: thread?.chart ?? null,
        startStitch: penBlock.startStitchIndex,
        endStitch: penBlock.endStitchIndex,
        stitchCount: penBlock.endStitchIndex - penBlock.startStitchIndex,
      });
    }

    return blocks;
  }, [displayPattern]);

  // Determine current color block based on current stitch
  const currentStitch = sewingProgress?.currentStitch || 0;
  const currentBlockIndex = colorBlocks.findIndex(
    (block) =>
      currentStitch >= block.startStitch && currentStitch < block.endStitch,
  );

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
  const currentBlockRef = useAutoScroll(currentBlockIndex);

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
          <div className="grid grid-cols-3 gap-2 text-xs mb-3">
            <div className="bg-gray-200 dark:bg-gray-700/50 p-2 rounded">
              <span className="text-gray-600 dark:text-gray-400 block">
                Total Stitches
              </span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {totalStitches.toLocaleString()}
              </span>
            </div>
            <div className="bg-gray-200 dark:bg-gray-700/50 p-2 rounded">
              <span className="text-gray-600 dark:text-gray-400 block">
                Total Time
              </span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {totalMinutes} min
              </span>
            </div>
            <div className="bg-gray-200 dark:bg-gray-700/50 p-2 rounded">
              <span className="text-gray-600 dark:text-gray-400 block">
                Speed
              </span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {patternInfo.speed} spm
              </span>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {sewingProgress && (
          <div className="mb-3">
            <Progress
              value={progressPercent}
              className="h-3 mb-2 [&>div]:bg-gradient-to-r [&>div]:from-accent-600 [&>div]:to-accent-700 dark:[&>div]:from-accent-600 dark:[&>div]:to-accent-800"
            />

            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div className="bg-gray-200 dark:bg-gray-700/50 p-2 rounded">
                <span className="text-gray-600 dark:text-gray-400 block">
                  Current Stitch
                </span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {sewingProgress.currentStitch.toLocaleString()} /{" "}
                  {totalStitches.toLocaleString()}
                </span>
              </div>
              <div className="bg-gray-200 dark:bg-gray-700/50 p-2 rounded">
                <span className="text-gray-600 dark:text-gray-400 block">
                  Time
                </span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {elapsedMinutes} / {totalMinutes} min
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Color Blocks */}
        {colorBlocks.length > 0 && (
          <div className="mb-3 lg:flex-1 lg:min-h-0 flex flex-col">
            <h4 className="text-xs font-semibold mb-2 text-gray-700 dark:text-gray-300 flex-shrink-0">
              Color Blocks
            </h4>
            <ScrollArea className="lg:flex-1 lg:h-0">
              <div className="flex flex-col gap-2 pr-4">
                {colorBlocks.map((block, index) => {
                  const isCompleted = currentStitch >= block.endStitch;
                  const isCurrent = index === currentBlockIndex;

                  // Calculate progress within current block
                  let blockProgress = 0;
                  if (isCurrent) {
                    blockProgress =
                      ((currentStitch - block.startStitch) /
                        block.stitchCount) *
                      100;
                  } else if (isCompleted) {
                    blockProgress = 100;
                  }

                  return (
                    <div
                      key={index}
                      ref={isCurrent ? currentBlockRef : null}
                      className={`p-2.5 rounded-lg border-2 transition-all duration-300 ${
                        isCompleted
                          ? "border-success-600 bg-success-50 dark:bg-success-900/20"
                          : isCurrent
                            ? "border-gray-400 dark:border-gray-500 bg-white dark:bg-gray-700"
                            : "border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/50 opacity-70"
                      }`}
                      role="listitem"
                      aria-label={`Thread ${block.colorIndex + 1}, ${block.stitchCount} stitches, ${isCompleted ? "completed" : isCurrent ? "in progress" : "pending"}`}
                    >
                      <div className="flex items-center gap-2.5">
                        {/* Color swatch */}
                        <div
                          className="w-7 h-7 rounded-lg border-2 border-gray-300 dark:border-gray-600 shadow-md flex-shrink-0"
                          style={{
                            backgroundColor: block.threadHex,
                          }}
                          title={`Thread color: ${block.threadHex}`}
                          aria-label={`Thread color ${block.threadHex}`}
                        />

                        {/* Thread info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-xs text-gray-900 dark:text-gray-100">
                            Thread {block.colorIndex + 1}
                            {(block.threadBrand ||
                              block.threadChart ||
                              block.threadDescription ||
                              block.threadCatalogNumber) && (
                              <span className="font-normal text-gray-600 dark:text-gray-400">
                                {" "}
                                (
                                {(() => {
                                  // Primary metadata: brand and catalog number
                                  const primaryMetadata = [
                                    block.threadBrand,
                                    block.threadCatalogNumber
                                      ? `#${block.threadCatalogNumber}`
                                      : null,
                                  ]
                                    .filter(Boolean)
                                    .join(" ");

                                  // Secondary metadata: chart and description
                                  // Only show chart if it's different from catalogNumber
                                  const secondaryMetadata = [
                                    block.threadChart &&
                                    block.threadChart !==
                                      block.threadCatalogNumber
                                      ? block.threadChart
                                      : null,
                                    block.threadDescription,
                                  ]
                                    .filter(Boolean)
                                    .join(" ");

                                  return [primaryMetadata, secondaryMetadata]
                                    .filter(Boolean)
                                    .join(" • ");
                                })()}
                                )
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                            {block.stitchCount.toLocaleString()} stitches
                          </div>
                        </div>

                        {/* Status icon */}
                        {isCompleted ? (
                          <CheckCircleIcon
                            className="w-5 h-5 text-success-600 flex-shrink-0"
                            aria-label="Completed"
                          />
                        ) : isCurrent ? (
                          <ArrowRightIcon
                            className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0 animate-pulse"
                            aria-label="In progress"
                          />
                        ) : (
                          <CircleStackIcon
                            className="w-5 h-5 text-gray-400 flex-shrink-0"
                            aria-label="Pending"
                          />
                        )}
                      </div>

                      {/* Progress bar for current block */}
                      {isCurrent && (
                        <Progress
                          value={blockProgress}
                          className="mt-2 h-1.5 [&>div]:bg-gray-600 dark:[&>div]:bg-gray-500"
                          aria-label={`${Math.round(blockProgress)}% complete`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 flex-shrink-0">
          {/* Resume has highest priority when available */}
          {canResumeSewing(machineStatus) && (
            <Button
              onClick={resumeSewing}
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
              onClick={startSewing}
              disabled={isDeleting}
              className="flex-[2]"
              aria-label="Start sewing the pattern"
            >
              <PlayIcon className="w-3.5 h-3.5" />
              Start Sewing
            </Button>
          )}

          {/* Start Mask Trace - secondary action */}
          {canStartMaskTrace(machineStatus) && (
            <Button
              onClick={startMaskTrace}
              disabled={isDeleting}
              variant="outline"
              className="flex-1"
              aria-label={
                isMaskTraceComplete
                  ? "Start mask trace again"
                  : "Start mask trace"
              }
            >
              <ArrowPathIcon className="w-3.5 h-3.5" />
              {isMaskTraceComplete ? "Trace Again" : "Start Mask Trace"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
