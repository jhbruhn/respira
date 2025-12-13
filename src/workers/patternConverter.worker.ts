import { loadPyodide, type PyodideInterface } from 'pyodide';
import {
  STITCH,
  MOVE,
  TRIM,
  END,
  PEN_FEED_DATA,
  PEN_CUT_DATA,
  PEN_COLOR_END,
  PEN_DATA_END,
} from '../utils/embroideryConstants';

// Message types from main thread
export type WorkerMessage =
  | { type: 'INITIALIZE'; pyodideIndexURL?: string; pystitchWheelURL?: string }
  | { type: 'CONVERT_PES'; fileData: ArrayBuffer; fileName: string };

// Response types to main thread
export type WorkerResponse =
  | { type: 'INIT_PROGRESS'; progress: number; step: string }
  | { type: 'INIT_COMPLETE' }
  | { type: 'INIT_ERROR'; error: string }
  | {
      type: 'CONVERT_COMPLETE';
      data: {
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
          threadIndices: number[];
        }>;
        penData: number[]; // Serialized as array
        colorCount: number;
        stitchCount: number;
        bounds: {
          minX: number;
          maxX: number;
          minY: number;
          maxY: number;
        };
      };
    }
  | { type: 'CONVERT_ERROR'; error: string };

console.log('[PatternConverterWorker] Worker script loaded');

let pyodide: PyodideInterface | null = null;
let isInitializing = false;

// JavaScript constants module to expose to Python
const jsEmbConstants = {
  STITCH,
  MOVE,
  TRIM,
  END,
};

/**
 * Initialize Pyodide with progress tracking
 */
async function initializePyodide(pyodideIndexURL?: string, pystitchWheelURL?: string) {
  if (pyodide) {
    return; // Already initialized
  }

  if (isInitializing) {
    throw new Error('Initialization already in progress');
  }

  isInitializing = true;

  try {
    self.postMessage({
      type: 'INIT_PROGRESS',
      progress: 0,
      step: 'Starting initialization...',
    } as WorkerResponse);

    console.log('[PyodideWorker] Loading Pyodide runtime...');

    self.postMessage({
      type: 'INIT_PROGRESS',
      progress: 10,
      step: 'Loading Python runtime...',
    } as WorkerResponse);

    // Load Pyodide runtime
    // Use provided URL or default to /assets/
    const indexURL = pyodideIndexURL || '/assets/';
    console.log('[PyodideWorker] Pyodide index URL:', indexURL);

    pyodide = await loadPyodide({
      indexURL: indexURL,
    });

    console.log('[PyodideWorker] Pyodide runtime loaded');

    self.postMessage({
      type: 'INIT_PROGRESS',
      progress: 70,
      step: 'Python runtime loaded',
    } as WorkerResponse);

    self.postMessage({
      type: 'INIT_PROGRESS',
      progress: 75,
      step: 'Loading pystitch library...',
    } as WorkerResponse);

    // Load pystitch wheel
    // Use provided URL or default
    const wheelURL = pystitchWheelURL || '/pystitch-1.0.0-py3-none-any.whl';
    console.log('[PyodideWorker] Pystitch wheel URL:', wheelURL);

    await pyodide.loadPackage(wheelURL);

    console.log('[PyodideWorker] pystitch library loaded');

    self.postMessage({
      type: 'INIT_PROGRESS',
      progress: 100,
      step: 'Ready!',
    } as WorkerResponse);

    self.postMessage({
      type: 'INIT_COMPLETE',
    } as WorkerResponse);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[PyodideWorker] Initialization error:', err);

    self.postMessage({
      type: 'INIT_ERROR',
      error: errorMsg,
    } as WorkerResponse);

    throw err;
  } finally {
    isInitializing = false;
  }
}

/**
 * Convert PES file to PEN format
 */
