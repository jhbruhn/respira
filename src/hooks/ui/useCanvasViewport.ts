/**
 * useCanvasViewport Hook
 *
 * Manages canvas viewport state including zoom, pan, and container size
 * Handles wheel zoom, button zoom operations, and stage drag cursor updates
 */

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type RefObject,
} from "react";
import type Konva from "konva";
import type { PesPatternData } from "../../formats/import/pesImporter";
import type { MachineInfo } from "../../types/machine";
import { calculateInitialScale } from "../../utils/konvaRenderers";
import { calculateZoomToPoint } from "../../components/PatternCanvas/patternCanvasHelpers";

interface UseCanvasViewportOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  pesData: PesPatternData | null;
  uploadedPesData: PesPatternData | null;
  machineInfo: MachineInfo | null;
}

export function useCanvasViewport({
  containerRef,
  pesData,
  uploadedPesData,
  machineInfo,
}: UseCanvasViewportOptions) {
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [initialScale, setInitialScale] = useState(1);

  // Track the last processed pattern to detect changes during render
  const [lastProcessedPattern, setLastProcessedPattern] =
    useState<PesPatternData | null>(null);

  // Track container size with ResizeObserver
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
  }, [containerRef]);

  // Reset viewport when pattern changes (during render, not in effect)
  // This follows the React-recommended pattern for deriving state from props
  const currentPattern = uploadedPesData || pesData;
  if (
    currentPattern &&
    currentPattern !== lastProcessedPattern &&
    containerSize.width > 0
  ) {
    const { bounds } = currentPattern;
    const viewWidth = machineInfo
      ? machineInfo.maxWidth
      : bounds.maxX - bounds.minX;
    const viewHeight = machineInfo
      ? machineInfo.maxHeight
      : bounds.maxY - bounds.minY;

    const newInitialScale = calculateInitialScale(
      containerSize.width,
      containerSize.height,
      viewWidth,
      viewHeight,
    );

    // Update state during render when pattern changes
    // This is the recommended React pattern for resetting state based on props
    setLastProcessedPattern(currentPattern);
    setInitialScale(newInitialScale);
    setStageScale(newInitialScale);
    setStagePos({ x: containerSize.width / 2, y: containerSize.height / 2 });
  }

  // Wheel zoom handler with RAF throttling and delta accumulation
  const wheelThrottleRef = useRef<number | null>(null);
  const accumulatedDeltaRef = useRef<number>(0);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const lastStageRef = useRef<Konva.Stage | null>(null);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const stage = e.target.getStage();
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Accumulate deltaY from all events during throttle period
    accumulatedDeltaRef.current += e.evt.deltaY;
    lastPointerRef.current = pointer;
    lastStageRef.current = stage;

    // Skip if throttle already in progress
    if (wheelThrottleRef.current !== null) {
      return;
    }

    // Schedule update on next animation frame (~16ms)
    wheelThrottleRef.current = requestAnimationFrame(() => {
      const accumulatedDelta = accumulatedDeltaRef.current;
      const pointer = lastPointerRef.current;
      const stage = lastStageRef.current;

      if (!pointer || !stage || accumulatedDelta === 0) {
        wheelThrottleRef.current = null;
        accumulatedDeltaRef.current = 0;
        return;
      }

      const scaleBy = 1.1;
      const direction = accumulatedDelta > 0 ? -1 : 1;

      setStageScale((oldScale) => {
        const newScale = Math.max(
          0.1,
          Math.min(direction > 0 ? oldScale * scaleBy : oldScale / scaleBy, 2),
        );

        // Zoom towards pointer
        setStagePos((prevPos) =>
          calculateZoomToPoint(oldScale, newScale, pointer, prevPos),
        );

        return newScale;
      });

      // Reset accumulator and throttle
      wheelThrottleRef.current = null;
      accumulatedDeltaRef.current = 0;
    });
  }, []);

  // Cleanup wheel throttle on unmount
  useEffect(() => {
    return () => {
      if (wheelThrottleRef.current !== null) {
        cancelAnimationFrame(wheelThrottleRef.current);
      }
    };
  }, []);

  // Zoom control handlers
  const handleZoomIn = useCallback(() => {
    setStageScale((oldScale) => {
      const newScale = Math.max(0.1, Math.min(oldScale * 1.2, 2));

      // Zoom towards center of viewport
      const center = {
        x: containerSize.width / 2,
        y: containerSize.height / 2,
      };
      setStagePos((prevPos) =>
        calculateZoomToPoint(oldScale, newScale, center, prevPos),
      );

      return newScale;
    });
  }, [containerSize]);

  const handleZoomOut = useCallback(() => {
    setStageScale((oldScale) => {
      const newScale = Math.max(0.1, Math.min(oldScale / 1.2, 2));

      // Zoom towards center of viewport
      const center = {
        x: containerSize.width / 2,
        y: containerSize.height / 2,
      };
      setStagePos((prevPos) =>
        calculateZoomToPoint(oldScale, newScale, center, prevPos),
      );

      return newScale;
    });
  }, [containerSize]);

  const handleZoomReset = useCallback(() => {
    setStageScale(initialScale);
    setStagePos({ x: containerSize.width / 2, y: containerSize.height / 2 });
  }, [initialScale, containerSize]);

  // Stage drag handlers - cursor updates immediately for better UX
  const handleStageDragStart = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const stage = e.target.getStage();
      if (stage) {
        stage.container().style.cursor = "grabbing";
      }
    },
    [],
  );

  const handleStageDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const stage = e.target.getStage();
      if (stage) {
        stage.container().style.cursor = "grab";
      }
    },
    [],
  );

  return {
    // State
    stagePos,
    stageScale,
    containerSize,

    // Handlers
    handleWheel,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    handleStageDragStart,
    handleStageDragEnd,
  };
}
