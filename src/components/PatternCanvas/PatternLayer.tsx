/**
 * PatternLayer Component
 *
 * Unified component for rendering pattern layers (both original and uploaded)
 * Handles both interactive (draggable/rotatable) and locked states
 */

import { useMemo, type RefObject } from "react";
import { Group, Transformer } from "react-konva";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { PesPatternData } from "../../formats/import/pesImporter";
import {
  calculatePatternCenter,
  convertPenStitchesToPesFormat,
} from "./patternCanvasHelpers";
import { Stitches, PatternBounds, CurrentPosition } from "../KonvaComponents";

interface PatternLayerProps {
  pesData: PesPatternData;
  offset: { x: number; y: number };
  rotation?: number;
  isInteractive: boolean;
  showProgress?: boolean;
  currentStitchIndex?: number;
  patternGroupRef?: RefObject<Konva.Group | null>;
  transformerRef?: RefObject<Konva.Transformer | null>;
  onDragEnd?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd?: (e: KonvaEventObject<Event>) => void;
  attachTransformer?: () => void;
}

export function PatternLayer({
  pesData,
  offset,
  rotation = 0,
  isInteractive,
  showProgress = false,
  currentStitchIndex = 0,
  patternGroupRef,
  transformerRef,
  onDragEnd,
  onTransformEnd,
  attachTransformer,
}: PatternLayerProps) {
  const center = useMemo(
    () => calculatePatternCenter(pesData.bounds),
    [pesData.bounds],
  );

  const stitches = useMemo(
    () => convertPenStitchesToPesFormat(pesData.penStitches),
    [pesData.penStitches],
  );

  const groupName = isInteractive ? "pattern-group" : "uploaded-pattern-group";

  console.log(
    `[PatternLayer] Rendering ${isInteractive ? "original" : "uploaded"} pattern:`,
    {
      position: offset,
      rotation: isInteractive ? rotation : "n/a",
      center,
      bounds: pesData.bounds,
    },
  );

  return (
    <>
      <Group
        name={groupName}
        ref={
          isInteractive
            ? (node) => {
                if (patternGroupRef) {
                  patternGroupRef.current = node;
                }
                // Set initial rotation from state
                if (node && isInteractive) {
                  node.rotation(rotation);
                  // Try to attach transformer when group is mounted
                  if (attachTransformer) {
                    attachTransformer();
                  }
                }
              }
            : undefined
        }
        draggable={isInteractive}
        x={offset.x}
        y={offset.y}
        offsetX={center.x}
        offsetY={center.y}
        onDragEnd={isInteractive ? onDragEnd : undefined}
        onTransformEnd={isInteractive ? onTransformEnd : undefined}
        onMouseEnter={
          isInteractive
            ? (e) => {
                const stage = e.target.getStage();
                if (stage) stage.container().style.cursor = "move";
              }
            : undefined
        }
        onMouseLeave={
          isInteractive
            ? (e) => {
                const stage = e.target.getStage();
                if (stage) stage.container().style.cursor = "grab";
              }
            : undefined
        }
      >
        <Stitches
          stitches={stitches}
          pesData={pesData}
          currentStitchIndex={currentStitchIndex}
          showProgress={showProgress}
        />
        <PatternBounds bounds={pesData.bounds} />
      </Group>

      {/* Transformer only for interactive layer */}
      {isInteractive && transformerRef && (
        <Transformer
          ref={(node) => {
            if (transformerRef) {
              transformerRef.current = node;
            }
            // Try to attach transformer when transformer is mounted
            if (node && attachTransformer) {
              attachTransformer();
            }
          }}
          enabledAnchors={[]}
          rotateEnabled={true}
          borderEnabled={true}
          borderStroke="#FF6B6B"
          borderStrokeWidth={2}
          rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
          ignoreStroke={true}
          rotateAnchorOffset={20}
        />
      )}

      {/* Current position indicator (only for uploaded pattern with progress) */}
      {!isInteractive && showProgress && currentStitchIndex > 0 && (
        <Group x={offset.x} y={offset.y} offsetX={center.x} offsetY={center.y}>
          <CurrentPosition
            currentStitchIndex={currentStitchIndex}
            stitches={stitches}
          />
        </Group>
      )}
    </>
  );
}
