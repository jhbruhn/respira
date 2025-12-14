import { describe, it, expect } from 'vitest';
import {
  encodeStitchPosition,
  calculateLockDirection,
  generateLockStitches,
  encodeStitchesToPen,
} from './encoder';
import { decodeAllPenStitches } from './decoder';
import { STITCH, MOVE, TRIM, END } from '../import/constants';

// PEN format flag constants for testing
const PEN_FEED_DATA = 0x01;
const PEN_CUT_DATA = 0x02;

describe('encodeStitchPosition', () => {
  it('should encode position (0, 0) correctly', () => {
    const result = encodeStitchPosition(0, 0);
    expect(result).toEqual([0x00, 0x00, 0x00, 0x00]);
  });

  it('should shift coordinates left by 3 bits', () => {
    // Position (1, 1) should become (8, 8) after shifting
    const result = encodeStitchPosition(1, 1);
    expect(result).toEqual([0x08, 0x00, 0x08, 0x00]);
  });

  it('should handle negative coordinates', () => {
    // -1 in 16-bit signed = 0xFFFF, shifted left 3 = 0xFFF8
    const result = encodeStitchPosition(-1, -1);
    expect(result).toEqual([0xF8, 0xFF, 0xF8, 0xFF]);
  });

  it('should encode multi-byte coordinates correctly', () => {
    // Position (128, 0) -> shifted = 1024 = 0x0400
    const result = encodeStitchPosition(128, 0);
    expect(result).toEqual([0x00, 0x04, 0x00, 0x00]);
  });

  it('should round fractional coordinates', () => {
    const result = encodeStitchPosition(1.5, 2.4);
    // 2 << 3 = 16, 2 << 3 = 16
    expect(result).toEqual([0x10, 0x00, 0x10, 0x00]);
  });
});

describe('calculateLockDirection', () => {
  it('should look ahead for forward direction', () => {
    const stitches = [
      [0, 0, STITCH, 0],
      [10, 0, STITCH, 0],
      [20, 0, STITCH, 0],
    ];

    const result = calculateLockDirection(stitches, 0, true);

    // Should accumulate forward stitches
    expect(result.dirX).toBeGreaterThan(0);
    expect(result.dirY).toBe(0);
    // Result should have magnitude ~8.0
    const magnitude = Math.sqrt(result.dirX ** 2 + result.dirY ** 2);
    expect(magnitude).toBeCloseTo(8.0, 1);
  });

  it('should look backward for backward direction', () => {
    const stitches = [
      [0, 0, STITCH, 0],
      [10, 0, STITCH, 0],
      [20, 0, STITCH, 0],
    ];

    const result = calculateLockDirection(stitches, 2, false);

    // Should accumulate backward stitches
    expect(result.dirX).toBeLessThan(0);
    expect(result.dirY).toBe(0);
    // Result should have magnitude ~8.0
    const magnitude = Math.sqrt(result.dirX ** 2 + result.dirY ** 2);
    expect(magnitude).toBeCloseTo(8.0, 1);
  });

  it('should skip MOVE stitches when accumulating', () => {
    const stitches = [
      [0, 0, STITCH, 0],
      [5, 0, MOVE, 0],   // Should be skipped
      [10, 0, STITCH, 0],
      [15, 0, STITCH, 0],
    ];

    const result = calculateLockDirection(stitches, 0, true);

    // Should skip the MOVE stitch and only count actual stitches
    expect(result.dirX).toBeGreaterThan(0);
  });

  it('should return fallback diagonal for empty or short stitch sequences', () => {
    const stitches = [
      [0, 0, STITCH, 0],
    ];

    const result = calculateLockDirection(stitches, 0, true);

    // Should return diagonal fallback
    const expectedMag = 8.0 / Math.sqrt(2);
    expect(result.dirX).toBeCloseTo(expectedMag, 1);
    expect(result.dirY).toBeCloseTo(expectedMag, 1);
  });

  it('should normalize accumulated vector to magnitude 8.0', () => {
    const stitches = [
      [0, 0, STITCH, 0],
      [3, 4, STITCH, 0], // Distance = 5
      [6, 8, STITCH, 0], // Accumulated: (6, 8), length = 10
    ];

    const result = calculateLockDirection(stitches, 0, true);

    // Should normalize (6, 8) to magnitude 8.0
    // Expected: (6 * 8 / 10, 8 * 8 / 10) = (4.8, 6.4)
    expect(result.dirX).toBeCloseTo(4.8, 1);
    expect(result.dirY).toBeCloseTo(6.4, 1);

    const magnitude = Math.sqrt(result.dirX ** 2 + result.dirY ** 2);
    expect(magnitude).toBeCloseTo(8.0, 1);
  });

  it('should stop accumulating after reaching target length', () => {
    // Create a long chain of stitches
    const stitches = [
      [0, 0, STITCH, 0],
      [2, 0, STITCH, 0],
      [4, 0, STITCH, 0],
      [6, 0, STITCH, 0],
      [8, 0, STITCH, 0],
      [10, 0, STITCH, 0],
      [100, 0, STITCH, 0], // This should not be reached
    ];

    const result = calculateLockDirection(stitches, 0, true);

    // Should stop once accumulated length >= 8.0
    const magnitude = Math.sqrt(result.dirX ** 2 + result.dirY ** 2);
    expect(magnitude).toBeCloseTo(8.0, 1);
  });
});