async function convertPesToPen(fileData: ArrayBuffer) {
  if (!pyodide) {
    throw new Error('Pyodide not initialized');
  }

  try {
    // Register our JavaScript constants module for Python to import
    pyodide.registerJsModule('js_emb_constants', jsEmbConstants);

    // Convert to Uint8Array
    const uint8Array = new Uint8Array(fileData);

    // Write file to Pyodide virtual filesystem
    const tempFileName = '/tmp/pattern.pes';
    pyodide.FS.writeFile(tempFileName, uint8Array);

    // Read the pattern using PyStitch (same logic as original converter)
    const result = await pyodide.runPythonAsync(`
import pystitch
from pystitch.EmbConstant import STITCH, JUMP, TRIM, STOP, END, COLOR_CHANGE
from js_emb_constants import STITCH as JS_STITCH, MOVE as JS_MOVE, TRIM as JS_TRIM, END as JS_END

# Read the PES file
pattern = pystitch.read('${tempFileName}')

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
#
# IMPORTANT: In PES files, COLOR_CHANGE commands can appear before finishing
# stitches (tack/lock stitches) that semantically belong to the PREVIOUS color.
# We need to detect this pattern and assign colors correctly.

stitches_with_colors = []
current_color = 0
prev_color = 0

for i, stitch in enumerate(pattern.stitches):
    x, y, cmd = stitch

    # Check for color change command
    if cmd == COLOR_CHANGE:
        prev_color = current_color
        current_color += 1
        continue

    # Check for stop command - skip it
    if cmd == STOP:
        continue

    # Check for standalone END command (no stitch data)
    if cmd == END:
        continue

    # Determine which color this stitch belongs to
    # After a COLOR_CHANGE, check if this might be a finishing tack stitch
    # belonging to the previous color rather than the new color
    stitch_color = current_color

    # If this is the first stitch after a color change (color just incremented)
    # and it's a very small stitch before a JUMP, it's likely a tack stitch
    if current_color != prev_color and len(stitches_with_colors) > 0:
        last_x, last_y = stitches_with_colors[-1][0], stitches_with_colors[-1][1]
        dx, dy = x - last_x, y - last_y
        dist = (dx*dx + dy*dy)**0.5

        # Check if this is a tiny stitch (< 1.0 unit - typical tack stitch)
        # and if there's a JUMP coming soon
        if dist < 1.0:
            # Look ahead to see if there's a JUMP within next 10 stitches
            has_jump_ahead = False
            for j in range(i+1, min(i+11, len(pattern.stitches))):
                next_stitch = pattern.stitches[j]
                next_cmd = next_stitch[2]
                if next_cmd == JUMP:
                    has_jump_ahead = True
                    break
                elif next_cmd == STITCH:
                    # If we hit a regular stitch before a JUMP, this might be the new color
                    next_x, next_y = next_stitch[0], next_stitch[1]
                    next_dist = ((next_x - last_x)**2 + (next_y - last_y)**2)**0.5
                    # Only continue if following stitches are also tiny
                    if next_dist >= 1.0:
                        break

            # If we found a jump ahead, this small stitch belongs to previous color
            if has_jump_ahead:
                stitch_color = prev_color

    # Add actual stitch with assigned color index and mapped command
    mapped_cmd = map_cmd(cmd)
    stitches_with_colors.append([x, y, mapped_cmd, stitch_color])

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
      pyodide.FS.unlink(tempFileName);
    } catch {
      // Ignore errors
    }

    // Extract stitches and validate
    const stitches: number[][] = Array.from(
      data.stitches as ArrayLike<ArrayLike<number>>
    ).map((stitch) => Array.from(stitch));

    if (!stitches || stitches.length === 0) {
      throw new Error('Invalid PES file or no stitches found');
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
        catalogNum !== '-1' &&
        catalogNum !== ''
          ? String(catalogNum)
          : null;

      return {
        color: thread.color ?? 0,
        hex: thread.hex || '#000000',
        catalogNumber: normalizedCatalog,
        brand: thread.brand && thread.brand !== '' ? thread.brand : null,
        description:
          thread.description && thread.description !== ''
            ? thread.description
            : null,
        chart: thread.chart && thread.chart !== '' ? thread.chart : null,
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
        (yEncoded >> 8) & 0xff
      );

      // Check for end command
      if ((cmd & END) !== 0) {
        break;
      }
    }

    // Calculate unique colors from threads (threads represent color blocks, not unique colors)
    const uniqueColors = threads.reduce(
      (acc, thread, idx) => {
        const existing = acc.find((c) => c.hex === thread.hex);
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
      },
      [] as Array<{
        color: number;
        hex: string;
        brand: string | null;
        catalogNumber: string | null;
        description: string | null;
        chart: string | null;
        threadIndices: number[];
      }>
    );

    // Post result back to main thread
    self.postMessage({
      type: 'CONVERT_COMPLETE',
      data: {
        stitches,
        threads,
        uniqueColors,
        penData: penStitches, // Send as array (will be converted to Uint8Array in main thread)
        colorCount: data.thread_count,
        stitchCount: data.stitch_count,
        bounds: {
          minX: minX === Infinity ? 0 : minX,
          maxX: maxX === -Infinity ? 0 : maxX,
          minY: minY === Infinity ? 0 : minY,
          maxY: maxY === -Infinity ? 0 : maxY,
        },
      },
    } as WorkerResponse);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[PyodideWorker] Conversion error:', err);

    self.postMessage({
      type: 'CONVERT_ERROR',
      error: errorMsg,
    } as WorkerResponse);

    throw err;
  }
}

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  console.log('[PatternConverterWorker] Received message:', message.type);

  try {
    switch (message.type) {
      case 'INITIALIZE':
        console.log('[PatternConverterWorker] Starting initialization...');
        await initializePyodide(message.pyodideIndexURL, message.pystitchWheelURL);
        break;

      case 'CONVERT_PES':
        console.log('[PatternConverterWorker] Starting PES conversion...');
        await convertPesToPen(message.fileData);
        break;

      default:
        console.error('[PatternConverterWorker] Unknown message type:', message);
    }
  } catch (err) {
    console.error('[PatternConverterWorker] Error handling message:', err);
  }
};

console.log('[PatternConverterWorker] Message handler registered');
