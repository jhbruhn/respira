import { pyodideLoader } from './pyodideLoader';

// PEN format flags
const PEN_FEED_DATA = 0x01; // Y-coordinate low byte, bit 0 (jump)
const PEN_COLOR_END = 0x03; // X-coordinate low byte, bits 0-2
const PEN_DATA_END = 0x05;  // X-coordinate low byte, bits 0-2

// Embroidery command constants (from pyembroidery)
const MOVE = 0x10;
const COLOR_CHANGE = 0x40;
const STOP = 0x80;
const END = 0x100;

export interface PesPatternData {
  stitches: number[][];
  threads: Array<{
    color: number;
    hex: string;
  }>;
  penData: Uint8Array;
  colorCount: number;
  stitchCount: number;
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

/**
 * Reads a PES file using PyStitch and converts it to PEN format
 */
export async function convertPesToPen(file: File): Promise<PesPatternData> {
  // Ensure Pyodide is initialized
  const pyodide = await pyodideLoader.initialize();

  // Read the PES file
  const buffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(buffer);

  // Write file to Pyodide virtual filesystem
  const filename = '/tmp/pattern.pes';
  pyodide.FS.writeFile(filename, uint8Array);

  // Read the pattern using PyStitch
  const result = await pyodide.runPythonAsync(`
import pystitch
from pystitch.EmbConstant import STITCH, JUMP, TRIM, STOP, END, COLOR_CHANGE

# Read the PES file
pattern = pystitch.read('${filename}')

# Use the raw stitches list which preserves command flags
# Each stitch in pattern.stitches is [x, y, cmd]
# We need to assign color indices based on COLOR_CHANGE commands
# and filter out COLOR_CHANGE and STOP commands (they're not actual stitches)

stitches_with_colors = []
current_color = 0

for i, stitch in enumerate(pattern.stitches):
    x, y, cmd = stitch

    # Check for color change command - increment color but don't add stitch
    if cmd == COLOR_CHANGE:
        current_color += 1
        continue

    # Check for stop command - skip it
    if cmd == STOP:
        continue

    # Check for standalone END command (no stitch data)
    if cmd == END:
        continue

    # Add actual stitch with color index and command
    # Keep JUMP/TRIM flags as they indicate jump stitches
    stitches_with_colors.append([x, y, cmd, current_color])

# Convert to JSON-serializable format
{
    'stitches': stitches_with_colors,
    'threads': [
        {
            'color': thread.color if hasattr(thread, 'color') else 0,
            'hex': thread.hex_color() if hasattr(thread, 'hex_color') else '#000000'
        }
        for thread in pattern.threadlist
    ],
    'thread_count': len(pattern.threadlist),
    'stitch_count': len(stitches_with_colors),
    'color_changes': current_color
}
  `);

  // Convert Python result to JavaScript
  const data = result.toJs({ dict_converter: Object.fromEntries });

  console.log('[DEBUG] PyStitch stitch_count:', data.stitch_count);
  console.log('[DEBUG] PyStitch color_changes:', data.color_changes);

  // Clean up virtual file
  try {
    pyodide.FS.unlink(filename);
  } catch (e) {
    // Ignore errors
  }

  // Extract stitches and validate
  const stitches: number[][] = Array.from(data.stitches).map((stitch: any) =>
    Array.from(stitch) as number[]
  );

  console.log('[DEBUG] JavaScript stitches.length:', stitches.length);
  console.log('[DEBUG] First 5 stitches:', stitches.slice(0, 5));
  console.log('[DEBUG] Middle 5 stitches:', stitches.slice(Math.floor(stitches.length / 2), Math.floor(stitches.length / 2) + 5));
  console.log('[DEBUG] Last 5 stitches:', stitches.slice(-5));

  // Count stitch types (PyStitch constants: STITCH=0, JUMP=1, TRIM=2)
  let jumpCount = 0, normalCount = 0;
  for (let i = 0; i < stitches.length; i++) {
    const cmd = stitches[i][2];
    if (cmd === 1 || cmd === 2) jumpCount++; // JUMP or TRIM
    else normalCount++; // STITCH (0)
  }
  console.log('[DEBUG] Stitch types: normal=' + normalCount + ', jump/trim=' + jumpCount);

  // Calculate min/max of raw stitch values to understand the data
  let rawMinX = Infinity, rawMaxX = -Infinity, rawMinY = Infinity, rawMaxY = -Infinity;
  for (let i = 0; i < stitches.length; i++) {
    const x = stitches[i][0];
    const y = stitches[i][1];
    rawMinX = Math.min(rawMinX, x);
    rawMaxX = Math.max(rawMaxX, x);
    rawMinY = Math.min(rawMinY, y);
    rawMaxY = Math.max(rawMaxY, y);
  }
  console.log('[DEBUG] Raw stitch value ranges:', { rawMinX, rawMaxX, rawMinY, rawMaxY });

  if (!stitches || stitches.length === 0) {
    throw new Error('Invalid PES file or no stitches found');
  }

  // Extract thread data
  const threads = data.threads.map((thread: any) => ({
    color: thread.color || 0,
    hex: thread.hex || '#000000',
  }));

  // Track bounds
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  // PyStitch returns ABSOLUTE coordinates
  // PEN format uses absolute coordinates, shifted left by 3 bits (as per official app line 780)
  const penStitches: number[] = [];
  let currentColor = stitches[0]?.[3] ?? 0; // Track current color using stitch color index

  for (let i = 0; i < stitches.length; i++) {
    const stitch = stitches[i];
    const absX = Math.round(stitch[0]);
    const absY = Math.round(stitch[1]);
    const cmd = stitch[2];
    const stitchColor = stitch[3]; // Color index from PyStitch

    // Track bounds for non-jump stitches (cmd=0 is STITCH)
    if (cmd === 0) {
      minX = Math.min(minX, absX);
      maxX = Math.max(maxX, absX);
      minY = Math.min(minY, absY);
      maxY = Math.max(maxY, absY);
    }

    // Encode absolute coordinates with flags in low 3 bits
    // Shift coordinates left by 3 bits to make room for flags
    // As per official app line 780: buffer[index64] = (byte) ((int) numArray4[index64 / 4, 0] << 3 & (int) byte.MaxValue);
    let xEncoded = (absX << 3) & 0xFFFF;
    let yEncoded = (absY << 3) & 0xFFFF;

    // Add jump flag if this is a JUMP (1) or TRIM (2) command
    // PyStitch constants: STITCH=0, JUMP=1, TRIM=2
    if (cmd === 1 || cmd === 2) {
      yEncoded |= PEN_FEED_DATA;
    }

    // Check for color change by comparing stitch color index
    // Mark the LAST stitch of the previous color with PEN_COLOR_END
    const nextStitch = stitches[i + 1];
    const nextStitchColor = nextStitch?.[3];

    if (nextStitchColor !== undefined && nextStitchColor !== stitchColor) {
      // This is the last stitch before a color change
      xEncoded = (xEncoded & 0xFFF8) | PEN_COLOR_END;
      currentColor = nextStitchColor;
    }

    // Add stitch as 4 bytes: [X_low, X_high, Y_low, Y_high]
    penStitches.push(
      xEncoded & 0xFF,
      (xEncoded >> 8) & 0xFF,
      yEncoded & 0xFF,
      (yEncoded >> 8) & 0xFF
    );

    // Check for end command
    if ((cmd & END) !== 0) {
      // Mark as data end
      const lastIdx = penStitches.length - 4;
      penStitches[lastIdx] = (penStitches[lastIdx] & 0xF8) | PEN_DATA_END;
      break;
    }
  }

  // Mark the last stitch with DATA_END if not already marked
  if (penStitches.length > 0) {
    const lastIdx = penStitches.length - 4;
    if ((penStitches[lastIdx] & 0x07) !== PEN_DATA_END) {
      penStitches[lastIdx] = (penStitches[lastIdx] & 0xF8) | PEN_DATA_END;
    }
  }

  const penData = new Uint8Array(penStitches);

  console.log('[DEBUG] PEN data size:', penData.length, 'bytes');
  console.log('[DEBUG] Encoded stitch count:', penData.length / 4);
  console.log('[DEBUG] Expected vs Actual:', data.stitch_count, 'vs', penData.length / 4);
  console.log('[DEBUG] First 20 bytes (5 stitches):',
    Array.from(penData.slice(0, 20))
      .map(b => b.toString(16).padStart(2, '0'))
      .join(' '));
  console.log('[DEBUG] Last 20 bytes (5 stitches):',
    Array.from(penData.slice(-20))
      .map(b => b.toString(16).padStart(2, '0'))
      .join(' '));
  console.log('[DEBUG] Calculated bounds from stitches:', {
    minX,
    maxX,
    minY,
    maxY,
  });

  // Check for color change markers and end marker
  let colorChangeCount = 0;
  let hasEndMarker = false;
  for (let i = 0; i < penData.length; i += 4) {
    const xLow = penData[i];
    const yLow = penData[i + 2];
    if ((xLow & 0x07) === PEN_COLOR_END) colorChangeCount++;
    if ((xLow & 0x07) === PEN_DATA_END) hasEndMarker = true;
  }
  console.log('[DEBUG] Color changes found:', colorChangeCount, '| Has END marker:', hasEndMarker);

  return {
    stitches,
    threads,
    penData,
    colorCount: data.thread_count,
    stitchCount: data.stitch_count,
    bounds: {
      minX: minX === Infinity ? 0 : minX,
      maxX: maxX === -Infinity ? 0 : maxX,
      minY: minY === Infinity ? 0 : minY,
      maxY: maxY === -Infinity ? 0 : maxY,
    },
  };
}

/**
 * Get thread color from pattern data
 */
export function getThreadColor(data: PesPatternData, colorIndex: number): string {
  if (!data.threads || colorIndex < 0 || colorIndex >= data.threads.length) {
    // Default colors if not specified or index out of bounds
    const defaultColors = [
      '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
      '#FF00FF', '#00FFFF', '#FFA500', '#800080',
    ];
    const safeIndex = Math.max(0, colorIndex) % defaultColors.length;
    return defaultColors[safeIndex];
  }

  return data.threads[colorIndex]?.hex || '#000000';
}
