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

  return (
    <div className="progress-panel">
      <h2>Sewing Progress</h2>

      {patternInfo && (
        <div className="pattern-stats">
          <div className="detail-row">
            <span className="label">Total Stitches:</span>
            <span className="value">{patternInfo.totalStitches}</span>
          </div>
          <div className="detail-row">
            <span className="label">Estimated Time:</span>
            <span className="value">
              {Math.floor(patternInfo.totalTime / 60)}:
              {(patternInfo.totalTime % 60).toString().padStart(2, '0')}
            </span>
          </div>
          <div className="detail-row">
            <span className="label">Speed:</span>
            <span className="value">{patternInfo.speed} spm</span>
          </div>
          <div className="detail-row">
            <span className="label">Bounds:</span>
            <span className="value">
              ({patternInfo.boundLeft}, {patternInfo.boundTop}) to (
              {patternInfo.boundRight}, {patternInfo.boundBottom})
            </span>
          </div>
        </div>
      )}

      {colorBlocks.length > 0 && (
        <div className="color-blocks">
          <h3>Color Blocks</h3>
          <div className="color-block-list">
            {colorBlocks.map((block, index) => {
              const isCompleted = currentStitch >= block.endStitch;
              const isCurrent = index === currentBlockIndex;
              const isPending = currentStitch < block.startStitch;

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
                  className={`color-block-item ${
                    isCompleted ? 'completed' : isCurrent ? 'current' : 'pending'
                  }`}
                >
                  <div className="block-header">
                    <div
                      className="color-swatch"
                      style={{ backgroundColor: block.threadHex }}
                      title={block.threadHex}
                    />
                    <span className="block-label">
                      Thread {block.colorIndex + 1}
                    </span>
                    <span className="block-status">
                      {isCompleted ? '✓' : isCurrent ? '→' : '○'}
                    </span>
                    <span className="block-stitches">
                      {block.stitchCount} stitches
                    </span>
                  </div>
                  {isCurrent && (
                    <div className="block-progress-bar">
                      <div
                        className="block-progress-fill"
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
        <div className="sewing-stats">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>

          <div className="detail-row">
            <span className="label">Current Stitch:</span>
            <span className="value">
              {sewingProgress.currentStitch} / {patternInfo?.totalStitches || 0}
            </span>
          </div>
          <div className="detail-row">
            <span className="label">Elapsed Time:</span>
            <span className="value">
              {Math.floor(sewingProgress.currentTime / 60)}:
              {(sewingProgress.currentTime % 60).toString().padStart(2, '0')}
            </span>
          </div>
          <div className="detail-row">
            <span className="label">Position:</span>
            <span className="value">
              ({(sewingProgress.positionX / 10).toFixed(1)}mm,{' '}
              {(sewingProgress.positionY / 10).toFixed(1)}mm)
            </span>
          </div>
          <div className="detail-row">
            <span className="label">Progress:</span>
            <span className="value">{progressPercent.toFixed(1)}%</span>
          </div>
        </div>
      )}

      {/* State Visual Indicator */}
      {patternInfo && (
        <div className={`state-indicator state-indicator-${stateVisual.color}`}>
          <span className="state-icon">{stateVisual.icon}</span>
          <div className="state-info">
            <div className="state-label">{stateVisual.label}</div>
            <div className="state-description">{stateVisual.description}</div>
          </div>
        </div>
      )}

      <div className="progress-actions">
        {/* Mask trace waiting for confirmation */}
        {isMaskTraceWait && (
          <div className="status-message warning">
            Press button on machine to start mask trace
          </div>
        )}

        {/* Mask trace in progress */}
        {isMaskTracing && (
          <div className="status-message info">
            Mask trace in progress...
          </div>
        )}

        {/* Mask trace complete - ready to sew */}
        {isMaskTraceComplete && (
          <>
            <div className="status-message success">
              Mask trace complete!
            </div>
            {canStartSewing(machineStatus) && (
              <button onClick={onStartSewing} className="btn-primary">
                Start Sewing
              </button>
            )}
            {canStartMaskTrace(machineStatus) && (
              <button onClick={onStartMaskTrace} className="btn-secondary">
                Trace Again
              </button>
            )}
          </>
        )}

        {/* Pattern uploaded, ready to trace */}
        {machineStatus === MachineStatus.IDLE && (
          <>
            <div className="status-message info">
              Pattern uploaded successfully
            </div>
            {canStartMaskTrace(machineStatus) && (
              <button onClick={onStartMaskTrace} className="btn-secondary">
                Start Mask Trace
              </button>
            )}
          </>
        )}

        {/* Ready to start (pattern uploaded) */}
        {machineStatus === MachineStatus.SEWING_WAIT && (
          <>
            {canStartMaskTrace(machineStatus) && (
              <button onClick={onStartMaskTrace} className="btn-secondary">
                Start Mask Trace
              </button>
            )}
            {canStartSewing(machineStatus) && (
              <button onClick={onStartSewing} className="btn-primary">
                Start Sewing
              </button>
            )}
          </>
        )}

        {/* Resume sewing for interrupted states */}
        {canResumeSewing(machineStatus) && (
          <button onClick={onResumeSewing} className="btn-primary">
            ▶️ Resume Sewing
          </button>
        )}

        {/* Color change needed */}
        {isColorChange && (
          <div className="status-message warning">
            Waiting for color change - change thread and press button on machine
          </div>
        )}

        {/* Sewing in progress */}
        {isSewing && (
          <div className="status-message info">
            Sewing in progress...
          </div>
        )}

        {/* Sewing complete */}
        {isComplete && (
          <div className="status-message success">
            Sewing complete!
          </div>
        )}

        {/* Delete pattern button - ONLY show when safe */}
        {patternInfo && canDeletePattern(machineStatus) && (
          <button onClick={onDeletePattern} className="btn-danger">
            Delete Pattern
          </button>
        )}

        {/* Show warning when delete is unavailable */}
        {patternInfo && !canDeletePattern(machineStatus) && (
          <div className="status-message info">
            Pattern cannot be deleted during active operations
          </div>
        )}
      </div>
    </div>
  );
}
