import { useEffect, useRef, useState, useCallback } from 'react';
import { Stage, Layer, Group } from 'react-konva';
import Konva from 'konva';
import type { PesPatternData } from '../utils/pystitchConverter';
import type { SewingProgress, MachineInfo } from '../types/machine';
import {
  renderGrid,
  renderOrigin,
  renderHoop,
  renderStitches,
  renderPatternBounds,
  calculateInitialScale,
} from '../utils/konvaRenderers';

interface PatternCanvasProps {
  pesData: PesPatternData | null;
  sewingProgress: SewingProgress | null;
  machineInfo: MachineInfo | null;
  onPatternOffsetChange?: (offsetX: number, offsetY: number) => void;
}

export function PatternCanvas({ pesData, sewingProgress, machineInfo, onPatternOffsetChange }: PatternCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const backgroundLayerRef = useRef<Konva.Layer | null>(null);
  const patternLayerRef = useRef<Konva.Layer | null>(null);

  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);
  const [patternOffset, setPatternOffset] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const initialScaleRef = useRef<number>(1);

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

  // Calculate initial scale when pattern or hoop changes
  useEffect(() => {
    if (!pesData || containerSize.width === 0) return;

    const { bounds } = pesData;
    const viewWidth = machineInfo ? machineInfo.maxWidth : bounds.maxX - bounds.minX;
    const viewHeight = machineInfo ? machineInfo.maxHeight : bounds.maxY - bounds.minY;

    const initialScale = calculateInitialScale(containerSize.width, containerSize.height, viewWidth, viewHeight);
    initialScaleRef.current = initialScale;

    // Set initial scale and center position when pattern loads
    setStageScale(initialScale);
    setStagePos({ x: containerSize.width / 2, y: containerSize.height / 2 });
  }, [pesData, machineInfo, containerSize]);

  // Wheel zoom handler
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const stage = e.target.getStage();
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.1;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    let newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

    // Apply constraints
    newScale = Math.max(0.1, Math.min(10, newScale));

    // Zoom towards pointer
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    setStageScale(newScale);
    setStagePos(newPos);
  }, []);

  // Zoom control handlers
  const handleZoomIn = useCallback(() => {
    const oldScale = stageScale;
    const newScale = Math.min(oldScale * 1.2, 10);

    // Zoom towards center of viewport
    const centerX = containerSize.width / 2;
    const centerY = containerSize.height / 2;

    const mousePointTo = {
      x: (centerX - stagePos.x) / oldScale,
      y: (centerY - stagePos.y) / oldScale,
    };

    const newPos = {
      x: centerX - mousePointTo.x * newScale,
      y: centerY - mousePointTo.y * newScale,
    };

    setStageScale(newScale);
    setStagePos(newPos);
  }, [stageScale, stagePos, containerSize]);

  const handleZoomOut = useCallback(() => {
    const oldScale = stageScale;
    const newScale = Math.max(oldScale / 1.2, 0.1);

    // Zoom towards center of viewport
    const centerX = containerSize.width / 2;
    const centerY = containerSize.height / 2;

    const mousePointTo = {
      x: (centerX - stagePos.x) / oldScale,
      y: (centerY - stagePos.y) / oldScale,
    };

    const newPos = {
      x: centerX - mousePointTo.x * newScale,
      y: centerY - mousePointTo.y * newScale,
    };

    setStageScale(newScale);
    setStagePos(newPos);
  }, [stageScale, stagePos, containerSize]);

  const handleZoomReset = useCallback(() => {
    const initialScale = initialScaleRef.current;
    setStageScale(initialScale);
    setStagePos({ x: containerSize.width / 2, y: containerSize.height / 2 });
  }, [containerSize]);

  // Pattern drag handlers
  const handlePatternDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const newOffset = {
      x: e.target.x(),
      y: e.target.y(),
    };
    setPatternOffset(newOffset);

    if (onPatternOffsetChange) {
      onPatternOffsetChange(newOffset.x, newOffset.y);
    }
  }, [onPatternOffsetChange]);

  const handlePatternDragMove = useCallback(() => {
    // Just for visual feedback during drag
  }, []);

  // Render background layer content
  const renderBackgroundLayer = useCallback((layer: Konva.Layer) => {
    if (!pesData) return;

    layer.destroyChildren();

    const { bounds } = pesData;
    const gridSize = 100; // 10mm grid (100 units in 0.1mm)

    renderGrid(layer, gridSize, bounds, machineInfo);
    renderOrigin(layer);

    if (machineInfo) {
      renderHoop(layer, machineInfo);
    }

    layer.batchDraw();
  }, [pesData, machineInfo]);

  // Render pattern layer content
  const renderPatternLayer = useCallback((layer: Konva.Layer, group: Konva.Group) => {
    if (!pesData) return;

    group.destroyChildren();

    const currentStitch = sewingProgress?.currentStitch || 0;
    const { stitches, bounds } = pesData;

    renderStitches(group, stitches, pesData, currentStitch);
    renderPatternBounds(group, bounds);

    layer.batchDraw();
  }, [pesData, sewingProgress]);

  // Update background layer when deps change
  useEffect(() => {
    if (backgroundLayerRef.current) {
      renderBackgroundLayer(backgroundLayerRef.current);
    }
  }, [renderBackgroundLayer]);

  // Update pattern layer when deps change
  useEffect(() => {
    if (patternLayerRef.current) {
      const patternGroup = patternLayerRef.current.findOne('.pattern-group') as Konva.Group;
      if (patternGroup) {
        renderPatternLayer(patternLayerRef.current, patternGroup);
      }
    }
  }, [renderPatternLayer]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 pb-2 border-b-2 border-gray-300">Pattern Preview</h2>
      <div className="relative w-full h-[600px] border border-gray-300 rounded bg-gray-50 overflow-hidden" ref={containerRef}>
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
          <Layer ref={backgroundLayerRef} />

          {/* Pattern layer: draggable stitches and bounds */}
          <Layer ref={patternLayerRef}>
            {pesData && (
              <Group
                name="pattern-group"
                draggable
                x={patternOffset.x}
                y={patternOffset.y}
                onDragEnd={handlePatternDragEnd}
                onDragMove={handlePatternDragMove}
                onMouseEnter={(e) => {
                  const stage = e.target.getStage();
                  if (stage) stage.container().style.cursor = 'move';
                }}
                onMouseLeave={(e) => {
                  const stage = e.target.getStage();
                  if (stage) stage.container().style.cursor = 'grab';
                }}
              />
            )}
          </Layer>

          {/* Current position layer */}
          <Layer>
            {pesData && sewingProgress && sewingProgress.currentStitch > 0 && (
              <Group x={patternOffset.x} y={patternOffset.y} />
            )}
          </Layer>
        </Stage>
        )}

        {/* Placeholder overlay when no pattern is loaded */}
        {!pesData && (
          <div className="flex items-center justify-center h-[600px] text-gray-600 italic">
            Load a PES file to preview the pattern
          </div>
        )}

        {/* Pattern info overlays */}
        {pesData && (
          <>
            {/* Thread Legend Overlay */}
            <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-lg z-10 max-w-[150px]">
              <h4 className="m-0 mb-2 text-[13px] font-semibold text-gray-900 border-b border-gray-300 pb-1.5">Threads</h4>
              {pesData.threads.map((thread, index) => (
                <div key={index} className="flex items-center gap-2 mb-1.5 last:mb-0">
                  <div
                    className="w-5 h-5 rounded border border-black flex-shrink-0"
                    style={{ backgroundColor: thread.hex }}
                  />
                  <span className="text-xs text-gray-900">Thread {index + 1}</span>
                </div>
              ))}
            </div>

            {/* Pattern Dimensions Overlay */}
            <div className="absolute bottom-[165px] right-5 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg z-[11] text-sm font-semibold text-gray-900">
              {((pesData.bounds.maxX - pesData.bounds.minX) / 10).toFixed(1)} x{' '}
              {((pesData.bounds.maxY - pesData.bounds.minY) / 10).toFixed(1)} mm
            </div>

            {/* Pattern Offset Indicator */}
            <div className="absolute bottom-20 right-5 bg-white/95 backdrop-blur-sm p-2.5 px-3.5 rounded-lg shadow-lg z-[11] min-w-[180px]">
              <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-1">Pattern Position:</div>
              <div className="text-[13px] font-semibold text-blue-600 mb-1">
                X: {(patternOffset.x / 10).toFixed(1)}mm, Y: {(patternOffset.y / 10).toFixed(1)}mm
              </div>
              <div className="text-[10px] text-gray-600 italic">
                Drag pattern to move • Drag background to pan
              </div>
            </div>

            {/* Zoom Controls Overlay */}
            <div className="absolute bottom-5 right-5 flex gap-2 items-center bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg z-10">
              <button className="w-8 h-8 p-0 text-lg font-bold border border-gray-300 bg-white rounded cursor-pointer transition-all flex items-center justify-center hover:bg-blue-600 hover:text-white hover:border-blue-600 hover:-translate-y-0.5 hover:shadow-md hover:shadow-blue-600/30 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleZoomIn} title="Zoom In">
                +
              </button>
              <span className="min-w-[50px] text-center text-[13px] font-semibold text-gray-900 select-none">{Math.round(stageScale * 100)}%</span>
              <button className="w-8 h-8 p-0 text-lg font-bold border border-gray-300 bg-white rounded cursor-pointer transition-all flex items-center justify-center hover:bg-blue-600 hover:text-white hover:border-blue-600 hover:-translate-y-0.5 hover:shadow-md hover:shadow-blue-600/30 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleZoomOut} title="Zoom Out">
                −
              </button>
              <button className="w-8 h-8 p-0 text-xl font-bold border border-gray-300 bg-white rounded cursor-pointer transition-all flex items-center justify-center hover:bg-blue-600 hover:text-white hover:border-blue-600 hover:-translate-y-0.5 hover:shadow-md hover:shadow-blue-600/30 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed ml-1" onClick={handleZoomReset} title="Reset Zoom">
                ⟲
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
