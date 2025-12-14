/**
 * PEN Format Encoder
 *
 * This module contains the logic for encoding embroidery stitches into the Brother PP1 PEN format.
 * The PEN format uses absolute coordinates shifted left by 3 bits, with flags in the low 3 bits.
 */

import { MOVE, TRIM, END } from '../import/constants';

// PEN format flags for Brother machines
const PEN_FEED_DATA = 0x01; // Bit 0: Jump stitch (move without stitching)
const PEN_CUT_DATA = 0x02;  // Bit 1: Trim/cut thread command
const PEN_COLOR_END = 0x03; // Last stitch before color change
const PEN_DATA_END = 0x05;  // Last stitch of entire pattern

// Constants from PesxToPen.cs
const FEED_LENGTH = 50; // Long jump threshold requiring lock stitches and cut
const TARGET_LENGTH = 8.0;  // Target accumulated length for lock stitch direction
const MAX_POINTS = 5;        // Maximum points to accumulate for lock stitch direction
const LOCK_STITCH_SCALE = 0.4 / 8.0; // Scale the magnitude-8 vector down to 0.4

export interface StitchData {
  x: number;
  y: number;
  cmd: number;
  colorIndex: number;
}

export interface PenEncodingResult {
  penBytes: number[];
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

/**
 * Encode a stitch position to PEN bytes (4 bytes: X_low, X_high, Y_low, Y_high)
 * Coordinates are shifted left by 3 bits to make room for flags in low 3 bits
 */
export function encodeStitchPosition(x: number, y: number): number[] {
  const xEnc = (Math.round(x) << 3) & 0xffff;
  const yEnc = (Math.round(y) << 3) & 0xffff;

  return [
    xEnc & 0xff,
    (xEnc >> 8) & 0xff,
    yEnc & 0xff,
    (yEnc >> 8) & 0xff
  ];
}

/**
 * Calculate lock stitch direction by accumulating movement vectors
 * Matches the C# logic that accumulates coordinates until reaching threshold
 *
 * Three use cases from C# ConvertEmb function:
 * - Loop A (Jump/Entry): lookAhead=true - Hides knot under upcoming stitches
 * - Loop B (End/Cut): lookAhead=false - Hides knot inside previous stitches
 * - Loop C (Color Change): lookAhead=true - Aligns knot with stop event data
 *
 * @param stitches Array of stitches to analyze [x, y, cmd, colorIndex]
 * @param currentIndex Current stitch index
 * @param lookAhead If true, look forward; if false, look backward
 * @returns Direction vector components (normalized and scaled to magnitude 8.0)
 */
export function calculateLockDirection(
  stitches: number[][],
  currentIndex: number,
  lookAhead: boolean
): { dirX: number; dirY: number } {
  let accumulatedX = 0;
  let accumulatedY = 0;
  let maxLength = 0;
  let bestX = 0;
  let bestY = 0;

  const step = lookAhead ? 1 : -1;
  const maxIterations = lookAhead
    ? Math.min(MAX_POINTS, stitches.length - currentIndex - 1)
    : Math.min(MAX_POINTS, currentIndex);

  for (let i = 0; i < maxIterations; i++) {
    const idx = currentIndex + (step * (i + 1));
    if (idx < 0 || idx >= stitches.length) break;

    const stitch = stitches[idx];
    const cmd = stitch[2];

    // Skip MOVE/JUMP stitches
    if ((cmd & MOVE) !== 0) continue;

    // Accumulate relative coordinates
    const deltaX = Math.round(stitch[0]) - Math.round(stitches[currentIndex][0]);
    const deltaY = Math.round(stitch[1]) - Math.round(stitches[currentIndex][1]);

    accumulatedX += deltaX;
    accumulatedY += deltaY;

    const length = Math.sqrt(accumulatedX * accumulatedX + accumulatedY * accumulatedY);

    // Track the maximum length vector seen so far
    if (length > maxLength) {
      maxLength = length;
      bestX = accumulatedX;
      bestY = accumulatedY;
    }

    // If we've accumulated enough length, use current vector
    if (length >= TARGET_LENGTH) {
      return {
        dirX: (accumulatedX * 8.0) / length,
        dirY: (accumulatedY * 8.0) / length
      };
    }
  }

  // If we didn't reach target length, use the best vector we found
  if (maxLength > 0.1) {
    return {
      dirX: (bestX * 8.0) / maxLength,
      dirY: (bestY * 8.0) / maxLength
    };
  }

  // Fallback: diagonal direction with magnitude 8.0
  const mag = 8.0 / Math.sqrt(2); // ~5.66 for diagonal
  return { dirX: mag, dirY: mag };
}

/**
 * Generate lock/tack stitches at a position, rotated toward the direction of travel
 * Matches Nuihajime_TomeDataPlus from PesxToPen.cs with vector rotation
 * @param x X coordinate
 * @param y Y coordinate
 * @param dirX Direction X component (magnitude ~8.0)
 * @param dirY Direction Y component (magnitude ~8.0)
 * @returns Array of PEN bytes for lock stitches (32 bytes = 8 stitches * 4 bytes)
 */
export function generateLockStitches(x: number, y: number, dirX: number, dirY: number): number[] {
  const lockBytes: number[] = [];

  // Generate 8 lock stitches in alternating pattern
  // Pattern from C# (from Nuihajime_TomeDataPlus): [+x, +y, -x, -y] repeated
  // The direction vector has magnitude ~8.0, so we need to scale it down
  // to get reasonable lock stitch size (approximately 0.4 units)
  const scaledDirX = dirX * LOCK_STITCH_SCALE;
  const scaledDirY = dirY * LOCK_STITCH_SCALE;

  // Generate 8 stitches alternating between forward and backward
  for (let i = 0; i < 8; i++) {
    // Alternate between forward (+) and backward (-) direction
    const sign = (i % 2 === 0) ? 1 : -1;
    lockBytes.push(...encodeStitchPosition(x + scaledDirX * sign, y + scaledDirY * sign));
  }

  return lockBytes;
}

/**
 * Encode stitches array to PEN format bytes
 *
 * @param stitches Array of stitches in format [x, y, cmd, colorIndex]
 * @returns PEN encoding result with bytes and bounds
 */
export function encodeStitchesToPen(stitches: number[][]): PenEncodingResult {
  // Track bounds
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  const penStitches: number[] = [];

  // Track position for calculating jump distances
  let prevX = 0;
  let prevY = 0;

  // Add starting lock stitches at the very beginning of the pattern
  // Matches C# behavior: Nuihajime_TomeDataPlus is called when counter <= 2
  // Find the first non-MOVE stitch to place the starting locks
  const firstStitchIndex = stitches.findIndex(s => (s[2] & MOVE) === 0);
  if (firstStitchIndex !== -1) {
    const firstStitch = stitches[firstStitchIndex];
    const startX = Math.round(firstStitch[0]);
    const startY = Math.round(firstStitch[1]);

    // Calculate direction for starting locks (look forward into the pattern)
    const startDir = calculateLockDirection(stitches, firstStitchIndex, true);
    penStitches.push(...generateLockStitches(startX, startY, startDir.dirX, startDir.dirY));
  }

  for (let i = 0; i < stitches.length; i++) {
    const stitch = stitches[i];
    const absX = Math.round(stitch[0]);
    const absY = Math.round(stitch[1]);
    const cmd = stitch[2];
    const stitchColor = stitch[3]; // Color index from PyStitch

    // Track bounds for non-jump stitches (regular stitches, not MOVE/JUMP)
    // A stitch is trackable if it's not a MOVE command
    if ((cmd & MOVE) === 0) {
      minX = Math.min(minX, absX);
      maxX = Math.max(maxX, absX);
      minY = Math.min(minY, absY);
      maxY = Math.max(maxY, absY);
    }

    // Check for long jumps that need lock stitches and cuts
    if (cmd & MOVE) {
      const jumpDist = Math.sqrt((absX - prevX) ** 2 + (absY - prevY) ** 2);

      if (jumpDist > FEED_LENGTH) {
        // Long jump - add finishing lock stitches at previous position
        // Loop B: End/Cut Vector - Look BACKWARD at previous stitches
        // This hides the knot inside the embroidery we just finished
        const finishDir = calculateLockDirection(stitches, i - 1, false);
        penStitches.push(...generateLockStitches(prevX, prevY, finishDir.dirX, finishDir.dirY));

        // Encode jump with both FEED and CUT flags
        const xEncoded = (absX << 3) & 0xffff;
        let yEncoded = (absY << 3) & 0xffff;
        yEncoded |= PEN_FEED_DATA; // Jump flag
        yEncoded |= PEN_CUT_DATA;  // Cut flag for long jumps

        penStitches.push(
          xEncoded & 0xff,
          (xEncoded >> 8) & 0xff,
          yEncoded & 0xff,
          (yEncoded >> 8) & 0xff
        );

        // Add starting lock stitches at new position
        // Loop A: Jump/Entry Vector - Look FORWARD at upcoming stitches
        // This hides the knot under the stitches we're about to make
        const startDir = calculateLockDirection(stitches, i, true);
        penStitches.push(...generateLockStitches(absX, absY, startDir.dirX, startDir.dirY));

        // Update position and continue
        prevX = absX;
        prevY = absY;
        continue;
      }
    }

    // Encode absolute coordinates with flags in low 3 bits
    // Shift coordinates left by 3 bits to make room for flags
    let xEncoded = (absX << 3) & 0xffff;
    let yEncoded = (absY << 3) & 0xffff;

    // Add command flags to Y-coordinate based on stitch type
    if (cmd & MOVE) {
      // MOVE/JUMP: Set bit 0 (FEED_DATA) - move without stitching
      yEncoded |= PEN_FEED_DATA;
    }
    if (cmd & TRIM) {
      // TRIM: Set bit 1 (CUT_DATA) - cut thread command
      yEncoded |= PEN_CUT_DATA;
    }

    // Check if this is the last stitch
    const isLastStitch = i === stitches.length - 1 || (cmd & END) !== 0;

    // Check for color change by comparing stitch color index
    const nextStitch = stitches[i + 1];
    const nextStitchColor = nextStitch?.[3];
    const isColorChange = !isLastStitch && nextStitchColor !== undefined && nextStitchColor !== stitchColor;

    // Mark the very last stitch of the pattern with DATA_END
    if (isLastStitch) {
      xEncoded = (xEncoded & 0xfff8) | PEN_DATA_END;
    }

    // Add the encoded stitch
    penStitches.push(
      xEncoded & 0xff,
      (xEncoded >> 8) & 0xff,
      yEncoded & 0xff,
      (yEncoded >> 8) & 0xff
    );

    // Update position for next iteration
    prevX = absX;
    prevY = absY;

    // Handle color change: finishing lock, cut, jump, COLOR_END, starting lock
    if (isColorChange) {
      const nextStitchCmd = nextStitch[2];
      const nextStitchX = Math.round(nextStitch[0]);
      const nextStitchY = Math.round(nextStitch[1]);
      const nextIsJump = (nextStitchCmd & MOVE) !== 0;

      // Step 1: Add finishing lock stitches at end of current color
      // Loop C: Color Change Vector - Look FORWARD at the stop event data
      // This aligns the knot with the stop command's data block for correct tension
      const finishDir = calculateLockDirection(stitches, i, true);
      penStitches.push(...generateLockStitches(absX, absY, finishDir.dirX, finishDir.dirY));

      // Step 2: Add cut command at current position
      const cutXEncoded = (absX << 3) & 0xffff;
      const cutYEncoded = ((absY << 3) & 0xffff) | PEN_CUT_DATA;

      penStitches.push(
        cutXEncoded & 0xff,
        (cutXEncoded >> 8) & 0xff,
        cutYEncoded & 0xff,
        (cutYEncoded >> 8) & 0xff
      );

      // Step 3: If next stitch is a JUMP, encode it and skip it in the loop
      // Otherwise, add a jump ourselves if positions differ
      const jumpToX = nextStitchX;
      const jumpToY = nextStitchY;

      if (nextIsJump) {
        // The PES has a JUMP to the new color position, we'll add it here and skip it later
        i++; // Skip the JUMP stitch since we're processing it here
      }

      // Add jump to new position (if position changed)
      if (jumpToX !== absX || jumpToY !== absY) {
        const jumpXEncoded = (jumpToX << 3) & 0xffff;
        let jumpYEncoded = (jumpToY << 3) & 0xffff;
        jumpYEncoded |= PEN_FEED_DATA; // Jump flag

        penStitches.push(
          jumpXEncoded & 0xff,
          (jumpXEncoded >> 8) & 0xff,
          jumpYEncoded & 0xff,
          (jumpYEncoded >> 8) & 0xff
        );
      }

      // Step 4: Add COLOR_END marker at NEW position
      // This is where the machine pauses and waits for the user to change thread color
      let colorEndXEncoded = (jumpToX << 3) & 0xffff;
      const colorEndYEncoded = (jumpToY << 3) & 0xffff;

      // Add COLOR_END flag to X coordinate
      colorEndXEncoded = (colorEndXEncoded & 0xfff8) | PEN_COLOR_END;

      penStitches.push(
        colorEndXEncoded & 0xff,
        (colorEndXEncoded >> 8) & 0xff,
        colorEndYEncoded & 0xff,
        (colorEndYEncoded >> 8) & 0xff
      );

      // Step 5: Add starting lock stitches at the new position
      // Loop A: Jump/Entry Vector - Look FORWARD at upcoming stitches in new color
      // This hides the knot under the stitches we're about to make
      const nextStitchIdx = nextIsJump ? i + 2 : i + 1;
      const startDir = calculateLockDirection(stitches, nextStitchIdx < stitches.length ? nextStitchIdx : i, true);
      penStitches.push(...generateLockStitches(jumpToX, jumpToY, startDir.dirX, startDir.dirY));

      // Update position
      prevX = jumpToX;
      prevY = jumpToY;
    }

    // Check for end command
    if ((cmd & END) !== 0) {
      break;
    }
  }

  return {
    penBytes: penStitches,
    bounds: {
      minX: minX === Infinity ? 0 : minX,
      maxX: maxX === -Infinity ? 0 : maxX,
      minY: minY === Infinity ? 0 : minY,
      maxY: maxY === -Infinity ? 0 : maxY,
    },
  };
}
