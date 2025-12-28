/**
 * useCanvasViewport Hook
 *
 * Manages canvas viewport state including zoom, pan, and container size
 * Handles wheel zoom and button zoom operations
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

  // Wheel zoom handler with RAF throttling
  const wheelThrottleRef = useRef<number | null>(null);
  const wheelEventRef = useRef<Konva.KonvaEventObject<WheelEvent> | null>(null);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    // Store the latest event
    wheelEventRef.current = e;

    // Cancel pending throttle if it exists
    if (wheelThrottleRef.current !== null) {
      return; // Throttle in progress, skip this event
    }

    // Schedule update on next animation frame (~16ms)
    wheelThrottleRef.current = requestAnimationFrame(() => {
      const throttledEvent = wheelEventRef.current;
      if (!throttledEvent) {
        wheelThrottleRef.current = null;
        return;
      }

      const stage = throttledEvent.target.getStage();
      if (!stage) {
        wheelThrottleRef.current = null;
        return;
      }

      const pointer = stage.getPointerPosition();
      if (!pointer) {
        wheelThrottleRef.current = null;
        return;
      }

      const scaleBy = 1.1;
      const direction = throttledEvent.evt.deltaY > 0 ? -1 : 1;

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

      wheelThrottleRef.current = null;
      wheelEventRef.current = null;
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

  // Stage drag handlers with throttled cursor updates
  const lastCursorUpdateRef = useRef<number>(0);

  const handleStageDragStart = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const now = Date.now();
      // Throttle cursor updates to ~60fps (16ms)
      if (now - lastCursorUpdateRef.current > 16) {
        const stage = e.target.getStage();
        if (stage) {
          stage.container().style.cursor = "grabbing";
        }
        lastCursorUpdateRef.current = now;
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
      lastCursorUpdateRef.current = 0;
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
