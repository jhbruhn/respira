import { useRef, useEffect, useState, useMemo } from "react";
import { useShallow } from 'zustand/react/shallow';
import { useMachineStore } from '../stores/useMachineStore';
import { usePatternStore } from '../stores/usePatternStore';
import {
  CheckCircleIcon,
  ArrowRightIcon,
  CircleStackIcon,
  PlayIcon,
  CheckBadgeIcon,
  ClockIcon,
  PauseCircleIcon,
  ExclamationCircleIcon,
  ChartBarIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/solid";
import { MachineStatus } from "../types/machine";
import {
  canStartSewing,
  canStartMaskTrace,
  canResumeSewing,
  getStateVisualInfo,
} from "../utils/machineStateHelpers";

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
    }))
  );

  // Pattern store
  const pesData = usePatternStore((state) => state.pesData);
  const currentBlockRef = useRef<HTMLDivElement>(null);
  const colorBlocksScrollRef = useRef<HTMLDivElement>(null);
  const [showGradient, setShowGradient] = useState(true);

  // State indicators
  const isMaskTraceComplete =
    machineStatus === MachineStatus.MASK_TRACE_COMPLETE;

  const stateVisual = getStateVisualInfo(machineStatus);

  const progressPercent = patternInfo
    ? ((sewingProgress?.currentStitch || 0) / patternInfo.totalStitches) * 100
    : 0;

  // Calculate color block information from decoded penStitches
  const colorBlocks = useMemo(() => {
    if (!pesData || !pesData.penStitches) return [];

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
    for (const penBlock of pesData.penStitches.colorBlocks) {
      const thread = pesData.threads[penBlock.colorIndex];
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
  }, [pesData]);

  // Determine current color block based on current stitch
  const currentStitch = sewingProgress?.currentStitch || 0;
  const currentBlockIndex = colorBlocks.findIndex(
    (block) =>
      currentStitch >= block.startStitch && currentStitch < block.endStitch,
  );

  // Auto-scroll to current block
  useEffect(() => {
    if (currentBlockRef.current) {
      currentBlockRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [currentBlockIndex]);

  // Handle scroll to detect if at bottom
  const handleColorBlocksScroll = () => {
    if (colorBlocksScrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = colorBlocksScrollRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 5; // 5px threshold
      setShowGradient(!isAtBottom);
    }
  };

  // Check initial scroll state and update on resize
  useEffect(() => {
    const checkScrollable = () => {
      if (colorBlocksScrollRef.current) {
        const { scrollHeight, clientHeight } = colorBlocksScrollRef.current;
        const isScrollable = scrollHeight > clientHeight;
        setShowGradient(isScrollable);
      }
    };

    checkScrollable();
    window.addEventListener('resize', checkScrollable);
    return () => window.removeEventListener('resize', checkScrollable);
  }, [colorBlocks]);

  const stateIndicatorColors = {
    idle: "bg-blue-50 dark:bg-blue-900/20 border-blue-600",
    info: "bg-blue-50 dark:bg-blue-900/20 border-blue-600",
    active: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500",
    waiting: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500",
    warning: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500",
    complete: "bg-green-50 dark:bg-green-900/20 border-green-600",
    success: "bg-green-50 dark:bg-green-900/20 border-green-600",
    interrupted: "bg-red-50 dark:bg-red-900/20 border-red-600",
    error: "bg-red-50 dark:bg-red-900/20 border-red-600",
    danger: "bg-red-50 dark:bg-red-900/20 border-red-600",
  };

  return (
    <div className="lg:h-full bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border-l-4 border-purple-600 dark:border-purple-500 flex flex-col lg:overflow-hidden">
      <div className="flex items-start gap-3 mb-3">
        <ChartBarIcon className="w-6 h-6 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            Sewing Progress
          </h3>
          {sewingProgress && (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {progressPercent.toFixed(1)}% complete
            </p>
          )}
        </div>
      </div>

      {/* Pattern Info */}
      {patternInfo && (
        <div className="grid grid-cols-3 gap-2 text-xs mb-3">
          <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
            <span className="text-gray-600 dark:text-gray-400 block">
              Total Stitches
            </span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {patternInfo.totalStitches.toLocaleString()}
            </span>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
            <span className="text-gray-600 dark:text-gray-400 block">
              Est. Time
            </span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {Math.floor(patternInfo.totalTime / 60)}:
              {String(patternInfo.totalTime % 60).padStart(2, "0")}
            </span>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
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
          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded-md overflow-hidden shadow-inner relative mb-2">
            <div
              className="h-full bg-gradient-to-r from-purple-600 to-purple-700 dark:from-purple-600 dark:to-purple-800 transition-all duration-300 ease-out relative overflow-hidden after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent after:animate-[shimmer_2s_infinite]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
              <span className="text-gray-600 dark:text-gray-400 block">
                Current Stitch
              </span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {sewingProgress.currentStitch.toLocaleString()} /{" "}
                {patternInfo?.totalStitches.toLocaleString() || 0}
              </span>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
              <span className="text-gray-600 dark:text-gray-400 block">
                Time Elapsed
              </span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {Math.floor(sewingProgress.currentTime / 60)}:
                {String(sewingProgress.currentTime % 60).padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* State Visual Indicator */}
      {patternInfo &&
        (() => {
          const iconMap = {
            ready: (
              <ClockIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            ),
            active: (
              <PlayIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            ),
            waiting: (
              <PauseCircleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            ),
            complete: (
              <CheckBadgeIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
            ),
            interrupted: (
              <PauseCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
            ),
            error: (
              <ExclamationCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
            ),
          };

          return (
            <div
              className={`flex items-center gap-3 p-2.5 rounded-lg mb-3 border-l-4 ${stateIndicatorColors[stateVisual.color as keyof typeof stateIndicatorColors] || stateIndicatorColors.info}`}
            >
              <div className="flex-shrink-0">
                {iconMap[stateVisual.iconName]}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-xs dark:text-gray-100">
                  {stateVisual.label}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {stateVisual.description}
                </div>
              </div>
            </div>
          );
        })()}

      {/* Color Blocks */}
      {colorBlocks.length > 0 && (
        <div className="mb-3 lg:flex-1 lg:min-h-0 flex flex-col">
          <h4 className="text-xs font-semibold mb-2 text-gray-700 dark:text-gray-300 flex-shrink-0">
            Color Blocks
          </h4>
          <div className="relative lg:flex-1 lg:min-h-0">
            <div
              ref={colorBlocksScrollRef}
              onScroll={handleColorBlocksScroll}
              className="lg:absolute lg:inset-0 flex flex-col gap-2 lg:overflow-y-auto scroll-smooth pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-gray-700 [&::-webkit-scrollbar-thumb]:bg-blue-600 dark:[&::-webkit-scrollbar-thumb]:bg-blue-500 [&::-webkit-scrollbar-thumb]:rounded-full"
            >
              {colorBlocks.map((block, index) => {
              const isCompleted = currentStitch >= block.endStitch;
              const isCurrent = index === currentBlockIndex;

              // Calculate progress within current block
              let blockProgress = 0;
              if (isCurrent) {
                blockProgress =
                  ((currentStitch - block.startStitch) / block.stitchCount) *
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
                      ? "border-green-600 bg-green-50 dark:bg-green-900/20"
                      : isCurrent
                        ? "border-purple-600 bg-purple-50 dark:bg-purple-900/20 shadow-lg shadow-purple-600/20 animate-pulseGlow"
                        : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 opacity-70"
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
                        ...(isCurrent && { borderColor: "#9333ea" }),
                      }}
                      title={`Thread color: ${block.threadHex}`}
                      aria-label={`Thread color ${block.threadHex}`}
                    />

                    {/* Thread info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs text-gray-900 dark:text-gray-100">
                        Thread {block.colorIndex + 1}
                        {(block.threadBrand || block.threadChart || block.threadDescription || block.threadCatalogNumber) && (
                          <span className="font-normal text-gray-600 dark:text-gray-400">
                            {" "}
                            (
                            {(() => {
                              // Primary metadata: brand and catalog number
                              const primaryMetadata = [
                                block.threadBrand,
                                block.threadCatalogNumber ? `#${block.threadCatalogNumber}` : null
                              ].filter(Boolean).join(" ");

                              // Secondary metadata: chart and description
                              const secondaryMetadata = [
                                block.threadChart,
                                block.threadDescription
                              ].filter(Boolean).join(" ");

                              return [primaryMetadata, secondaryMetadata].filter(Boolean).join(" • ");
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
                        className="w-5 h-5 text-green-600 flex-shrink-0"
                        aria-label="Completed"
                      />
                    ) : isCurrent ? (
                      <ArrowRightIcon
                        className="w-5 h-5 text-purple-600 flex-shrink-0 animate-pulse"
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
                    <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-600 dark:bg-purple-500 transition-all duration-300 rounded-full"
                        style={{ width: `${blockProgress}%` }}
                        role="progressbar"
                        aria-valuenow={Math.round(blockProgress)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${Math.round(blockProgress)}% complete`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
            </div>
            {/* Gradient overlay to indicate more content below - only on desktop and when not at bottom */}
            {showGradient && (
              <div className="hidden lg:block absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white dark:from-gray-800 to-transparent pointer-events-none" />
            )}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 flex-shrink-0">
        {/* Resume has highest priority when available */}
        {canResumeSewing(machineStatus) && (
          <button
            onClick={resumeSewing}
            disabled={isDeleting}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 bg-blue-600 dark:bg-blue-700 text-white rounded font-semibold text-xs hover:bg-blue-700 dark:hover:bg-blue-600 active:bg-blue-800 dark:active:bg-blue-500 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Resume sewing the current pattern"
          >
            <PlayIcon className="w-3.5 h-3.5" />
            Resume Sewing
          </button>
        )}

        {/* Start Sewing - primary action, takes more space */}
        {canStartSewing(machineStatus) && !canResumeSewing(machineStatus) && (
          <button
            onClick={startSewing}
            disabled={isDeleting}
            className="flex-[2] flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 bg-blue-600 dark:bg-blue-700 text-white rounded font-semibold text-xs hover:bg-blue-700 dark:hover:bg-blue-600 active:bg-blue-800 dark:active:bg-blue-500 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Start sewing the pattern"
          >
            <PlayIcon className="w-3.5 h-3.5" />
            Start Sewing
          </button>
        )}

        {/* Start Mask Trace - secondary action */}
        {canStartMaskTrace(machineStatus) && (
          <button
            onClick={startMaskTrace}
            disabled={isDeleting}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 bg-gray-600 dark:bg-gray-700 text-white rounded font-semibold text-xs hover:bg-gray-700 dark:hover:bg-gray-600 active:bg-gray-800 dark:active:bg-gray-500 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={
              isMaskTraceComplete
                ? "Start mask trace again"
                : "Start mask trace"
            }
          >
            <ArrowPathIcon className="w-3.5 h-3.5" />
            {isMaskTraceComplete ? "Trace Again" : "Start Mask Trace"}
          </button>
        )}
      </div>
    </div>
  );
}
