/**
 * PositionPresets Component
 *
 * Provides a 3x3 grid of buttons to quickly position the pattern
 * at predefined locations within the hoop (corners, edge centers, and center)
 */

import type { MachineInfo } from "../../types/machine";
import type { PesPatternData } from "../../formats/import/pesImporter";
import { calculatePatternCenter } from "./patternCanvasHelpers";
import { calculateRotatedBounds } from "../../utils/rotationUtils";

export type PositionPreset =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

interface PositionPresetsProps {
  pesData: PesPatternData;
  patternRotation: number;
  machineInfo: MachineInfo;
  onPositionSelect: (offset: { x: number; y: number }) => void;
  disabled: boolean;
}

/**
 * Calculate the offset needed to position the pattern at a given preset location.
 *
 * The offset represents the pattern center's position in world coordinates.
 * When offset is {0,0}, the pattern center is at the hoop center.
 */
function calculatePresetOffset(
  preset: PositionPreset,
  pesData: PesPatternData,
  patternRotation: number,
  machineInfo: MachineInfo,
): { x: number; y: number } {
  // Use rotated bounds if rotation is applied
  const bounds =
    patternRotation !== 0
      ? calculateRotatedBounds(pesData.bounds, patternRotation)
      : pesData.bounds;

  const center = calculatePatternCenter(bounds);
  const hoopHalfW = machineInfo.maxWidth / 2;
  const hoopHalfH = machineInfo.maxHeight / 2;

  // Distance from pattern center to each edge
  const leftHalf = center.x - bounds.minX;
  const rightHalf = bounds.maxX - center.x;
  const topHalf = center.y - bounds.minY;
  const bottomHalf = bounds.maxY - center.y;

  const xPositions = {
    left: -hoopHalfW + leftHalf,
    center: 0,
    right: hoopHalfW - rightHalf,
  };

  const yPositions = {
    top: -hoopHalfH + topHalf,
    center: 0,
    bottom: hoopHalfH - bottomHalf,
  };

  switch (preset) {
    case "top-left":
      return { x: xPositions.left, y: yPositions.top };
    case "top-center":
      return { x: xPositions.center, y: yPositions.top };
    case "top-right":
      return { x: xPositions.right, y: yPositions.top };
    case "center-left":
      return { x: xPositions.left, y: yPositions.center };
    case "center":
      return { x: xPositions.center, y: yPositions.center };
    case "center-right":
      return { x: xPositions.right, y: yPositions.center };
    case "bottom-left":
      return { x: xPositions.left, y: yPositions.bottom };
    case "bottom-center":
      return { x: xPositions.center, y: yPositions.bottom };
    case "bottom-right":
      return { x: xPositions.right, y: yPositions.bottom };
  }
}

const presetGrid: { preset: PositionPreset; label: string }[][] = [
  [
    { preset: "top-left", label: "Top Left" },
    { preset: "top-center", label: "Top Center" },
    { preset: "top-right", label: "Top Right" },
  ],
  [
    { preset: "center-left", label: "Center Left" },
    { preset: "center", label: "Center" },
    { preset: "center-right", label: "Center Right" },
  ],
  [
    { preset: "bottom-left", label: "Bottom Left" },
    { preset: "bottom-center", label: "Bottom Center" },
    { preset: "bottom-right", label: "Bottom Right" },
  ],
];

export function PositionPresets({
  pesData,
  patternRotation,
  machineInfo,
  onPositionSelect,
  disabled,
}: PositionPresetsProps) {
  const handleClick = (preset: PositionPreset) => {
    const offset = calculatePresetOffset(
      preset,
      pesData,
      patternRotation,
      machineInfo,
    );
    onPositionSelect(offset);
  };

  return (
    <div className="absolute top-2 sm:top-2.5 right-2 sm:right-2.5 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm p-2 sm:p-2.5 rounded-lg shadow-lg z-10">
      <h4 className="m-0 mb-1.5 text-xs font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-300 dark:border-gray-600 pb-1">
        Align
      </h4>
      <div className="grid grid-cols-3 gap-0.5">
        {presetGrid.map((row, rowIdx) =>
          row.map(({ preset, label }) => (
            <button
              key={preset}
              onClick={() => handleClick(preset)}
              disabled={disabled}
              title={label}
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded border border-gray-300 dark:border-gray-600
                flex items-center justify-center
                hover:bg-primary-100 dark:hover:bg-primary-900 hover:border-primary-400 dark:hover:border-primary-500
                disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent
                transition-colors cursor-pointer`}
            >
              <DotIndicator row={rowIdx} preset={preset} />
            </button>
          )),
        )}
      </div>
    </div>
  );
}

/**
 * Visual indicator showing the position within a rectangle.
 * Renders a small rectangle outline with a dot at the corresponding position.
 */
function DotIndicator({
  row,
  preset,
}: {
  row: number;
  preset: PositionPreset;
}) {
  // Map preset to dot position within a 12x12 viewBox
  const dotX = preset.includes("left") ? 2 : preset.includes("right") ? 10 : 6;
  const dotY = row === 0 ? 2 : row === 2 ? 10 : 6;

  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 12 12"
      className="text-gray-500 dark:text-gray-400"
    >
      <rect
        x="0.5"
        y="0.5"
        width="11"
        height="11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        rx="1"
      />
      <circle cx={dotX} cy={dotY} r="1.5" fill="currentColor" />
    </svg>
  );
}
