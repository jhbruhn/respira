import { calculatePatternCenter } from "../components/PatternCanvas/patternCanvasHelpers";

/**
 * Rotate a single point around a center
 */
export function rotatePoint(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  angleDegrees: number,
): { x: number; y: number } {
  const angleRad = (angleDegrees * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  const dx = x - centerX;
  const dy = y - centerY;

  return {
    x: centerX + dx * cos - dy * sin,
    y: centerY + dx * sin + dy * cos,
  };
}

/**
 * Transform all stitches by rotation around pattern center
 */
export function transformStitchesRotation(
  stitches: number[][],
  angleDegrees: number,
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
): number[][] {
  if (angleDegrees === 0 || angleDegrees === 360) return stitches;

  const center = calculatePatternCenter(bounds);

  return stitches.map(([x, y, cmd, colorIndex]) => {
    const rotated = rotatePoint(x, y, center.x, center.y, angleDegrees);
    return [Math.round(rotated.x), Math.round(rotated.y), cmd, colorIndex];
  });
}

/**
 * Calculate axis-aligned bounding box of rotated bounds
 */
export function calculateRotatedBounds(
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  angleDegrees: number,
): { minX: number; maxX: number; minY: number; maxY: number } {
  if (angleDegrees === 0 || angleDegrees === 360) return bounds;

  const center = calculatePatternCenter(bounds);

  // Rotate all four corners
  const corners = [
    [bounds.minX, bounds.minY],
    [bounds.maxX, bounds.minY],
    [bounds.minX, bounds.maxY],
    [bounds.maxX, bounds.maxY],
  ];

  const rotatedCorners = corners.map(([x, y]) =>
    rotatePoint(x, y, center.x, center.y, angleDegrees),
  );

  return {
    minX: Math.min(...rotatedCorners.map((p) => p.x)),
    maxX: Math.max(...rotatedCorners.map((p) => p.x)),
    minY: Math.min(...rotatedCorners.map((p) => p.y)),
    maxY: Math.max(...rotatedCorners.map((p) => p.y)),
  };
}

/**
 * Normalize angle to 0-360 range
 */
export function normalizeAngle(degrees: number): number {
  let normalized = degrees % 360;
  if (normalized < 0) normalized += 360;
  return normalized;
}
