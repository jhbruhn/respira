/**
 * PEN Format Decoder
 *
 * This module contains the logic for decoding Brother PP1 PEN format embroidery files.
 * The PEN format uses absolute coordinates shifted left by 3 bits, with flags in the low 3 bits.
 */

import type { DecodedPenStitch, DecodedPenData, PenColorBlock } from './types';

// PEN format flags
const PEN_FEED_DATA = 0x01; // Bit 0: Jump stitch (move without stitching)
const PEN_CUT_DATA = 0x02;  // Bit 1: Trim/cut thread command
const PEN_COLOR_END = 0x03; // Last stitch before color change
const PEN_DATA_END = 0x05;  // Last stitch of entire pattern

/**
 * Decode a single PEN stitch (4 bytes) into coordinates and flags
 *
 * @param bytes The byte array containing PEN data
 * @param offset The offset in bytes to start reading from
 * @returns Decoded stitch with coordinates and flag information
 */
export function decodePenStitch(
  bytes: Uint8Array | number[],
  offset: number
): DecodedPenStitch {
  const xLow = bytes[offset];
  const xHigh = bytes[offset + 1];
  const yLow = bytes[offset + 2];
  const yHigh = bytes[offset + 3];

  const xRaw = xLow | (xHigh << 8);
  const yRaw = yLow | (yHigh << 8);

  // Extract flags from low 3 bits
  const xFlags = xRaw & 0x07;
  const yFlags = yRaw & 0x07;

  // Clear flags and shift right to get actual coordinates
  const xClean = xRaw & 0xFFF8;
  const yClean = yRaw & 0xFFF8;

  // Convert to signed 16-bit
  let xSigned = xClean;
  let ySigned = yClean;
  if (xSigned > 0x7FFF) xSigned = xSigned - 0x10000;
  if (ySigned > 0x7FFF) ySigned = ySigned - 0x10000;

  // Shift right by 3 to get actual coordinates
  const x = xSigned >> 3;
  const y = ySigned >> 3;

  const isFeed = (yFlags & PEN_FEED_DATA) !== 0;
  const isCut = (yFlags & PEN_CUT_DATA) !== 0;
  const isColorEnd = xFlags === PEN_COLOR_END;
  const isDataEnd = xFlags === PEN_DATA_END;

  return {
    x,
    y,
    xFlags,
    yFlags,
    isFeed,
    isCut,
    isColorEnd,
    isDataEnd,
    // Compatibility aliases
    isJump: isFeed,
    flags: (xFlags & 0x07) | (yFlags & 0x07),
  };
}

/**
 * Decode all stitches from PEN format bytes
 *
 * @param bytes PEN format byte array
 * @returns Array of decoded stitches
 */
export function decodeAllPenStitches(bytes: Uint8Array | number[]): DecodedPenStitch[] {
  if (bytes.length < 4 || bytes.length % 4 !== 0) {
    throw new Error(`Invalid PEN data size: ${bytes.length} bytes (must be multiple of 4)`);
  }

  const stitches: DecodedPenStitch[] = [];
  for (let i = 0; i < bytes.length; i += 4) {
    stitches.push(decodePenStitch(bytes, i));
  }
  return stitches;
}

/**
 * Decode PEN format data into a complete pattern structure
 *
 * This function parses PEN bytes and extracts:
 * - Individual stitches with coordinates and flags
 * - Color blocks (groups of stitches using the same thread color)
 * - Pattern bounds
 *
 * @param data PEN format byte array
 * @returns Complete decoded pattern data
 */
export function decodePenData(data: Uint8Array): DecodedPenData {
  const stitches = decodeAllPenStitches(data);
  const colorBlocks: PenColorBlock[] = [];

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  let currentColorStart = 0;
  let currentColor = 0;

  for (let i = 0; i < stitches.length; i++) {
    const stitch = stitches[i];

    // Track bounds (exclude jump stitches)
    if (!stitch.isFeed) {
      minX = Math.min(minX, stitch.x);
      maxX = Math.max(maxX, stitch.x);
      minY = Math.min(minY, stitch.y);
      maxY = Math.max(maxY, stitch.y);
    }

    // Check for color change or data end
    if (stitch.isColorEnd) {
      colorBlocks.push({
        startStitchIndex: currentColorStart,
        endStitchIndex: i,
        colorIndex: currentColor,
        // Compatibility aliases
        startStitch: currentColorStart,
        endStitch: i,
      });
      currentColor++;
      currentColorStart = i + 1;
    } else if (stitch.isDataEnd) {
      // Final color block
      if (currentColorStart <= i) {
        colorBlocks.push({
          startStitchIndex: currentColorStart,
          endStitchIndex: i,
          colorIndex: currentColor,
          // Compatibility aliases
          startStitch: currentColorStart,
          endStitch: i,
        });
      }
      break;
    }
  }

  return {
    stitches,
    colorBlocks,
    bounds: {
      minX: minX === Infinity ? 0 : minX,
      maxX: maxX === -Infinity ? 0 : maxX,
      minY: minY === Infinity ? 0 : minY,
      maxY: maxY === -Infinity ? 0 : maxY,
    },
  };
}

/**
 * Get the color index for a stitch at the given index
 *
 * @param penData Decoded PEN pattern data
 * @param stitchIndex Index of the stitch
 * @returns Color index, or -1 if not found
 */
export function getStitchColor(penData: DecodedPenData, stitchIndex: number): number {
  for (const block of penData.colorBlocks) {
    if (stitchIndex >= block.startStitchIndex && stitchIndex <= block.endStitchIndex) {
      return block.colorIndex;
    }
  }
  return -1;
}
