import {
  CheckCircleIcon,
  ArrowRightIcon,
  CircleStackIcon,
  PlayIcon,
  CheckBadgeIcon,
  ClockIcon,
  PauseCircleIcon,
  XCircleIcon,
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
}: ProgressMonitorProps) {
  // State indicators
  const isSewing = machineStatus === MachineStatus.SEWING;
  const isComplete = machineStatus === MachineStatus.SEWING_COMPLETE;
  const isColorChange = machineStatus === MachineStatus.COLOR_CHANGE_WAIT;
  const isMaskTracing = machineStatus === MachineStatus.MASK_TRACING;
  const isMaskTraceComplete = machineStatus === MachineStatus.MASK_TRACE_COMPLETE;
  const isMaskTraceWait = machineStatus === MachineStatus.MASK_TRACE_LOCK_WAIT;

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
    idle: 'bg-blue-50 border-l-blue-600',
    info: 'bg-blue-50 border-l-blue-600',
    active: 'bg-yellow-50 border-l-yellow-500',
    waiting: 'bg-yellow-50 border-l-yellow-500',
    warning: 'bg-yellow-50 border-l-yellow-500',
    complete: 'bg-green-50 border-l-green-600',
    success: 'bg-green-50 border-l-green-600',
    interrupted: 'bg-red-50 border-l-red-600',
    error: 'bg-red-50 border-l-red-600',
    danger: 'bg-red-50 border-l-red-600',
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold mb-3 pb-2 border-b border-gray-300">Sewing Progress</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column - Pattern Info & Color Blocks */}
        <div>
          {patternInfo && (
            <div className="bg-gray-50 p-3 rounded-lg mb-3">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-gray-600 block text-xs">Total Stitches</span>
                  <span className="font-semibold text-gray-900">{patternInfo.totalStitches.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-600 block text-xs">Est. Time</span>
                  <span className="font-semibold text-gray-900">
                    {Math.floor(patternInfo.totalTime / 60)}:{String(patternInfo.totalTime % 60).padStart(2, '0')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 block text-xs">Speed</span>
                  <span className="font-semibold text-gray-900">{patternInfo.speed} spm</span>
                </div>
              </div>
            </div>
          )}

          {colorBlocks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-gray-700">Color Blocks</h3>
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
                  className={`p-2 rounded bg-gray-100 border-2 border-transparent transition-all ${
                    isCompleted ? 'border-green-600 bg-green-50' : isCurrent ? 'border-blue-600 bg-blue-50 shadow-md shadow-blue-600/20' : 'opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded border-2 border-gray-300 shadow-sm flex-shrink-0"
                      style={{ backgroundColor: block.threadHex }}
                      title={block.threadHex}
                    />
                    <span className="font-semibold flex-1 text-sm">
                      Thread {block.colorIndex + 1}
                    </span>
                    {isCompleted ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    ) : isCurrent ? (
                      <ArrowRightIcon className="w-5 h-5 text-blue-600" />
                    ) : (
                      <CircleStackIcon className="w-5 h-5 text-gray-400" />
                    )}
                    <span className="text-xs text-gray-600">
                      {block.stitchCount.toLocaleString()}
                    </span>
                  </div>
                  {isCurrent && (
                    <div className="mt-1.5 h-1 bg-white rounded overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${blockProgress}%` }}
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

        {/* Right Column - Progress & Controls */}
        <div>
          {sewingProgress && (
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-medium text-gray-600">Progress</span>
            <span className="text-xl font-bold text-blue-600">{progressPercent.toFixed(1)}%</span>
          </div>
          <div className="h-3 bg-gray-300 rounded-md overflow-hidden shadow-inner relative mb-2">
            <div className="h-full bg-gradient-to-r from-blue-600 to-blue-700 transition-all duration-300 ease-out relative overflow-hidden after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent after:animate-[shimmer_2s_infinite]" style={{ width: `${progressPercent}%` }} />
          </div>

          <div className="bg-gray-50 p-2 rounded-lg grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-600 block text-xs">Current Stitch</span>
              <span className="font-semibold text-gray-900">
                {sewingProgress.currentStitch.toLocaleString()} / {patternInfo?.totalStitches.toLocaleString() || 0}
              </span>
            </div>
            <div>
              <span className="text-gray-600 block text-xs">Time Elapsed</span>
              <span className="font-semibold text-gray-900">
                {Math.floor(sewingProgress.currentTime / 60)}:{String(sewingProgress.currentTime % 60).padStart(2, '0')}
              </span>
            </div>
          </div>
          </div>
          )}

          {/* State Visual Indicator */}
          {patternInfo && (() => {
            const iconMap = {
              ready: <ClockIcon className="w-6 h-6" />,
              active: <PlayIcon className="w-6 h-6" />,
              waiting: <PauseCircleIcon className="w-6 h-6" />,
              complete: <CheckBadgeIcon className="w-6 h-6" />,
              interrupted: <PauseCircleIcon className="w-6 h-6" />,
              error: <ExclamationCircleIcon className="w-6 h-6" />
            };

            return (
              <div className={`flex items-center gap-3 p-3 rounded-lg mb-3 border-l-4 ${stateIndicatorColors[stateVisual.color as keyof typeof stateIndicatorColors] || stateIndicatorColors.info}`}>
                <div className="flex-shrink-0">
                  {iconMap[stateVisual.iconName]}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{stateVisual.label}</div>
                  <div className="text-xs text-gray-600">{stateVisual.description}</div>
                </div>
              </div>
            );
          })()}

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
              {/* Resume has highest priority when available */}
              {canResumeSewing(machineStatus) && (
                <button onClick={onResumeSewing} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded font-semibold text-sm hover:bg-blue-700 transition-all hover:shadow-md cursor-pointer">
                  <PlayIcon className="w-4 h-4" />
                  Resume Sewing
                </button>
              )}

              {/* Start Sewing - primary action */}
              {canStartSewing(machineStatus) && !canResumeSewing(machineStatus) && (
                <button onClick={onStartSewing} className="px-4 py-2 bg-blue-600 text-white rounded font-semibold text-sm hover:bg-blue-700 transition-all hover:shadow-md cursor-pointer">
                  Start Sewing
                </button>
              )}

              {/* Start Mask Trace - secondary action */}
              {canStartMaskTrace(machineStatus) && (
                <button onClick={onStartMaskTrace} className="px-4 py-2 bg-gray-600 text-white rounded font-semibold text-sm hover:bg-gray-700 transition-all hover:shadow-md cursor-pointer">
                  {isMaskTraceComplete ? 'Trace Again' : 'Start Mask Trace'}
                </button>
              )}

              {/* Delete - destructive action, always last */}
              {patternInfo && canDeletePattern(machineStatus) && (
                <button onClick={onDeletePattern} className="px-4 py-2 bg-red-600 text-white rounded font-semibold text-sm hover:bg-red-700 transition-all hover:shadow-md ml-auto cursor-pointer">
                  Delete Pattern
                </button>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
