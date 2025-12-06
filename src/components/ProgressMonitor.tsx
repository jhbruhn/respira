import {
  CheckCircleIcon,
  ArrowRightIcon,
  CircleStackIcon,
  PlayIcon,
  CheckBadgeIcon,
  ClockIcon,
  PauseCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/solid';
import type { PatternInfo, SewingProgress } from '../types/machine';
import { MachineStatus } from '../types/machine';
import type { PesPatternData } from '../utils/pystitchConverter';
import {
  canStartSewing,
  canStartMaskTrace,
  canDeletePattern,
  canResumeSewing,
  getStateVisualInfo
} from '../utils/machineStateHelpers';

interface ProgressMonitorProps {
  machineStatus: MachineStatus;
  patternInfo: PatternInfo | null;
  sewingProgress: SewingProgress | null;
  pesData: PesPatternData | null;
  onStartMaskTrace: () => void;
  onStartSewing: () => void;
  onResumeSewing: () => void;
  onDeletePattern: () => void;
  isDeleting?: boolean;
}

export function ProgressMonitor({
  machineStatus,
  patternInfo,
  sewingProgress,
  pesData,
  onStartMaskTrace,
  onStartSewing,
  onResumeSewing,
  onDeletePattern,
  isDeleting = false,
}: ProgressMonitorProps) {
  // State indicators
  const isMaskTraceComplete = machineStatus === MachineStatus.MASK_TRACE_COMPLETE;

  const stateVisual = getStateVisualInfo(machineStatus);

  const progressPercent = patternInfo
    ? ((sewingProgress?.currentStitch || 0) / patternInfo.totalStitches) * 100
    : 0;

  // Calculate color block information from pesData
  const colorBlocks = pesData ? (() => {
    const blocks: Array<{
      colorIndex: number;
      threadHex: string;
      startStitch: number;
      endStitch: number;
      stitchCount: number;
    }> = [];

    let currentColorIndex = pesData.stitches[0]?.[3] ?? 0;
    let blockStartStitch = 0;

    for (let i = 0; i < pesData.stitches.length; i++) {
      const stitchColorIndex = pesData.stitches[i][3];

      // When color changes, save the previous block
      if (stitchColorIndex !== currentColorIndex || i === pesData.stitches.length - 1) {
        const endStitch = i === pesData.stitches.length - 1 ? i + 1 : i;
        blocks.push({
          colorIndex: currentColorIndex,
          threadHex: pesData.threads[currentColorIndex]?.hex || '#000000',
          startStitch: blockStartStitch,
          endStitch: endStitch,
          stitchCount: endStitch - blockStartStitch,
        });

        currentColorIndex = stitchColorIndex;
        blockStartStitch = i;
      }
    }

    return blocks;
  })() : [];

  // Determine current color block based on current stitch
  const currentStitch = sewingProgress?.currentStitch || 0;
  const currentBlockIndex = colorBlocks.findIndex(
    block => currentStitch >= block.startStitch && currentStitch < block.endStitch
  );

  const stateIndicatorColors = {
    idle: 'bg-blue-50 dark:bg-blue-900/20 border-l-blue-600',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-l-blue-600',
    active: 'bg-yellow-50 dark:bg-yellow-900/20 border-l-yellow-500',
    waiting: 'bg-yellow-50 dark:bg-yellow-900/20 border-l-yellow-500',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-l-yellow-500',
    complete: 'bg-green-50 dark:bg-green-900/20 border-l-green-600',
    success: 'bg-green-50 dark:bg-green-900/20 border-l-green-600',
    interrupted: 'bg-red-50 dark:bg-red-900/20 border-l-red-600',
    error: 'bg-red-50 dark:bg-red-900/20 border-l-red-600',
    danger: 'bg-red-50 dark:bg-red-900/20 border-l-red-600',
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 animate-fadeIn">
      <h2 className="text-lg font-semibold mb-3 pb-2 border-b border-gray-300 dark:border-gray-600 dark:text-white">Sewing Progress</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column - Pattern Info & Progress */}
        <div>
          {patternInfo && (
            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg mb-3">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400 block text-xs">Total Stitches</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{patternInfo.totalStitches.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400 block text-xs">Est. Time</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {Math.floor(patternInfo.totalTime / 60)}:{String(patternInfo.totalTime % 60).padStart(2, '0')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400 block text-xs">Speed</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{patternInfo.speed} spm</span>
                </div>
              </div>
            </div>
          )}

          {sewingProgress && (
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Progress</span>
                <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{progressPercent.toFixed(1)}%</span>
              </div>
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded-md overflow-hidden shadow-inner relative mb-2">
                <div className="h-full bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-600 dark:to-blue-800 transition-all duration-300 ease-out relative overflow-hidden after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent after:animate-[shimmer_2s_infinite]" style={{ width: `${progressPercent}%` }} />
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400 block text-xs">Current Stitch</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {sewingProgress.currentStitch.toLocaleString()} / {patternInfo?.totalStitches.toLocaleString() || 0}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400 block text-xs">Time Elapsed</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {Math.floor(sewingProgress.currentTime / 60)}:{String(sewingProgress.currentTime % 60).padStart(2, '0')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* State Visual Indicator */}
          {patternInfo && (() => {
            const iconMap = {
              ready: <ClockIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
              active: <PlayIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />,
              waiting: <PauseCircleIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />,
              complete: <CheckBadgeIcon className="w-6 h-6 text-green-600 dark:text-green-400" />,
              interrupted: <PauseCircleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />,
              error: <ExclamationCircleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
            };

            return (
              <div className={`flex items-center gap-3 p-3 rounded-lg mb-3 border-l-4 ${stateIndicatorColors[stateVisual.color as keyof typeof stateIndicatorColors] || stateIndicatorColors.info}`}>
                <div className="flex-shrink-0">
                  {iconMap[stateVisual.iconName]}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm dark:text-gray-100">{stateVisual.label}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">{stateVisual.description}</div>
                </div>
              </div>
            );
          })()}

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
              {/* Resume has highest priority when available */}
              {canResumeSewing(machineStatus) && (
                <button
                  onClick={onResumeSewing}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 dark:bg-blue-700 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 dark:hover:bg-blue-600 active:bg-blue-800 dark:active:bg-blue-500 hover:shadow-lg active:scale-[0.98] transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                  aria-label="Resume sewing the current pattern"
                >
                  <PlayIcon className="w-4 h-4" />
                  Resume Sewing
                </button>
              )}

              {/* Start Sewing - primary action */}
              {canStartSewing(machineStatus) && !canResumeSewing(machineStatus) && (
                <button
                  onClick={onStartSewing}
                  className="px-4 py-2.5 bg-blue-600 dark:bg-blue-700 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 dark:hover:bg-blue-600 active:bg-blue-800 dark:active:bg-blue-500 hover:shadow-lg active:scale-[0.98] transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                  aria-label="Start sewing the pattern"
                >
                  Start Sewing
                </button>
              )}

              {/* Start Mask Trace - secondary action */}
              {canStartMaskTrace(machineStatus) && (
                <button
                  onClick={onStartMaskTrace}
                  className="px-4 py-2.5 bg-gray-600 dark:bg-gray-700 text-white rounded-lg font-semibold text-sm hover:bg-gray-700 dark:hover:bg-gray-600 active:bg-gray-800 dark:active:bg-gray-500 hover:shadow-lg active:scale-[0.98] transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                  aria-label={isMaskTraceComplete ? 'Start mask trace again' : 'Start mask trace'}
                >
                  {isMaskTraceComplete ? 'Trace Again' : 'Start Mask Trace'}
                </button>
              )}

              {/* Delete - destructive action, always last */}
              {patternInfo && canDeletePattern(machineStatus) && (
                <button
                  onClick={onDeletePattern}
                  disabled={isDeleting}
                  className="px-4 py-2.5 bg-red-600 dark:bg-red-700 text-white rounded-lg font-semibold text-sm hover:bg-red-700 dark:hover:bg-red-600 active:bg-red-800 dark:active:bg-red-500 hover:shadow-lg active:scale-[0.98] transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-300 dark:focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ml-auto disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600 disabled:hover:shadow-none disabled:active:scale-100"
                  aria-label={isDeleting ? "Deleting pattern..." : "Delete the current pattern from machine"}
                >
                  {isDeleting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin inline mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    'Delete Pattern'
                  )}
                </button>
              )}
          </div>
        </div>

        {/* Right Column - Color Blocks */}
        <div>
          {colorBlocks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Color Blocks</h3>
              <div className="flex flex-col gap-2">
            {colorBlocks.map((block, index) => {
              const isCompleted = currentStitch >= block.endStitch;
              const isCurrent = index === currentBlockIndex;

              // Calculate progress within current block
              let blockProgress = 0;
              if (isCurrent) {
                blockProgress = ((currentStitch - block.startStitch) / block.stitchCount) * 100;
              } else if (isCompleted) {
                blockProgress = 100;
              }

              return (
                <div
                  key={index}
                  className={`p-3 rounded-lg border-2 transition-all duration-300 ${
                    isCompleted
                      ? 'border-green-600 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30'
                      : isCurrent
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-lg shadow-blue-600/20 animate-pulseGlow'
                      : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 opacity-70 hover:opacity-90'
                  }`}
                  role="listitem"
                  aria-label={`Thread ${block.colorIndex + 1}, ${block.stitchCount} stitches, ${isCompleted ? 'completed' : isCurrent ? 'in progress' : 'pending'}`}
                >
                  <div className="flex items-center gap-3">
                    {/* Larger color swatch with better visibility */}
                    <div
                      className="w-8 h-8 rounded-lg border-2 border-gray-300 dark:border-gray-600 shadow-md flex-shrink-0 ring-2 ring-offset-2 ring-transparent dark:ring-offset-gray-800"
                      style={{
                        backgroundColor: block.threadHex,
                        ...(isCurrent && { borderColor: '#2563eb', ringColor: '#93c5fd' })
                      }}
                      title={`Thread color: ${block.threadHex}`}
                      aria-label={`Thread color ${block.threadHex}`}
                    />

                    {/* Thread info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                        Thread {block.colorIndex + 1}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                        {block.stitchCount.toLocaleString()} stitches
                      </div>
                    </div>

                    {/* Status icon */}
                    {isCompleted ? (
                      <CheckCircleIcon className="w-6 h-6 text-green-600 flex-shrink-0" aria-label="Completed" />
                    ) : isCurrent ? (
                      <ArrowRightIcon className="w-6 h-6 text-blue-600 flex-shrink-0 animate-pulse" aria-label="In progress" />
                    ) : (
                      <CircleStackIcon className="w-6 h-6 text-gray-400 flex-shrink-0" aria-label="Pending" />
                    )}
                  </div>

                  {/* Progress bar for current block */}
                  {isCurrent && (
                    <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300 rounded-full"
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
