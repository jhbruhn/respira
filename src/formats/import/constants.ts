/**
 * Embroidery command constants
 * These are bitmask flags used to identify stitch types in parsed embroidery files
 *
 * These are Respira's internal flags, not PyStitch/pyembroidery command codes.
 * The import adapter maps the reader's discrete commands to these values.
 */

// Stitch type flags (bitmasks - can be combined)
export const STITCH = 0x00; // Regular stitch (no flags)
export const MOVE = 0x10; // Jump/move stitch (move without stitching)
export const JUMP = MOVE; // Alias: JUMP is the same as MOVE
export const TRIM = 0x20; // Trim thread command
export const COLOR_CHANGE = 0x40; // Color change command
export const STOP = 0x80; // Stop command
export const END = 0x100; // End of pattern
