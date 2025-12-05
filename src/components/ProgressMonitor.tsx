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
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 pb-2 border-b-2 border-gray-300">Sewing Progress</h2>

      {patternInfo && (
        <div>
          <div className="flex justify-between py-2 border-b border-gray-300">
            <span className="font-medium text-gray-600">Total Stitches:</span>
            <span className="font-semibold">{patternInfo.totalStitches}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-300">
            <span className="font-medium text-gray-600">Estimated Time:</span>
            <span className="font-semibold">
              {Math.floor(patternInfo.totalTime / 60)}:
              {(patternInfo.totalTime % 60).toString().padStart(2, '0')}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-300">
            <span className="font-medium text-gray-600">Speed:</span>
            <span className="font-semibold">{patternInfo.speed} spm</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="font-medium text-gray-600">Bounds:</span>
            <span className="font-semibold">
              ({patternInfo.boundLeft}, {patternInfo.boundTop}) to (
              {patternInfo.boundRight}, {patternInfo.boundBottom})
            </span>
          </div>
        </div>
      )}

      {colorBlocks.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-300">
          <h3 className="text-base font-semibold my-4">Color Blocks</h3>
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
                  className={`p-3 rounded bg-gray-100 border-2 border-transparent transition-all ${
                    isCompleted ? 'border-green-600 bg-green-50' : isCurrent ? 'border-blue-600 bg-blue-50 shadow-md shadow-blue-600/20' : 'opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-6 h-6 rounded border-2 border-gray-300 shadow-sm flex-shrink-0"
                      style={{ backgroundColor: block.threadHex }}
                      title={block.threadHex}
                    />
                    <span className="font-semibold flex-1">
                      Thread {block.colorIndex + 1}
                    </span>
                    <span className={`text-xl font-bold ${isCompleted ? 'text-green-600' : isCurrent ? 'text-blue-600' : 'text-gray-600'}`}>
                      {isCompleted ? '✓' : isCurrent ? '→' : '○'}
                    </span>
                    <span className="text-sm text-gray-600">
                      {block.stitchCount} stitches
                    </span>
                  </div>
                  {isCurrent && (
                    <div className="mt-2 h-1 bg-white rounded overflow-hidden">
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

      {sewingProgress && (
        <div className="mt-4">
          <div className="h-3 bg-gray-300 rounded-md overflow-hidden my-4 shadow-inner relative">
            <div className="h-full bg-gradient-to-r from-blue-600 to-blue-700 transition-all duration-300 ease-out relative overflow-hidden after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent after:animate-[shimmer_2s_infinite]" style={{ width: `${progressPercent}%` }} />
          </div>

          <div className="flex justify-between py-2 border-b border-gray-300">
            <span className="font-medium text-gray-600">Current Stitch:</span>
            <span className="font-semibold">
              {sewingProgress.currentStitch} / {patternInfo?.totalStitches || 0}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-300">
            <span className="font-medium text-gray-600">Elapsed Time:</span>
            <span className="font-semibold">
              {Math.floor(sewingProgress.currentTime / 60)}:
              {(sewingProgress.currentTime % 60).toString().padStart(2, '0')}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-300">
            <span className="font-medium text-gray-600">Position:</span>
            <span className="font-semibold">
              ({(sewingProgress.positionX / 10).toFixed(1)}mm,{' '}
              {(sewingProgress.positionY / 10).toFixed(1)}mm)
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="font-medium text-gray-600">Progress:</span>
            <span className="font-semibold">{progressPercent.toFixed(1)}%</span>
          </div>
        </div>
      )}

      {/* State Visual Indicator */}
      {patternInfo && (
        <div className={`flex items-center gap-4 p-4 rounded-lg my-4 border-l-4 ${stateIndicatorColors[stateVisual.color as keyof typeof stateIndicatorColors] || stateIndicatorColors.info}`}>
          <span className="text-3xl leading-none">{stateVisual.icon}</span>
          <div className="flex-1">
            <div className="font-semibold text-base mb-1">{stateVisual.label}</div>
            <div className="text-sm text-gray-600">{stateVisual.description}</div>
          </div>
        </div>
      )}

      <div className="flex gap-3 mt-4 flex-wrap">
        {/* Mask trace waiting for confirmation */}
        {isMaskTraceWait && (
          <div className="bg-yellow-100 text-yellow-800 px-4 py-3 rounded border border-yellow-200 font-medium w-full">
            Press button on machine to start mask trace
          </div>
        )}

        {/* Mask trace in progress */}
        {isMaskTracing && (
          <div className="bg-cyan-100 text-cyan-800 px-4 py-3 rounded border border-cyan-200 font-medium w-full">
            Mask trace in progress...
          </div>
        )}

        {/* Mask trace complete - ready to sew */}
        {isMaskTraceComplete && (
          <>
            <div className="bg-green-100 text-green-800 px-4 py-3 rounded border border-green-200 font-medium w-full">
              Mask trace complete!
            </div>
            {canStartSewing(machineStatus) && (
              <button onClick={onStartSewing} className="px-6 py-3 bg-blue-600 text-white rounded font-semibold text-sm hover:bg-blue-700 transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale-[0.3]">
                Start Sewing
              </button>
            )}
            {canStartMaskTrace(machineStatus) && (
              <button onClick={onStartMaskTrace} className="px-6 py-3 bg-gray-600 text-white rounded font-semibold text-sm hover:bg-gray-700 transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale-[0.3]">
                Trace Again
              </button>
            )}
          </>
        )}

        {/* Pattern uploaded, ready to trace */}
        {machineStatus === MachineStatus.IDLE && (
          <>
            <div className="bg-cyan-100 text-cyan-800 px-4 py-3 rounded border border-cyan-200 font-medium w-full">
              Pattern uploaded successfully
            </div>
            {canStartMaskTrace(machineStatus) && (
              <button onClick={onStartMaskTrace} className="px-6 py-3 bg-gray-600 text-white rounded font-semibold text-sm hover:bg-gray-700 transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale-[0.3]">
                Start Mask Trace
              </button>
            )}
          </>
        )}

        {/* Ready to start (pattern uploaded) */}
        {machineStatus === MachineStatus.SEWING_WAIT && (
          <>
            {canStartMaskTrace(machineStatus) && (
              <button onClick={onStartMaskTrace} className="px-6 py-3 bg-gray-600 text-white rounded font-semibold text-sm hover:bg-gray-700 transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale-[0.3]">
                Start Mask Trace
              </button>
            )}
            {canStartSewing(machineStatus) && (
              <button onClick={onStartSewing} className="px-6 py-3 bg-blue-600 text-white rounded font-semibold text-sm hover:bg-blue-700 transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale-[0.3]">
                Start Sewing
              </button>
            )}
          </>
        )}

        {/* Resume sewing for interrupted states */}
        {canResumeSewing(machineStatus) && (
          <button onClick={onResumeSewing} className="px-6 py-3 bg-blue-600 text-white rounded font-semibold text-sm hover:bg-blue-700 transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale-[0.3]">
            ▶️ Resume Sewing
          </button>
        )}

        {/* Color change needed */}
        {isColorChange && (
          <div className="bg-yellow-100 text-yellow-800 px-4 py-3 rounded border border-yellow-200 font-medium w-full">
            Waiting for color change - change thread and press button on machine
          </div>
        )}

        {/* Sewing in progress */}
        {isSewing && (
          <div className="bg-cyan-100 text-cyan-800 px-4 py-3 rounded border border-cyan-200 font-medium w-full">
            Sewing in progress...
          </div>
        )}

        {/* Sewing complete */}
        {isComplete && (
          <div className="bg-green-100 text-green-800 px-4 py-3 rounded border border-green-200 font-medium w-full">
            Sewing complete!
          </div>
        )}

        {/* Delete pattern button - ONLY show when safe */}
        {patternInfo && canDeletePattern(machineStatus) && (
          <button onClick={onDeletePattern} className="px-6 py-3 bg-red-600 text-white rounded font-semibold text-sm hover:bg-red-700 transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale-[0.3]">
            Delete Pattern
          </button>
        )}

        {/* Show warning when delete is unavailable */}
        {patternInfo && !canDeletePattern(machineStatus) && (
          <div className="bg-cyan-100 text-cyan-800 px-4 py-3 rounded border border-cyan-200 font-medium w-full">
            Pattern cannot be deleted during active operations
          </div>
        )}
      </div>
    </div>
  );
}
