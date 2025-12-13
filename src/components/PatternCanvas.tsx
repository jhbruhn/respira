import { useEffect, useRef, useState, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useMachineStore } from '../stores/useMachineStore';
import { usePatternStore } from '../stores/usePatternStore';
import { Stage, Layer, Group } from 'react-konva';
import Konva from 'konva';
import { PlusIcon, MinusIcon, ArrowPathIcon, LockClosedIcon, PhotoIcon, ArrowsPointingInIcon } from '@heroicons/react/24/solid';
import type { PesPatternData } from '../utils/pystitchConverter';
import { calculateInitialScale } from '../utils/konvaRenderers';
import { Grid, Origin, Hoop, Stitches, PatternBounds, CurrentPosition } from './KonvaComponents';

export function PatternCanvas() {
  // Machine store
  const {
    sewingProgress,
    machineInfo,
    isUploading,
  } = useMachineStore(
    useShallow((state) => ({
      sewingProgress: state.sewingProgress,
      machineInfo: state.machineInfo,
      isUploading: state.isUploading,
    }))
  );

  // Pattern store
  const {
    pesData,
    patternOffset: initialPatternOffset,
    patternUploaded,
    setPatternOffset,
  } = usePatternStore(
    useShallow((state) => ({
      pesData: state.pesData,
      patternOffset: state.patternOffset,
      patternUploaded: state.patternUploaded,
      setPatternOffset: state.setPatternOffset,
    }))
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);

  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);
  const [localPatternOffset, setLocalPatternOffset] = useState(initialPatternOffset || { x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const initialScaleRef = useRef<number>(1);
  const prevPesDataRef = useRef<PesPatternData | null>(null);

  // Update pattern offset when initialPatternOffset changes
  if (initialPatternOffset && (
    localPatternOffset.x !== initialPatternOffset.x ||
    localPatternOffset.y !== initialPatternOffset.y
  )) {
    setLocalPatternOffset(initialPatternOffset);
    console.log('[PatternCanvas] Restored pattern offset:', initialPatternOffset);
  }

  // Track container size
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        setContainerSize({ width, height });
      }
    };

    // Initial size
    updateSize();

    // Watch for resize
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  // Calculate and store initial scale when pattern or hoop changes
  useEffect(() => {
    if (!pesData || containerSize.width === 0) {
      prevPesDataRef.current = null;
      return;
    }

    // Only recalculate if pattern changed
    if (prevPesDataRef.current !== pesData) {
      prevPesDataRef.current = pesData;

      const { bounds } = pesData;
      const viewWidth = machineInfo ? machineInfo.maxWidth : bounds.maxX - bounds.minX;
      const viewHeight = machineInfo ? machineInfo.maxHeight : bounds.maxY - bounds.minY;

      const initialScale = calculateInitialScale(containerSize.width, containerSize.height, viewWidth, viewHeight);
      initialScaleRef.current = initialScale;

      // Reset view when pattern changes
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStageScale(initialScale);
      setStagePos({ x: containerSize.width / 2, y: containerSize.height / 2 });
    }
  }, [pesData, machineInfo, containerSize]);

  // Wheel zoom handler
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const stage = e.target.getStage();
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.1;
    const direction = e.evt.deltaY > 0 ? -1 : 1;

    setStageScale((oldScale) => {
      const newScale = Math.max(0.1, Math.min(direction > 0 ? oldScale * scaleBy : oldScale / scaleBy, 2));

      // Zoom towards pointer
      setStagePos((prevPos) => {
        const mousePointTo = {
          x: (pointer.x - prevPos.x) / oldScale,
          y: (pointer.y - prevPos.y) / oldScale,
        };

        return {
          x: pointer.x - mousePointTo.x * newScale,
          y: pointer.y - mousePointTo.y * newScale,
        };
      });

      return newScale;
    });
  }, []);

  // Zoom control handlers
  const handleZoomIn = useCallback(() => {
    setStageScale((oldScale) => {
      const newScale = Math.max(0.1, Math.min(oldScale * 1.2, 2));

      // Zoom towards center of viewport
      setStagePos((prevPos) => {
        const centerX = containerSize.width / 2;
        const centerY = containerSize.height / 2;

        const mousePointTo = {
          x: (centerX - prevPos.x) / oldScale,
          y: (centerY - prevPos.y) / oldScale,
        };

        return {
          x: centerX - mousePointTo.x * newScale,
          y: centerY - mousePointTo.y * newScale,
        };
      });

      return newScale;
    });
  }, [containerSize]);

  const handleZoomOut = useCallback(() => {
    setStageScale((oldScale) => {
      const newScale = Math.max(0.1, Math.min(oldScale / 1.2, 2));

      // Zoom towards center of viewport
      setStagePos((prevPos) => {
        const centerX = containerSize.width / 2;
        const centerY = containerSize.height / 2;

        const mousePointTo = {
          x: (centerX - prevPos.x) / oldScale,
          y: (centerY - prevPos.y) / oldScale,
        };

        return {
          x: centerX - mousePointTo.x * newScale,
          y: centerY - mousePointTo.y * newScale,
        };
      });

      return newScale;
    });
  }, [containerSize]);

  const handleZoomReset = useCallback(() => {
    const initialScale = initialScaleRef.current;
    setStageScale(initialScale);
    setStagePos({ x: containerSize.width / 2, y: containerSize.height / 2 });
  }, [containerSize]);

  const handleCenterPattern = useCallback(() => {
    if (!pesData) return;

    const { bounds } = pesData;
    const centerOffsetX = -(bounds.minX + bounds.maxX) / 2;
    const centerOffsetY = -(bounds.minY + bounds.maxY) / 2;

    setLocalPatternOffset({ x: centerOffsetX, y: centerOffsetY });
    setPatternOffset(centerOffsetX, centerOffsetY);
  }, [pesData, setPatternOffset]);

  // Pattern drag handlers
  const handlePatternDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const newOffset = {
      x: e.target.x(),
      y: e.target.y(),
    };
    setLocalPatternOffset(newOffset);
    setPatternOffset(newOffset.x, newOffset.y);
  }, [setPatternOffset]);

  const borderColor = pesData ? 'border-teal-600 dark:border-teal-500' : 'border-gray-400 dark:border-gray-600';
  const iconColor = pesData ? 'text-teal-600 dark:text-teal-400' : 'text-gray-600 dark:text-gray-400';

  return (
    <div className={`lg:h-full bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border-l-4 ${borderColor} flex flex-col`}>
      <div className="flex items-start gap-3 mb-3 flex-shrink-0">
        <PhotoIcon className={`w-6 h-6 ${iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Pattern Preview</h3>
          {pesData ? (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {((pesData.bounds.maxX - pesData.bounds.minX) / 10).toFixed(1)} × {((pesData.bounds.maxY - pesData.bounds.minY) / 10).toFixed(1)} mm
            </p>
          ) : (
            <p className="text-xs text-gray-600 dark:text-gray-400">No pattern loaded</p>
          )}
        </div>
      </div>
      <div className="relative w-full h-[400px] sm:h-[500px] lg:flex-1 lg:min-h-0 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-900 overflow-hidden" ref={containerRef}>
        {containerSize.width > 0 && (
          <Stage
            width={containerSize.width}
            height={containerSize.height}
            x={stagePos.x}
            y={stagePos.y}
            scaleX={stageScale}
            scaleY={stageScale}
            draggable
            onWheel={handleWheel}
          onDragStart={() => {
            if (stageRef.current) {
              stageRef.current.container().style.cursor = 'grabbing';
            }
          }}
          onDragEnd={() => {
            if (stageRef.current) {
              stageRef.current.container().style.cursor = 'grab';
            }
          }}
          ref={(node) => {
            stageRef.current = node;
            if (node) {
              node.container().style.cursor = 'grab';
            }
          }}
        >
          {/* Background layer: grid, origin, hoop */}
          <Layer>
            {pesData && (
              <>
                <Grid
                  gridSize={100}
                  bounds={pesData.bounds}
                  machineInfo={machineInfo}
                />
                <Origin />
                {machineInfo && <Hoop machineInfo={machineInfo} />}
              </>
            )}
          </Layer>

          {/* Pattern layer: draggable stitches and bounds */}
          <Layer>
            {pesData && (
              <Group
                name="pattern-group"
                draggable={!patternUploaded && !isUploading}
                x={localPatternOffset.x}
                y={localPatternOffset.y}
                onDragEnd={handlePatternDragEnd}
                onMouseEnter={(e) => {
                  const stage = e.target.getStage();
                  if (stage && !patternUploaded && !isUploading) stage.container().style.cursor = 'move';
                }}
                onMouseLeave={(e) => {
                  const stage = e.target.getStage();
                  if (stage && !patternUploaded && !isUploading) stage.container().style.cursor = 'grab';
                }}
              >
                <Stitches
                  stitches={pesData.stitches}
                  pesData={pesData}
                  currentStitchIndex={sewingProgress?.currentStitch || 0}
                  showProgress={patternUploaded || isUploading}
                />
                <PatternBounds bounds={pesData.bounds} />
              </Group>
            )}
          </Layer>

          {/* Current position layer */}
          <Layer>
            {pesData && sewingProgress && sewingProgress.currentStitch > 0 && (
              <Group x={localPatternOffset.x} y={localPatternOffset.y}>
                <CurrentPosition
                  currentStitchIndex={sewingProgress.currentStitch}
                  stitches={pesData.stitches}
                />
              </Group>
            )}
          </Layer>
        </Stage>
        )}

        {/* Placeholder overlay when no pattern is loaded */}
        {!pesData && (
          <div className="flex items-center justify-center h-full text-gray-600 dark:text-gray-400 italic">
            Load a PES file to preview the pattern
          </div>
        )}

        {/* Pattern info overlays */}
        {pesData && (
          <>
            {/* Thread Legend Overlay */}
            <div className="absolute top-2 sm:top-2.5 left-2 sm:left-2.5 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm p-2 sm:p-2.5 rounded-lg shadow-lg z-10 max-w-[150px] sm:max-w-[180px] lg:max-w-[200px]">
              <h4 className="m-0 mb-1.5 sm:mb-2 text-xs font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-300 dark:border-gray-600 pb-1 sm:pb-1.5">Colors</h4>
              {pesData.uniqueColors.map((color, idx) => {
                // Primary metadata: brand and catalog number
                const primaryMetadata = [
                  color.brand,
                  color.catalogNumber ? `#${color.catalogNumber}` : null
                ].filter(Boolean).join(" ");

                // Secondary metadata: chart and description
                const secondaryMetadata = [
                  color.chart,
                  color.description
                ].filter(Boolean).join(" ");

                return (
                  <div key={idx} className="flex items-start gap-1.5 sm:gap-2 mb-1 sm:mb-1.5 last:mb-0">
                    <div
                      className="w-3 h-3 sm:w-4 sm:h-4 rounded border border-black dark:border-gray-300 flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: color.hex }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                        Color {idx + 1}
                      </div>
                      {(primaryMetadata || secondaryMetadata) && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 leading-tight mt-0.5 break-words">
                          {primaryMetadata}
                          {primaryMetadata && secondaryMetadata && <span className="mx-1">•</span>}
                          {secondaryMetadata}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pattern Offset Indicator */}
            <div className={`absolute bottom-16 sm:bottom-20 right-2 sm:right-5 backdrop-blur-sm p-2 sm:p-2.5 px-2.5 sm:px-3.5 rounded-lg shadow-lg z-[11] min-w-[160px] sm:min-w-[180px] transition-colors ${
              patternUploaded ? 'bg-amber-50/95 dark:bg-amber-900/80 border-2 border-amber-300 dark:border-amber-600' : 'bg-white/95 dark:bg-gray-800/95'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Pattern Position:</div>
                {patternUploaded && (
                  <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <LockClosedIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span className="text-xs font-bold">LOCKED</span>
                  </div>
                )}
              </div>
              <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1">
                X: {(localPatternOffset.x / 10).toFixed(1)}mm, Y: {(localPatternOffset.y / 10).toFixed(1)}mm
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 italic">
                {patternUploaded ? 'Pattern locked • Drag background to pan' : 'Drag pattern to move • Drag background to pan'}
              </div>
            </div>

            {/* Zoom Controls Overlay */}
            <div className="absolute bottom-2 sm:bottom-5 right-2 sm:right-5 flex gap-1.5 sm:gap-2 items-center bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg shadow-lg z-10">
              <button className="w-7 h-7 sm:w-8 sm:h-8 p-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded cursor-pointer transition-all flex items-center justify-center hover:bg-blue-600 hover:text-white hover:border-blue-600 dark:hover:border-blue-600 hover:shadow-md hover:shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleCenterPattern} disabled={!pesData || patternUploaded || isUploading} title="Center Pattern in Hoop">
                <ArrowsPointingInIcon className="w-4 h-4 sm:w-5 sm:h-5 dark:text-gray-200" />
              </button>
              <button className="w-7 h-7 sm:w-8 sm:h-8 p-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded cursor-pointer transition-all flex items-center justify-center hover:bg-blue-600 hover:text-white hover:border-blue-600 dark:hover:border-blue-600 hover:shadow-md hover:shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleZoomIn} title="Zoom In">
                <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5 dark:text-gray-200" />
              </button>
              <span className="min-w-[40px] sm:min-w-[50px] text-center text-sm font-semibold text-gray-900 dark:text-gray-100 select-none">{Math.round(stageScale * 100)}%</span>
              <button className="w-7 h-7 sm:w-8 sm:h-8 p-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded cursor-pointer transition-all flex items-center justify-center hover:bg-blue-600 hover:text-white hover:border-blue-600 dark:hover:border-blue-600 hover:shadow-md hover:shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleZoomOut} title="Zoom Out">
                <MinusIcon className="w-4 h-4 sm:w-5 sm:h-5 dark:text-gray-200" />
              </button>
              <button className="w-7 h-7 sm:w-8 sm:h-8 p-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded cursor-pointer transition-all flex items-center justify-center hover:bg-blue-600 hover:text-white hover:border-blue-600 dark:hover:border-blue-600 hover:shadow-md hover:shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed ml-1" onClick={handleZoomReset} title="Reset Zoom">
                <ArrowPathIcon className="w-4 h-4 sm:w-5 sm:h-5 dark:text-gray-200" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
