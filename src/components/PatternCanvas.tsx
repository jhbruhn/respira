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
  const initialScaleRef = useRef<number>(1);

  // Calculate initial scale when pattern or hoop changes
  useEffect(() => {
    if (!pesData || !containerRef.current) return;

    const { bounds } = pesData;
    const viewWidth = machineInfo ? machineInfo.maxWidth : bounds.maxX - bounds.minX;
    const viewHeight = machineInfo ? machineInfo.maxHeight : bounds.maxY - bounds.minY;

    const width = containerRef.current.offsetWidth;
    const height = containerRef.current.offsetHeight;

    const initialScale = calculateInitialScale(width, height, viewWidth, viewHeight);
    initialScaleRef.current = initialScale;

    // Set initial scale and center position when pattern loads
    setStageScale(initialScale);
    setStagePos({ x: width / 2, y: height / 2 });
  }, [pesData, machineInfo]);

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
    const newScale = Math.min(stageScale * 1.2, 10);
    setStageScale(newScale);
  }, [stageScale]);

  const handleZoomOut = useCallback(() => {
    const newScale = Math.max(stageScale / 1.2, 0.1);
    setStageScale(newScale);
  }, [stageScale]);

  const handleZoomReset = useCallback(() => {
    if (!containerRef.current) return;
    const initialScale = initialScaleRef.current;
    setStageScale(initialScale);
    setStagePos({ x: containerRef.current.offsetWidth / 2, y: containerRef.current.offsetHeight / 2 });
  }, []);

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
    <div className="canvas-panel">
      <h2>Pattern Preview</h2>
      <div className="canvas-container" ref={containerRef} style={{ width: '100%', height: '600px' }}>
        {containerRef.current && (
          <Stage
            width={containerRef.current.offsetWidth}
            height={containerRef.current.offsetHeight}
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
          <div className="canvas-placeholder">
            Load a PES file to preview the pattern
          </div>
        )}

        {/* Pattern info overlays */}
        {pesData && (
          <>
            {/* Thread Legend Overlay */}
            <div className="canvas-legend">
              <h4>Threads</h4>
              {pesData.threads.map((thread, index) => (
                <div key={index} className="legend-item">
                  <div
                    className="legend-swatch"
                    style={{ backgroundColor: thread.hex }}
                  />
                  <span className="legend-label">Thread {index + 1}</span>
                </div>
              ))}
            </div>

            {/* Pattern Dimensions Overlay */}
            <div className="canvas-dimensions">
              {((pesData.bounds.maxX - pesData.bounds.minX) / 10).toFixed(1)} x{' '}
              {((pesData.bounds.maxY - pesData.bounds.minY) / 10).toFixed(1)} mm
            </div>

            {/* Pattern Offset Indicator */}
            <div className="canvas-offset-info">
              <div className="offset-label">Pattern Position:</div>
              <div className="offset-value">
                X: {(patternOffset.x / 10).toFixed(1)}mm, Y: {(patternOffset.y / 10).toFixed(1)}mm
              </div>
              <div className="offset-hint">
                Drag pattern to move • Drag background to pan
              </div>
            </div>

            {/* Zoom Controls Overlay */}
            <div className="zoom-controls">
              <button className="zoom-btn" onClick={handleZoomIn} title="Zoom In">
                +
              </button>
              <span className="zoom-level">{Math.round(stageScale * 100)}%</span>
              <button className="zoom-btn" onClick={handleZoomOut} title="Zoom Out">
                −
              </button>
              <button className="zoom-btn zoom-reset" onClick={handleZoomReset} title="Reset Zoom">
                ⟲
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
