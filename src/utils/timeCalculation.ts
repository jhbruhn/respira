/**
 * Convert stitch count to minutes using Brother PP1 timing formula
 * Formula: ((pointCount - 1) * 150 + 3000) / 60000
 * - 150ms per stitch
 * - 3000ms startup time
 * - Result in minutes (rounded up)
 */
export function convertStitchesToMinutes(stitchCount: number): number {
  if (stitchCount <= 1) return 0;

  const timeMs = (stitchCount - 1) * 150 + 3000;
  const timeMin = Math.ceil(timeMs / 60000);

  return timeMin < 1 ? 1 : timeMin;
}

/**
 * Calculate total and elapsed time for a pattern based on color blocks
 * This matches the Brother app's calculation method
 */
export function calculatePatternTime(
  colorBlocks: Array<{ stitchCount: number }>,
  currentStitch: number
): {
  totalMinutes: number;
  elapsedMinutes: number;
  remainingMinutes: number;
} {
  let totalMinutes = 0;
  let elapsedMinutes = 0;
  let cumulativeStitches = 0;

  // Calculate time per color block
  for (const block of colorBlocks) {
    totalMinutes += convertStitchesToMinutes(block.stitchCount);
    cumulativeStitches += block.stitchCount;

    if (cumulativeStitches < currentStitch) {
      // This entire block is completed
      elapsedMinutes += convertStitchesToMinutes(block.stitchCount);
    } else if (cumulativeStitches === currentStitch) {
      // We just completed this block
      elapsedMinutes += convertStitchesToMinutes(block.stitchCount);
      break;
    } else {
      // We're partway through this block
      const stitchesInBlock = currentStitch - (cumulativeStitches - block.stitchCount);
      elapsedMinutes += convertStitchesToMinutes(stitchesInBlock);
      break;
    }
  }

  return {
    totalMinutes,
    elapsedMinutes,
    remainingMinutes: Math.max(0, totalMinutes - elapsedMinutes),
  };
}

/**
 * Format minutes as MM:SS
 */
export function formatMinutes(minutes: number): string {
  const mins = Math.floor(minutes);
  const secs = Math.round((minutes - mins) * 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}
