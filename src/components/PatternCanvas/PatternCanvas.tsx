import { useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  useMachineStore,
  usePatternUploaded,
} from "../../stores/useMachineStore";
import { useMachineUploadStore } from "../../stores/useMachineUploadStore";
import { usePatternStore } from "../../stores/usePatternStore";
import { Stage, Layer } from "react-konva";
import Konva from "konva";
import { PhotoIcon } from "@heroicons/react/24/solid";
import { Grid, Origin, Hoop } from "./KonvaComponents";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { ThreadLegend } from "./ThreadLegend";
import { PatternPositionIndicator } from "./PatternPositionIndicator";
import { ZoomControls } from "./ZoomControls";
import { PatternLayer } from "./PatternLayer";
import { useCanvasViewport, usePatternTransform } from "@/hooks";

export function PatternCanvas() {
  // Machine store
  const { sewingProgress, machineInfo } = useMachineStore(
    useShallow((state) => ({
      sewingProgress: state.sewingProgress,
      machineInfo: state.machineInfo,
    })),
  );

  // Machine upload store
  const { isUploading } = useMachineUploadStore(
    useShallow((state) => ({
      isUploading: state.isUploading,
    })),
  );

  // Pattern store
  const {
    pesData,
    patternOffset: initialPatternOffset,
    patternRotation: initialPatternRotation,
    uploadedPesData,
    uploadedPatternOffset: initialUploadedPatternOffset,
    setPatternOffset,
    setPatternRotation,
  } = usePatternStore(
    useShallow((state) => ({
      pesData: state.pesData,
      patternOffset: state.patternOffset,
      patternRotation: state.patternRotation,
      uploadedPesData: state.uploadedPesData,
      uploadedPatternOffset: state.uploadedPatternOffset,
      setPatternOffset: state.setPatternOffset,
      setPatternRotation: state.setPatternRotation,
    })),
  );

  // Derived state: pattern is uploaded if machine has pattern info
  const patternUploaded = usePatternUploaded();
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);

  // Canvas viewport (zoom, pan, container size)
  const {
    stagePos,
    stageScale,
    containerSize,
    handleWheel,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
  } = useCanvasViewport({
    containerRef,
    pesData,
    uploadedPesData,
    machineInfo,
  });

  // Pattern transform (position, rotation, drag/transform)
  const {
    localPatternOffset,
    localPatternRotation,
    patternGroupRef,
    transformerRef,
    attachTransformer,
    handleCenterPattern,
    handlePatternDragEnd,
    handleTransformEnd,
  } = usePatternTransform({
    pesData,
    initialPatternOffset,
    initialPatternRotation,
    setPatternOffset,
    setPatternRotation,
    patternUploaded,
    isUploading,
  });

  const hasPattern = pesData || uploadedPesData;
  const borderColor = hasPattern
    ? "border-tertiary-600 dark:border-tertiary-500"
    : "border-gray-400 dark:border-gray-600";
  const iconColor = hasPattern
    ? "text-tertiary-600 dark:text-tertiary-400"
    : "text-gray-600 dark:text-gray-400";

  return (
    <Card
      className={`p-0 gap-0 lg:h-full flex flex-col border-l-4 ${borderColor}`}
    >
      <CardHeader className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <PhotoIcon className={`w-6 h-6 ${iconColor} flex-shrink-0 mt-0.5`} />
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm">Pattern Preview</CardTitle>
            {hasPattern ? (
              <CardDescription className="text-xs">
                {(() => {
                  const displayPattern = uploadedPesData || pesData;
                  return displayPattern ? (
                    <>
                      {(
                        (displayPattern.bounds.maxX -
                          displayPattern.bounds.minX) /
                        10
                      ).toFixed(1)}{" "}
                      ×{" "}
                      {(
                        (displayPattern.bounds.maxY -
                          displayPattern.bounds.minY) /
                        10
                      ).toFixed(1)}{" "}
                      mm
                    </>
                  ) : null;
                })()}
              </CardDescription>
            ) : (
              <CardDescription className="text-xs">
                No pattern loaded
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pt-0 pb-4 flex-1 flex flex-col min-h-0">
        <div
          className="relative w-full flex-1 min-h-0 border border-gray-300 dark:border-gray-600 rounded bg-gray-200 dark:bg-gray-900 overflow-hidden"
          ref={containerRef}
        >
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
                  stageRef.current.container().style.cursor = "grabbing";
                }
              }}
              onDragEnd={() => {
                if (stageRef.current) {
                  stageRef.current.container().style.cursor = "grab";
                }
              }}
              ref={(node) => {
                stageRef.current = node;
                if (node) {
                  node.container().style.cursor = "grab";
                }
              }}
            >
              {/* Background layer: grid, origin, hoop */}
              <Layer>
                {hasPattern && (
                  <>
                    <Grid
                      gridSize={100}
                      bounds={(uploadedPesData || pesData)!.bounds}
                      machineInfo={machineInfo}
                    />
                    <Origin />
                    {machineInfo && <Hoop machineInfo={machineInfo} />}
                  </>
                )}
              </Layer>

              {/* Original pattern layer: draggable with transformer (shown before upload starts) */}
              <Layer
                visible={!isUploading && !patternUploaded && !uploadedPesData}
              >
                {pesData && (
                  <PatternLayer
                    pesData={pesData}
                    offset={localPatternOffset}
                    rotation={localPatternRotation}
                    isInteractive={true}
                    showProgress={false}
                    currentStitchIndex={0}
                    patternGroupRef={patternGroupRef}
                    transformerRef={transformerRef}
                    onDragEnd={handlePatternDragEnd}
                    onTransformEnd={handleTransformEnd}
                    attachTransformer={attachTransformer}
                  />
                )}
              </Layer>

              {/* Uploaded pattern layer: locked, rotation baked in (shown during and after upload) */}
              <Layer
                visible={isUploading || patternUploaded || !!uploadedPesData}
              >
                {uploadedPesData && (
                  <PatternLayer
                    pesData={uploadedPesData}
                    offset={initialUploadedPatternOffset}
                    isInteractive={false}
                    showProgress={true}
                    currentStitchIndex={sewingProgress?.currentStitch || 0}
                  />
                )}
              </Layer>
            </Stage>
          )}

          {/* Placeholder overlay when no pattern is loaded */}
          {!hasPattern && (
            <div className="flex items-center justify-center h-full text-gray-600 dark:text-gray-400 italic">
              Load a PES file to preview the pattern
            </div>
          )}

          {/* Pattern info overlays */}
          {hasPattern &&
            (() => {
              const displayPattern = uploadedPesData || pesData;
              return (
                displayPattern && (
                  <>
                    <ThreadLegend colors={displayPattern.uniqueColors} />

                    <PatternPositionIndicator
                      offset={
                        isUploading || patternUploaded || uploadedPesData
                          ? initialUploadedPatternOffset
                          : localPatternOffset
                      }
                      rotation={localPatternRotation}
                      isLocked={patternUploaded || !!uploadedPesData}
                      isUploading={isUploading}
                    />

                    <ZoomControls
                      scale={stageScale}
                      onZoomIn={handleZoomIn}
                      onZoomOut={handleZoomOut}
                      onZoomReset={handleZoomReset}
                      onCenterPattern={handleCenterPattern}
                      canCenterPattern={
                        !!pesData &&
                        !patternUploaded &&
                        !isUploading &&
                        !uploadedPesData
                      }
                    />
                  </>
                )
              );
            })()}
        </div>
      </CardContent>
    </Card>
  );
}
