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
 * Calculate lock stitch direction by accumulating movement vectors
 * Matches the C# logic that accumulates coordinates until reaching threshold
 * @param stitches Array of stitches to analyze
 * @param currentIndex Current stitch index
 * @param lookAhead If true, look forward; if false, look backward
 * @returns Direction vector components (normalized and scaled to magnitude 8.0)
 */
function calculateLockDirection(
  stitches: number[][],
  currentIndex: number,
  lookAhead: boolean
): { dirX: number; dirY: number } {
  const TARGET_LENGTH = 8.0;  // Target accumulated length (from C# code)
  const MAX_POINTS = 5;        // Maximum points to accumulate (from C# code)

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
 * @param dirX Direction X component (scaled)
 * @param dirY Direction Y component (scaled)
 * @returns Array of PEN bytes for lock stitches
 */
function generateLockStitches(x: number, y: number, dirX: number, dirY: number): number[] {
  const lockBytes: number[] = [];

  // Generate 8 lock stitches in alternating pattern
  // Pattern from C# (from Nuihajime_TomeDataPlus): [+x, +y, -x, -y] repeated
  // The direction vector has magnitude ~8.0, so we need to scale it down
  // to get reasonable lock stitch size (approximately 0.4 units)
  const scale = 0.4 / 8.0; // Scale the magnitude-8 vector down to 0.4
  const scaledDirX = dirX * scale;
  const scaledDirY = dirY * scale;

  // Generate 8 stitches alternating between forward and backward
  for (let i = 0; i < 8; i++) {
    // Alternate between forward (+) and backward (-) direction
    const sign = (i % 2 === 0) ? 1 : -1;
    lockBytes.push(...encodeStitchPosition(x + scaledDirX * sign, y + scaledDirY * sign));
  }

  return lockBytes;
}

/**
 * Encode a stitch position to PEN bytes (4 bytes: X_low, X_high, Y_low, Y_high)
 * Coordinates are shifted left by 3 bits to make room for flags in low 3 bits
 */
function encodeStitchPosition(x: number, y: number): number[] {
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

for i, stitch in enumerate(pattern.stitches):
    x, y, cmd = stitch

    # Check for color change command
    if cmd == COLOR_CHANGE:
        current_color += 1
        continue

    # Check for stop command - skip it
    if cmd == STOP:
        continue

    # Check for standalone END command (no stitch data)
    if cmd == END:
        continue

    # PyStitch inserts duplicate stitches at the same coordinates during color changes
    # Skip any stitch that has the exact same position as the previous one
    if len(stitches_with_colors) > 0:
        last_stitch = stitches_with_colors[-1]
        last_x, last_y = last_stitch[0], last_stitch[1]

        if x == last_x and y == last_y:
            # Duplicate position - skip it
            continue

    # Add actual stitch with current color index and mapped command
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

    // Track position for calculating jump distances
    let prevX = 0;
    let prevY = 0;

    // Constants from PesxToPen.cs
    const FEED_LENGTH = 50; // Long jump threshold requiring lock stitches and cut
    console.log(stitches);
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

      // Check for long jumps that need lock stitches and cuts
      if (cmd & MOVE) {
        const jumpDist = Math.sqrt((absX - prevX) ** 2 + (absY - prevY) ** 2);

        if (jumpDist > FEED_LENGTH) {
          // Long jump - add finishing lock stitches at previous position
          const finishDir = calculateLockDirection(stitches, i - 1, false);
          penStitches.push(...generateLockStitches(prevX, prevY, finishDir.dirX, finishDir.dirY));

          // Encode jump with both FEED and CUT flags
          let xEncoded = (absX << 3) & 0xffff;
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
      const nextStitch = stitches[i + 1];
      const nextStitchColor = nextStitch?.[3];
      const isColorChange = !isLastStitch && nextStitchColor !== undefined && nextStitchColor !== stitchColor;

      // Mark the very last stitch of the pattern with DATA_END
      if (isLastStitch) {
        xEncoded = (xEncoded & 0xfff8) | PEN_DATA_END;
      }

      // Add stitch as 4 bytes: [X_low, X_high, Y_low, Y_high]
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

        console.log(`[PEN] Color change detected at stitch ${i}: color ${stitchColor} -> ${nextStitchColor}`);
        console.log(`[PEN]   Current position: (${absX}, ${absY})`);
        console.log(`[PEN]   Next stitch: cmd=${nextStitchCmd}, isJump=${nextIsJump}, pos=(${nextStitchX}, ${nextStitchY})`);

        // Step 1: Add finishing lock stitches at end of current color
        const finishDir = calculateLockDirection(stitches, i, false);
        penStitches.push(...generateLockStitches(absX, absY, finishDir.dirX, finishDir.dirY));
        console.log(`[PEN]   Added 8 finishing lock stitches at (${absX}, ${absY}) dir=(${finishDir.dirX.toFixed(2)}, ${finishDir.dirY.toFixed(2)})`);

        // Step 2: Add cut command at current position
        const cutXEncoded = (absX << 3) & 0xffff;
        const cutYEncoded = ((absY << 3) & 0xffff) | PEN_CUT_DATA;

        penStitches.push(
          cutXEncoded & 0xff,
          (cutXEncoded >> 8) & 0xff,
          cutYEncoded & 0xff,
          (cutYEncoded >> 8) & 0xff
        );
        console.log(`[PEN]   Added cut command at (${absX}, ${absY})`);

        // Step 3: If next stitch is a JUMP, encode it and skip it in the loop
        // Otherwise, add a jump ourselves if positions differ
        let jumpToX = nextStitchX;
        let jumpToY = nextStitchY;

        if (nextIsJump) {
          // The PES has a JUMP to the new color position, we'll add it here and skip it later
          console.log(`[PEN]   Next stitch is JUMP, using it to move to new color`);
          i++; // Skip the JUMP stitch since we're processing it here
        } else if (nextStitchX === absX && nextStitchY === absY) {
          // Next color starts at same position, no jump needed
          console.log(`[PEN]   Next color starts at same position, no jump needed`);
        } else {
          // Need to add a jump ourselves
          console.log(`[PEN]   Adding jump to next color position`);
        }

        // Add jump to new position (if position changed)
        if (jumpToX !== absX || jumpToY !== absY) {
          let jumpXEncoded = (jumpToX << 3) & 0xffff;
          let jumpYEncoded = (jumpToY << 3) & 0xffff;
          jumpYEncoded |= PEN_FEED_DATA; // Jump flag

          penStitches.push(
            jumpXEncoded & 0xff,
            (jumpXEncoded >> 8) & 0xff,
            jumpYEncoded & 0xff,
            (jumpYEncoded >> 8) & 0xff
          );
          console.log(`[PEN]   Added jump to (${jumpToX}, ${jumpToY})`);
        }

        // Step 4: Add COLOR_END marker at NEW position
        // This is where the machine pauses and waits for the user to change thread color
        let colorEndXEncoded = (jumpToX << 3) & 0xffff;
        let colorEndYEncoded = (jumpToY << 3) & 0xffff;

        // Add COLOR_END flag to X coordinate
        colorEndXEncoded = (colorEndXEncoded & 0xfff8) | PEN_COLOR_END;

        penStitches.push(
          colorEndXEncoded & 0xff,
          (colorEndXEncoded >> 8) & 0xff,
          colorEndYEncoded & 0xff,
          (colorEndYEncoded >> 8) & 0xff
        );
        console.log(`[PEN]   Added COLOR_END marker at (${jumpToX}, ${jumpToY})`);

        // Step 5: Add starting lock stitches at the new position
        // Look ahead from the next stitch (which might be a JUMP we skipped, so use i+1)
        const nextStitchIdx = nextIsJump ? i + 2 : i + 1;
        const startDir = calculateLockDirection(stitches, nextStitchIdx < stitches.length ? nextStitchIdx : i, true);
        penStitches.push(...generateLockStitches(jumpToX, jumpToY, startDir.dirX, startDir.dirY));
        console.log(`[PEN]   Added 8 starting lock stitches at (${jumpToX}, ${jumpToY}) dir=(${startDir.dirX.toFixed(2)}, ${startDir.dirY.toFixed(2)})`);

        // Update position
        prevX = jumpToX;
        prevY = jumpToY;
      }

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

    // Calculate PEN stitch count (should match what machine will count)
    const penStitchCount = penStitches.length / 4;

    console.log('[patternConverter] PEN encoding complete:');
    console.log(`  - PyStitch stitches: ${stitches.length}`);
    console.log(`  - PEN bytes: ${penStitches.length}`);
    console.log(`  - PEN stitches (bytes/4): ${penStitchCount}`);
    console.log(`  - Bounds: (${minX}, ${minY}) to (${maxX}, ${maxY})`);

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
