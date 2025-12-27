import { useMemo } from "react";
import type { PesPatternData } from "../../formats/import/pesImporter";
import type { MachineInfo } from "../../types/machine";
import { calculateRotatedBounds } from "../../utils/rotationUtils";
import { calculatePatternCenter } from "../../components/PatternCanvas/patternCanvasHelpers";

export interface PatternBoundsCheckResult {
  fits: boolean;
  error: string | null;
}

export interface UsePatternValidationParams {
  pesData: PesPatternData | null;
  machineInfo: MachineInfo | null;
  patternOffset: { x: number; y: number };
  patternRotation: number;
}

/**
 * Custom hook for validating pattern bounds against hoop size
 *
 * Checks if the pattern (with rotation and offset applied) fits within
 * the machine's hoop bounds and provides detailed error messages if not.
 *
 * @param params - Pattern and machine configuration
 * @returns Bounds check result with fit status and error message
 */
export function usePatternValidation({
  pesData,
  machineInfo,
  patternOffset,
  patternRotation,
}: UsePatternValidationParams): PatternBoundsCheckResult {
  // Memoize the bounds check calculation to avoid unnecessary recalculations
  return useMemo((): PatternBoundsCheckResult => {
    if (!pesData || !machineInfo) {
      return { fits: true, error: null };
    }

    // Calculate rotated bounds if rotation is applied
    let bounds = pesData.bounds;
    if (patternRotation && patternRotation !== 0) {
      bounds = calculateRotatedBounds(pesData.bounds, patternRotation);
    }

    const { maxWidth, maxHeight } = machineInfo;

    // The patternOffset represents the pattern's CENTER position (due to offsetX/offsetY in canvas)
    // So we need to calculate bounds relative to the center
    const center = calculatePatternCenter(bounds);

    // Calculate actual bounds in world coordinates
    const patternMinX = patternOffset.x - center.x + bounds.minX;
    const patternMaxX = patternOffset.x - center.x + bounds.maxX;
    const patternMinY = patternOffset.y - center.y + bounds.minY;
    const patternMaxY = patternOffset.y - center.y + bounds.maxY;

    // Hoop bounds (centered at origin)
    const hoopMinX = -maxWidth / 2;
    const hoopMaxX = maxWidth / 2;
    const hoopMinY = -maxHeight / 2;
    const hoopMaxY = maxHeight / 2;

    // Check if pattern exceeds hoop bounds
    const exceedsLeft = patternMinX < hoopMinX;
    const exceedsRight = patternMaxX > hoopMaxX;
    const exceedsTop = patternMinY < hoopMinY;
    const exceedsBottom = patternMaxY > hoopMaxY;

    if (exceedsLeft || exceedsRight || exceedsTop || exceedsBottom) {
      const directions = [];
      if (exceedsLeft)
        directions.push(
          `left by ${((hoopMinX - patternMinX) / 10).toFixed(1)}mm`,
        );
      if (exceedsRight)
        directions.push(
          `right by ${((patternMaxX - hoopMaxX) / 10).toFixed(1)}mm`,
        );
      if (exceedsTop)
        directions.push(
          `top by ${((hoopMinY - patternMinY) / 10).toFixed(1)}mm`,
        );
      if (exceedsBottom)
        directions.push(
          `bottom by ${((patternMaxY - hoopMaxY) / 10).toFixed(1)}mm`,
        );

      return {
        fits: false,
        error: `Pattern exceeds hoop bounds: ${directions.join(", ")}. Adjust pattern position in preview.`,
      };
    }

    return { fits: true, error: null };
  }, [pesData, machineInfo, patternOffset, patternRotation]);
}
