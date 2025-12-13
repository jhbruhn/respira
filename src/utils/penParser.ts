import type { PenData, PenStitch, PenColorBlock } from '../types/machine';

// PEN format flags
const PEN_FEED_DATA = 0x01; // Y-coordinate low byte, bit 0
const PEN_COLOR_END = 0x03; // X-coordinate low byte, bits 0-2
const PEN_DATA_END = 0x05;  // X-coordinate low byte, bits 0-2

export function parsePenData(data: Uint8Array): PenData {
  if (data.length < 4 || data.length % 4 !== 0) {
    throw new Error(`Invalid PEN data size: ${data.length} bytes`);
  }

  const stitches: PenStitch[] = [];
  const colorBlocks: PenColorBlock[] = [];
  const stitchCount = data.length / 4;

  let currentColorStart = 0;
  let currentColor = 0;
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  console.log(`Parsing PEN data: ${data.length} bytes, ${stitchCount} stitches`);

  for (let i = 0; i < stitchCount; i++) {
    const offset = i * 4;

    // Extract coordinates (shifted left by 3 bits in PEN format)
    const xRaw = data[offset] | (data[offset + 1] << 8);
    const yRaw = data[offset + 2] | (data[offset + 3] << 8);

    // Extract flags from low 3 bits
    const xFlags = data[offset] & 0x07;
    const yFlags = data[offset + 2] & 0x07;

    // Decode coordinates (shift right by 3 to get actual position)
    // The coordinates are stored as signed 16-bit values, left-shifted by 3
    // Step 1: Clear the flag bits (low 3 bits) from the raw values
    const xRawClean = xRaw & 0xFFF8;
    const yRawClean = yRaw & 0xFFF8;

    // Step 2: Convert from unsigned 16-bit to signed 16-bit
    let xSigned = xRawClean;
    let ySigned = yRawClean;
    if (xSigned > 0x7FFF) xSigned = xSigned - 0x10000;
    if (ySigned > 0x7FFF) ySigned = ySigned - 0x10000;

    // Step 3: Shift right by 3 (arithmetic shift, preserves sign)
    let x = xSigned >> 3;
    let y = ySigned >> 3;

    const stitch: PenStitch = {
      x,
      y,
      flags: (xFlags & 0x07) | (yFlags & 0x07),
      isJump: (yFlags & PEN_FEED_DATA) !== 0,
    };

    stitches.push(stitch);

    // Track bounds
    if (!stitch.isJump) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }

    // Check for color change or data end
    if (xFlags === PEN_COLOR_END) {
      const block: PenColorBlock = {
        startStitch: currentColorStart,
        endStitch: i,
        colorIndex: currentColor,
      };
      colorBlocks.push(block);

      console.log(
        `Color ${currentColor}: stitches ${currentColorStart}-${i} (${
          i - currentColorStart + 1
        } stitches)`
      );

      currentColor++;
      currentColorStart = i + 1;
    } else if (xFlags === PEN_DATA_END) {
      if (currentColorStart < i) {
        const block: PenColorBlock = {
          startStitch: currentColorStart,
          endStitch: i,
          colorIndex: currentColor,
        };
        colorBlocks.push(block);

        console.log(
          `Color ${currentColor} (final): stitches ${currentColorStart}-${i} (${
            i - currentColorStart + 1
          } stitches)`
        );

        currentColor++;
      }
      console.log(`Data end marker at stitch ${i}`);
      break;
    }
  }

  const result: PenData = {
    stitches,
    colorBlocks,
    totalStitches: stitches.length,
    colorCount: colorBlocks.length,
    bounds: {
      minX: minX === Infinity ? 0 : minX,
      maxX: maxX === -Infinity ? 0 : maxX,
      minY: minY === Infinity ? 0 : minY,
      maxY: maxY === -Infinity ? 0 : maxY,
    },
  };

  console.log(
    `Parsed: ${result.totalStitches} stitches, ${result.colorCount} colors`
  );
  console.log(`Bounds: (${result.bounds.minX}, ${result.bounds.minY}) to (${result.bounds.maxX}, ${result.bounds.maxY})`);

  return result;
}

export function getStitchColor(penData: PenData, stitchIndex: number): number {
  for (const block of penData.colorBlocks) {
    if (stitchIndex >= block.startStitch && stitchIndex <= block.endStitch) {
      return block.colorIndex;
    }
  }
  return -1;
}
