/**
 * usePatternTransform Hook
 *
 * Manages pattern transformation state including position, rotation, and drag/transform handling
 * Syncs local state with global pattern store
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { PesPatternData } from "../formats/import/pesImporter";

interface UsePatternTransformOptions {
  pesData: PesPatternData | null;
  initialPatternOffset: { x: number; y: number };
  initialPatternRotation: number;
  setPatternOffset: (x: number, y: number) => void;
  setPatternRotation: (rotation: number) => void;
  patternUploaded: boolean;
  isUploading: boolean;
}

export function usePatternTransform({
  pesData,
  initialPatternOffset,
  initialPatternRotation,
  setPatternOffset,
  setPatternRotation,
  patternUploaded,
  isUploading,
}: UsePatternTransformOptions) {
  const [localPatternOffset, setLocalPatternOffset] = useState(
    initialPatternOffset || { x: 0, y: 0 },
  );
  const [localPatternRotation, setLocalPatternRotation] = useState(
    initialPatternRotation || 0,
  );

  const patternGroupRef = useRef<Konva.Group | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);

  // Update pattern offset when initialPatternOffset changes
  if (
    initialPatternOffset &&
    (localPatternOffset.x !== initialPatternOffset.x ||
      localPatternOffset.y !== initialPatternOffset.y)
  ) {
    setLocalPatternOffset(initialPatternOffset);
  }

  // Update pattern rotation when initialPatternRotation changes
  if (
    initialPatternRotation !== undefined &&
    localPatternRotation !== initialPatternRotation
  ) {
    setLocalPatternRotation(initialPatternRotation);
  }

  // Attach/detach transformer based on state
  const attachTransformer = useCallback(() => {
    if (!transformerRef.current || !patternGroupRef.current) {
      return;
    }

    if (!patternUploaded && !isUploading) {
      transformerRef.current.nodes([patternGroupRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    } else {
      transformerRef.current.nodes([]);
    }
  }, [patternUploaded, isUploading]);

  // Call attachTransformer when conditions change
  useEffect(() => {
    attachTransformer();
  }, [attachTransformer, pesData]);

  // Sync node rotation with state (important for when rotation is reset to 0 after upload)
  useEffect(() => {
    if (patternGroupRef.current) {
      patternGroupRef.current.rotation(localPatternRotation);
    }
  }, [localPatternRotation]);

  // Center pattern in hoop
  const handleCenterPattern = useCallback(() => {
    if (!pesData) return;

    // Since the pattern Group uses offsetX/offsetY to set its pivot point at the pattern center,
    // we just need to position it at the origin (0, 0) to center it in the hoop
    const centerOffset = { x: 0, y: 0 };

    setLocalPatternOffset(centerOffset);
    setPatternOffset(centerOffset.x, centerOffset.y);
  }, [pesData, setPatternOffset]);

  // Pattern drag handlers
  const handlePatternDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const newOffset = {
        x: e.target.x(),
        y: e.target.y(),
      };
      setLocalPatternOffset(newOffset);
      setPatternOffset(newOffset.x, newOffset.y);
    },
    [setPatternOffset],
  );

  // Handle transformer rotation - just store the angle, apply at upload time
  const handleTransformEnd = useCallback(
    (e: KonvaEventObject<Event>) => {
      if (!pesData) return;

      const node = e.target;
      // Read rotation from the node
      const totalRotation = node.rotation();
      const normalizedRotation = ((totalRotation % 360) + 360) % 360;

      setLocalPatternRotation(normalizedRotation);

      // Also read position in case the Transformer affected it
      const newOffset = {
        x: node.x(),
        y: node.y(),
      };
      setLocalPatternOffset(newOffset);

      // Store rotation angle and position
      setPatternRotation(normalizedRotation);
      setPatternOffset(newOffset.x, newOffset.y);
    },
    [setPatternRotation, setPatternOffset, pesData],
  );

  return {
    // State
    localPatternOffset,
    localPatternRotation,

    // Refs
    patternGroupRef,
    transformerRef,

    // Handlers
    attachTransformer,
    handleCenterPattern,
    handlePatternDragEnd,
    handleTransformEnd,
  };
}
