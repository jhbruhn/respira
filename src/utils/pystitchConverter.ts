import { pyodideLoader } from "./pyodideLoader";
import {
  STITCH,
  MOVE,
  TRIM,
  END,
  PEN_FEED_DATA,
  PEN_CUT_DATA,
  PEN_COLOR_END,
  PEN_DATA_END,
} from "./embroideryConstants";

// JavaScript constants module to expose to Python
const jsEmbConstants = {
  STITCH,
  MOVE,
  TRIM,
  END,
};

export interface PesPatternData {
  stitches: number[][];
  threads: Array<{
    color: number;
    hex: string;
    brand: string | null;
    catalogNumber: string | null;
    description: string | null;
    chart: string | null;
  }>;
  uniqueColors: Array<{
    color: number;
    hex: string;
    brand: string | null;
    catalogNumber: string | null;
    description: string | null;
    chart: string | null;
    threadIndices: number[]; // Which thread entries use this color
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

  // Register our JavaScript constants module for Python to import
  pyodide.registerJsModule("js_emb_constants", jsEmbConstants);

  // Read the PES file
  const buffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(buffer);

  // Write file to Pyodide virtual filesystem
  const filename = "/tmp/pattern.pes";
  pyodide.FS.writeFile(filename, uint8Array);

  // Read the pattern using PyStitch
  const result = await pyodide.runPythonAsync(`
import pystitch
from pystitch.EmbConstant import STITCH, JUMP, TRIM, STOP, END, COLOR_CHANGE
from js_emb_constants import STITCH as JS_STITCH, MOVE as JS_MOVE, TRIM as JS_TRIM, END as JS_END

# Read the PES file
pattern = pystitch.read('${filename}')

def map_cmd(pystitch_cmd):
    """Map PyStitch command to our JavaScript constant values

    This ensures we have known, consistent values regardless of PyStitch's internal values.
    Our JS constants use pyembroidery-style bitmask values:
    STITCH = 0x00, MOVE/JUMP = 0x10, TRIM = 0x20, END = 0x100
    """
    if pystitch_cmd == STITCH:
        return JS_STITCH
    elif pystitch_cmd == JUMP:
        return JS_MOVE  # PyStitch JUMP maps to our MOVE constant
    elif pystitch_cmd == TRIM:
        return JS_TRIM
    elif pystitch_cmd == END:
        return JS_END
    else:
        # For any other commands, preserve as bitmask
        result = JS_STITCH
        if pystitch_cmd & JUMP:
            result |= JS_MOVE
        if pystitch_cmd & TRIM:
            result |= JS_TRIM
        if pystitch_cmd & END:
            result |= JS_END
        return result

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

    # Add actual stitch with color index and mapped command
    # Map PyStitch cmd values to our known JavaScript constant values
    mapped_cmd = map_cmd(cmd)
    stitches_with_colors.append([x, y, mapped_cmd, current_color])

# Convert to JSON-serializable format
{
    'stitches': stitches_with_colors,
    'threads': [
        {
            'color': thread.color if hasattr(thread, 'color') else 0,
            'hex': thread.hex_color() if hasattr(thread, 'hex_color') else '#000000',
            'catalog_number': thread.catalog_number if hasattr(thread, 'catalog_number') else -1,
            'brand': thread.brand if hasattr(thread, 'brand') else "",
            'description': thread.description if hasattr(thread, 'description') else "",
            'chart': thread.chart if hasattr(thread, 'chart') else ""
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

  // Clean up virtual file
  try {
    pyodide.FS.unlink(filename);
  } catch {
    // Ignore errors
  }

  // Extract stitches and validate
  const stitches: number[][] = Array.from(
    data.stitches as ArrayLike<ArrayLike<number>>,
  ).map((stitch) => Array.from(stitch));

  if (!stitches || stitches.length === 0) {
    throw new Error("Invalid PES file or no stitches found");
  }

  // Extract thread data - preserve null values for unavailable metadata
  const threads = (
    data.threads as Array<{
      color?: number;
      hex?: string;
      catalog_number?: number | string;
      brand?: string;
      description?: string;
      chart?: string;
    }>
  ).map((thread) => {
    // Normalize catalog_number - can be string or number from PyStitch
    const catalogNum = thread.catalog_number;
    const normalizedCatalog =
      catalogNum !== undefined &&
      catalogNum !== null &&
      catalogNum !== -1 &&
      catalogNum !== "-1" &&
      catalogNum !== ""
        ? String(catalogNum)
        : null;

    return {
      color: thread.color ?? 0,
      hex: thread.hex || "#000000",
      catalogNumber: normalizedCatalog,
      brand: thread.brand && thread.brand !== "" ? thread.brand : null,
      description: thread.description && thread.description !== "" ? thread.description : null,
      chart: thread.chart && thread.chart !== "" ? thread.chart : null,
    };
  });

  // Track bounds
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  // PyStitch returns ABSOLUTE coordinates
  // PEN format uses absolute coordinates, shifted left by 3 bits (as per official app line 780)
  const penStitches: number[] = [];

  for (let i = 0; i < stitches.length; i++) {
    const stitch = stitches[i];
    const absX = Math.round(stitch[0]);
    const absY = Math.round(stitch[1]);
    const cmd = stitch[2];
    const stitchColor = stitch[3]; // Color index from PyStitch

    // Track bounds for non-jump stitches
    if (cmd === STITCH) {
      minX = Math.min(minX, absX);
      maxX = Math.max(maxX, absX);
      minY = Math.min(minY, absY);
      maxY = Math.max(maxY, absY);
    }

    // Encode absolute coordinates with flags in low 3 bits
    // Shift coordinates left by 3 bits to make room for flags
    // As per official app line 780: buffer[index64] = (byte) ((int) numArray4[index64 / 4, 0] << 3 & (int) byte.MaxValue);
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
    // Mark the LAST stitch of the previous color with PEN_COLOR_END
    // BUT: if this is the last stitch of the entire pattern, use DATA_END instead
    const nextStitch = stitches[i + 1];
    const nextStitchColor = nextStitch?.[3];

    if (
      !isLastStitch &&
      nextStitchColor !== undefined &&
      nextStitchColor !== stitchColor
    ) {
      // This is the last stitch before a color change (but not the last stitch overall)
      xEncoded = (xEncoded & 0xfff8) | PEN_COLOR_END;
    } else if (isLastStitch) {
      // This is the very last stitch of the pattern
      xEncoded = (xEncoded & 0xfff8) | PEN_DATA_END;
    }

    // Add stitch as 4 bytes: [X_low, X_high, Y_low, Y_high]
    penStitches.push(
      xEncoded & 0xff,
      (xEncoded >> 8) & 0xff,
      yEncoded & 0xff,
      (yEncoded >> 8) & 0xff,
    );

    // Check for end command
    if ((cmd & END) !== 0) {
      break;
    }
  }

  const penData = new Uint8Array(penStitches);

  // Calculate unique colors from threads (threads represent color blocks, not unique colors)
  const uniqueColors = threads.reduce((acc, thread, idx) => {
    const existing = acc.find(c => c.hex === thread.hex);
    if (existing) {
      existing.threadIndices.push(idx);
    } else {
      acc.push({
        color: thread.color,
        hex: thread.hex,
        brand: thread.brand,
        catalogNumber: thread.catalogNumber,
        description: thread.description,
        chart: thread.chart,
        threadIndices: [idx],
      });
    }
    return acc;
  }, [] as PesPatternData['uniqueColors']);

  return {
    stitches,
    threads,
    uniqueColors,
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
export function getThreadColor(
  data: PesPatternData,
  colorIndex: number,
): string {
  if (!data.threads || colorIndex < 0 || colorIndex >= data.threads.length) {
    // Default colors if not specified or index out of bounds
    const defaultColors = [
      "#FF0000",
      "#00FF00",
      "#0000FF",
      "#FFFF00",
      "#FF00FF",
      "#00FFFF",
      "#FFA500",
      "#800080",
    ];
    const safeIndex = Math.max(0, colorIndex) % defaultColors.length;
    return defaultColors[safeIndex];
  }

  return data.threads[colorIndex]?.hex || "#000000";
}