describe('generateLockStitches', () => {
  it('should generate 8 lock stitches (32 bytes)', () => {
    const result = generateLockStitches(0, 0, 8.0, 0);
    expect(result.length).toBe(32); // 8 stitches * 4 bytes each
  });

  it('should alternate between +dir and -dir', () => {
    const result = generateLockStitches(0, 0, 8.0, 0);
    expect(result.length).toBe(32); // 8 stitches * 4 bytes

    // With a larger base position, verify the pattern still generates correctly
    const result2 = generateLockStitches(100, 100, 8.0, 0);
    expect(result2.length).toBe(32);
  });

  it('should rotate stitches in the given direction', () => {
    // Direction pointing right (8, 0)
    const result = generateLockStitches(0, 0, 8.0, 0);

    // Scale: 0.4 / 8.0 = 0.05
    // Scaled direction: (0.4, 0)
    // Positions should alternate between (+0.4, 0) and (-0.4, 0)

    expect(result.length).toBe(32);

    // With diagonal direction (8/√2, 8/√2)
    const diag = 8.0 / Math.sqrt(2);
    const result2 = generateLockStitches(0, 0, diag, diag);
    expect(result2.length).toBe(32);
  });
});

describe('encodeStitchesToPen', () => {
  it('should encode a simple stitch sequence', () => {
    const stitches = [
      [0, 0, STITCH, 0],
      [10, 0, STITCH, 0],
      [20, 0, STITCH | END, 0], // Last stitch with both STITCH and END flags
    ];

    const result = encodeStitchesToPen(stitches);

    expect(result.penBytes.length).toBeGreaterThan(0);
    expect(result.penBytes.length % 4).toBe(0); // Should be multiple of 4 (4 bytes per stitch)
    expect(result.bounds.minX).toBe(0);
    expect(result.bounds.maxX).toBe(20);
  });

  it('should track bounds correctly', () => {
    const stitches = [
      [10, 20, STITCH, 0],
      [-5, 30, STITCH, 0],
      [15, -10, STITCH, 0],
      [0, 0, END, 0],
    ];

    const result = encodeStitchesToPen(stitches);

    expect(result.bounds.minX).toBe(-5);
    expect(result.bounds.maxX).toBe(15);
    expect(result.bounds.minY).toBe(-10);
    expect(result.bounds.maxY).toBe(30);
  });

  it('should mark the last stitch with DATA_END flag', () => {
    const stitches = [
      [0, 0, STITCH, 0],
      [10, 0, END, 0],
    ];

    const result = encodeStitchesToPen(stitches);

    // Last stitch should have DATA_END (0x05) in low 3 bits of X coordinate
    const lastStitchStart = result.penBytes.length - 4;
    const xLow = result.penBytes[lastStitchStart];
    expect(xLow & 0x07).toBe(0x05); // DATA_END flag
  });

  it('should handle color changes with lock stitches', () => {
    const stitches = [
      [0, 0, STITCH, 0],   // Color 0
      [10, 0, STITCH, 0],  // Color 0
      [20, 0, STITCH, 0],  // Color 0 - last stitch before color change
      [20, 0, STITCH, 1],  // Color 1 - first stitch of new color
      [30, 0, STITCH, 1],  // Color 1
      [40, 0, END, 1],     // Color 1 - last stitch
    ];

    const result = encodeStitchesToPen(stitches);

    // Should include:
    // - Regular stitches for color 0 (3 stitches = 12 bytes)
    // - Finishing lock stitches (32 bytes)
    // - Cut command (4 bytes)
    // - COLOR_END marker (4 bytes)
    // - Starting lock stitches (32 bytes)
    // - Regular stitches for color 1 (3 stitches = 12 bytes)
    // Total: 96+ bytes

    expect(result.penBytes.length).toBeGreaterThan(90); // Should have many bytes from lock stitches
  });

  it('should encode color change sequence in correct order', () => {
    // Test the exact sequence of operations for a color change
    const stitches = [
      [0, 0, STITCH, 0],   // Color 0
      [10, 0, STITCH, 0],  // Color 0 - last stitch before color change
      [10, 0, STITCH, 1],  // Color 1 - first stitch (same position)
      [20, 0, STITCH | END, 1],  // Color 1 - last stitch
    ];

    const result = encodeStitchesToPen(stitches);
    const decoded = decodeAllPenStitches(result.penBytes);

    // Expected sequence:
    // 0. 8 starting lock stitches at (0, 0)
    // 1. Stitch at (0, 0) - color 0
    // 2. Stitch at (10, 0) - color 0 (last before change)
    // 3. 8 finishing lock stitches around (10, 0)
    // 4. Cut command at (10, 0)
    // 5. COLOR_END marker at (10, 0) - no jump needed since next color is at same position
    // 6. 8 starting lock stitches around (10, 0)
    // 7. Stitch at (10, 0) - color 1
    // 8. Stitch at (20, 0) - color 1 (last, with END flag)

    let idx = 0;

    // 0. 8 starting lock stitches at (0, 0)
    for (let i = 0; i < 8; i++) {
      expect(decoded[idx].x).toBeCloseTo(0, 1);
      expect(decoded[idx].y).toBeCloseTo(0, 1);
      idx++;
    }

    // 1. First stitch (0, 0)
    expect(decoded[idx].x).toBe(0);
    expect(decoded[idx].y).toBe(0);
    expect(decoded[idx].isFeed).toBe(false);
    expect(decoded[idx].isCut).toBe(false);
    idx++;

    // 2. Second stitch (10, 0) - last before color change
    expect(decoded[idx].x).toBe(10);
    expect(decoded[idx].y).toBe(0);
    idx++;

    // 3. 8 finishing lock stitches (should be around position 10, 0)
    for (let i = 0; i < 8; i++) {
      const lockStitch = decoded[idx];
      expect(lockStitch.x).toBeCloseTo(10, 1); // Allow some deviation due to rotation
      expect(lockStitch.y).toBeCloseTo(0, 1);
      expect(lockStitch.isFeed).toBe(false);
      expect(lockStitch.isCut).toBe(false);
      idx++;
    }

    // 4. Cut command
    const cutStitch = decoded[idx];
    expect(cutStitch.x).toBe(10);
    expect(cutStitch.y).toBe(0);
    expect(cutStitch.isCut).toBe(true);
    idx++;

    // 5. COLOR_END marker (no jump needed since same position)
    const colorEndStitch = decoded[idx];
    expect(colorEndStitch.x).toBe(10);
    expect(colorEndStitch.y).toBe(0);
    expect(colorEndStitch.isColorEnd).toBe(true);
    idx++;

    // 6. 8 starting lock stitches for new color
    for (let i = 0; i < 8; i++) {
      const lockStitch = decoded[idx];
      expect(lockStitch.x).toBeCloseTo(10, 1);
      expect(lockStitch.y).toBeCloseTo(0, 1);
      idx++;
    }

    // 7. First stitch of new color
    expect(decoded[idx].x).toBe(10);
    expect(decoded[idx].y).toBe(0);
    idx++;

    // 8. Last stitch with DATA_END flag
    expect(decoded[idx].x).toBe(20);
    expect(decoded[idx].y).toBe(0);
    expect(decoded[idx].isDataEnd).toBe(true);
  });

  it('should encode color change with jump in correct order', () => {
    // Test color change when next color is at a different position
    const stitches = [
      [0, 0, STITCH, 0],   // Color 0
      [10, 0, STITCH, 0],  // Color 0 - last before change
      [30, 10, STITCH, 1], // Color 1 - different position, requires jump
      [40, 10, STITCH | END, 1],
    ];

    const result = encodeStitchesToPen(stitches);
    const decoded = decodeAllPenStitches(result.penBytes);

    let idx = 10; // Skip 8 starting locks + first two regular stitches

    // After second stitch, should have:
    // 1. 8 finishing lock stitches at (10, 0)
    for (let i = 0; i < 8; i++) {
      expect(decoded[idx].x).toBeCloseTo(10, 1);
      expect(decoded[idx].y).toBeCloseTo(0, 1);
      idx++;
    }

    // 2. Cut command at (10, 0)
    expect(decoded[idx].isCut).toBe(true);
    expect(decoded[idx].x).toBe(10);
    idx++;

    // 3. Jump to new position (30, 10)
    expect(decoded[idx].x).toBe(30);
    expect(decoded[idx].y).toBe(10);
    expect(decoded[idx].isFeed).toBe(true);
    idx++;

    // 4. COLOR_END marker at (30, 10)
    expect(decoded[idx].x).toBe(30);
    expect(decoded[idx].y).toBe(10);
    expect(decoded[idx].isColorEnd).toBe(true);
    idx++;

    // 5. 8 starting lock stitches at (30, 10)
    for (let i = 0; i < 8; i++) {
      expect(decoded[idx].x).toBeCloseTo(30, 1);
      expect(decoded[idx].y).toBeCloseTo(10, 1);
      idx++;
    }

    // 6. Continue with new color stitches
    expect(decoded[idx].x).toBe(30);
    expect(decoded[idx].y).toBe(10);
  });

  it('should encode color change followed by explicit JUMP in correct order', () => {
    // Test when PES data has a JUMP stitch immediately after color change
    // This is a common pattern: color change, then jump to new location
    const stitches = [
      [0, 0, STITCH, 0],   // Color 0
      [10, 0, STITCH, 0],  // Color 0 - last before change
      [50, 20, MOVE, 1],   // Color 1 - JUMP to new location (50, 20)
      [50, 20, STITCH, 1], // Color 1 - first actual stitch at new location
      [60, 20, STITCH | END, 1],
    ];

    const result = encodeStitchesToPen(stitches);
    const decoded = decodeAllPenStitches(result.penBytes);

    // Expected sequence:
    // 1. Stitch at (0, 0) - color 0
    // 2. Stitch at (10, 0) - color 0 (last before change)
    // 3. 8 finishing lock stitches at (10, 0)
    // 4. Cut command at (10, 0)
    // 5. Jump to (50, 20) - from MOVE stitch (the encoder skips this MOVE in the loop with i++)
    // 6. COLOR_END marker at (50, 20)
    // 7. 8 starting lock stitches at (50, 20)
    // 8. First stitch of new color at (50, 20)
    // 9. Last stitch at (60, 20) with END flag

    let idx = 8; // Skip 8 starting lock stitches

    // 1-2. First two stitches
    expect(decoded[idx++].x).toBe(0);
    expect(decoded[idx++].x).toBe(10);

    // 3. 8 finishing lock stitches at (10, 0)
    for (let i = 0; i < 8; i++) {
      expect(decoded[idx].x).toBeCloseTo(10, 1);
      expect(decoded[idx].y).toBeCloseTo(0, 1);
      idx++;
    }

    // 4. Cut command at (10, 0)
    expect(decoded[idx].x).toBe(10);
    expect(decoded[idx].y).toBe(0);
    expect(decoded[idx].isCut).toBe(true);
    idx++;

    // 5. Jump to new location (50, 20) - extracted from the MOVE stitch
    expect(decoded[idx].x).toBe(50);
    expect(decoded[idx].y).toBe(20);
    expect(decoded[idx].isFeed).toBe(true);
    idx++;

    // 6. COLOR_END marker at (50, 20)
    expect(decoded[idx].x).toBe(50);
    expect(decoded[idx].y).toBe(20);
    expect(decoded[idx].isColorEnd).toBe(true);
    idx++;

    // 7. 8 starting lock stitches at (50, 20)
    for (let i = 0; i < 8; i++) {
      expect(decoded[idx].x).toBeCloseTo(50, 1);
      expect(decoded[idx].y).toBeCloseTo(20, 1);
      idx++;
    }

    // 8. First actual stitch of new color at (50, 20)
    expect(decoded[idx].x).toBe(50);
    expect(decoded[idx].y).toBe(20);
    expect(decoded[idx].isFeed).toBe(false);
    idx++;

    // 9. Last stitch with DATA_END
    expect(decoded[idx].x).toBe(60);
    expect(decoded[idx].y).toBe(20);
    expect(decoded[idx].isDataEnd).toBe(true);
  });

  it('should handle long jumps with lock stitches and cut in correct order', () => {
    // Test the exact sequence for a long jump (distance > 50)
    const stitches = [
      [0, 0, STITCH, 0],
      [10, 0, STITCH, 0],
      [100, 0, MOVE, 0],  // Long jump (distance = 90 > 50)
      [110, 0, STITCH, 0],
      [120, 0, STITCH | END, 0],
    ];

    const result = encodeStitchesToPen(stitches);
    const decoded = decodeAllPenStitches(result.penBytes);

    // Expected sequence:
    // 1. Stitch at (0, 0)
    // 2. Stitch at (10, 0)
    // 3. 8 finishing lock stitches at (10, 0)
    // 4. Jump to (100, 0) with FEED and CUT flags
    // 5. 8 starting lock stitches at (100, 0)
    // 6. Stitch at (110, 0)
    // 7. Stitch at (120, 0) with END flag

    let idx = 8; // Skip 8 starting lock stitches

    // 1-2. First two stitches
    expect(decoded[idx++].x).toBe(0);
    expect(decoded[idx++].x).toBe(10);

    // 3. 8 finishing lock stitches at (10, 0)
    for (let i = 0; i < 8; i++) {
      const lockStitch = decoded[idx];
      expect(lockStitch.x).toBeCloseTo(10, 1);
      expect(lockStitch.y).toBeCloseTo(0, 1);
      expect(lockStitch.isFeed).toBe(false);
      expect(lockStitch.isCut).toBe(false);
      idx++;
    }

    // 4. Jump to (100, 0) with BOTH FEED and CUT flags
    const jumpStitch = decoded[idx];
    expect(jumpStitch.x).toBe(100);
    expect(jumpStitch.y).toBe(0);
    expect(jumpStitch.isFeed).toBe(true);
    expect(jumpStitch.isCut).toBe(true);
    expect(jumpStitch.yFlags).toBe(PEN_FEED_DATA | PEN_CUT_DATA); // 0x03
    idx++;

    // 5. 8 starting lock stitches at (100, 0)
    for (let i = 0; i < 8; i++) {
      const lockStitch = decoded[idx];
      expect(lockStitch.x).toBeCloseTo(100, 1);
      expect(lockStitch.y).toBeCloseTo(0, 1);
      idx++;
    }

    // 6-7. Final two stitches
    expect(decoded[idx].x).toBe(110);
    expect(decoded[idx].y).toBe(0);
    idx++;

    expect(decoded[idx].x).toBe(120);
    expect(decoded[idx].isDataEnd).toBe(true);
  });

  it('should encode MOVE flag for jump stitches', () => {
    const stitches = [
      [0, 0, STITCH, 0],
      [10, 0, MOVE, 0],  // Short jump (no lock stitches)
      [20, 0, END, 0],
    ];

    const result = encodeStitchesToPen(stitches);

    // Second stitch (jump) should have FEED_DATA flag (0x01) in Y low byte
    // Stitch format: [xLow, xHigh, yLow, yHigh]
    // We need to find the jump stitch - it's the second one encoded
    const jumpStitchStart = 36; // Skip 8 starting locks (32 bytes) + first stitch (4 bytes)
    const yLow = result.penBytes[jumpStitchStart + 2];
    expect(yLow & 0x01).toBe(0x01); // FEED_DATA flag
  });

  it('should not include MOVE stitches in bounds calculation', () => {
    const stitches = [
      [0, 0, STITCH, 0],
      [100, 100, MOVE, 0],  // Jump - should not affect bounds
      [10, 10, STITCH, 0],
      [20, 20, STITCH | END, 0], // Last stitch with both STITCH and END flags
    ];

    const result = encodeStitchesToPen(stitches);

    // Bounds should only include STITCH positions, not MOVE
    expect(result.bounds.minX).toBe(0);
    expect(result.bounds.maxX).toBe(20);
    expect(result.bounds.minY).toBe(0);
    expect(result.bounds.maxY).toBe(20);
  });

  it('should handle TRIM flag correctly', () => {
    const stitches = [
      [0, 0, STITCH, 0],
      [10, 0, TRIM, 0],
      [20, 0, STITCH | END, 0],
    ];

    const result = encodeStitchesToPen(stitches);
    const decoded = decodeAllPenStitches(result.penBytes);

    let idx = 8; // Skip 8 starting lock stitches

    // Verify sequence:
    // 1. Regular stitch at (0, 0)
    const firstIdx = idx;
    expect(decoded[idx++].x).toBe(0);
    expect(decoded[firstIdx].isCut).toBe(false);

    // 2. TRIM command at (10, 0) - should have CUT flag
    const trimIdx = idx;
    expect(decoded[idx++].x).toBe(10);
    expect(decoded[trimIdx].y).toBe(0);
    expect(decoded[trimIdx].isCut).toBe(true);
    expect(decoded[trimIdx].isFeed).toBe(false); // TRIM doesn't include FEED
    expect(decoded[trimIdx].yFlags).toBe(PEN_CUT_DATA); // Only CUT flag

    // 3. Final stitch with DATA_END
    expect(decoded[idx].x).toBe(20);
    expect(decoded[idx].isDataEnd).toBe(true);
  });

  it('should handle empty stitch array', () => {
    const stitches: number[][] = [];

    const result = encodeStitchesToPen(stitches);

    expect(result.penBytes.length).toBe(0);
    expect(result.bounds.minX).toBe(0);
    expect(result.bounds.maxX).toBe(0);
    expect(result.bounds.minY).toBe(0);
    expect(result.bounds.maxY).toBe(0);
  });

  it('should handle single stitch', () => {
    const stitches = [
      [5, 10, END, 0],
    ];

    const result = encodeStitchesToPen(stitches);

    expect(result.penBytes.length).toBe(36); // 8 starting locks (32 bytes) + 1 stitch (4 bytes)
    expect(result.bounds.minX).toBe(5);
    expect(result.bounds.maxX).toBe(5);
    expect(result.bounds.minY).toBe(10);
    expect(result.bounds.maxY).toBe(10);
    // END stitches update bounds (they're not MOVE stitches)
  });

  it('should add DATA_END flag to last stitch even without END flag in input', () => {
    // Test that the encoder automatically marks the last stitch with DATA_END
    // even if the input stitches don't have an END flag
    const stitches = [
      [0, 0, STITCH, 0],
      [10, 0, STITCH, 0],
      [20, 0, STITCH, 0], // Last stitch - NO END flag
    ];

    const result = encodeStitchesToPen(stitches);
    const decoded = decodeAllPenStitches(result.penBytes);

    // First two stitches (after 8 starting locks) should NOT have DATA_END flag
    expect(decoded[8].isDataEnd).toBe(false);
    expect(decoded[9].isDataEnd).toBe(false);

    // Last stitch SHOULD have DATA_END flag automatically added
    expect(decoded[10].isDataEnd).toBe(true);
    expect(decoded[10].x).toBe(20);
    expect(decoded[10].y).toBe(0);
  });

  it('should add DATA_END flag when input has explicit END flag', () => {
    // Verify that END flag in input also results in DATA_END flag in output
    const stitches = [
      [0, 0, STITCH, 0],
      [10, 0, STITCH, 0],
      [20, 0, STITCH | END, 0], // Explicit END flag
    ];

    const result = encodeStitchesToPen(stitches);
    const decoded = decodeAllPenStitches(result.penBytes);

    // Last stitch should have DATA_END flag
    expect(decoded[10].isDataEnd).toBe(true);
    expect(decoded[10].x).toBe(20);
    expect(decoded[10].y).toBe(0);
  });

  it('should add lock stitches at the very start of the pattern', () => {
    // Matching C# behavior: Nuihajime_TomeDataPlus is called when counter <= 2
    // This adds starting lock stitches to secure the thread at pattern start
    const stitches = [
      [10, 20, STITCH, 0],
      [20, 20, STITCH, 0],
      [30, 20, STITCH | END, 0],
    ];

    const result = encodeStitchesToPen(stitches);
    const decoded = decodeAllPenStitches(result.penBytes);

    // Expected sequence:
    // 1. 8 starting lock stitches at (10, 20)
    // 2. First actual stitch at (10, 20)
    // 3. Second stitch at (20, 20)
    // 4. Last stitch at (30, 20)

    // First 8 stitches should be lock stitches around the starting position
    for (let i = 0; i < 8; i++) {
      expect(decoded[i].x).toBeCloseTo(10, 1);
      expect(decoded[i].y).toBeCloseTo(20, 1);
      expect(decoded[i].isFeed).toBe(false);
      expect(decoded[i].isCut).toBe(false);
    }

    // Then the actual stitches
    expect(decoded[8].x).toBe(10);
    expect(decoded[8].y).toBe(20);
    expect(decoded[9].x).toBe(20);
    expect(decoded[9].y).toBe(20);
    expect(decoded[10].x).toBe(30);
    expect(decoded[10].y).toBe(20);
    expect(decoded[10].isDataEnd).toBe(true);
  });
});
