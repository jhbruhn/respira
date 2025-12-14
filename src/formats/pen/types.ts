/**
 * PEN Format Types
 *
 * Type definitions for decoded PEN format data.
 * These types represent the parsed structure of Brother PP1 PEN embroidery files.
 */

/**
 * A single decoded PEN stitch with coordinates and flags
 */
export interface DecodedPenStitch {
  x: number;           // X coordinate (already shifted right by 3)
  y: number;           // Y coordinate (already shifted right by 3)
  xFlags: number;      // Flags from X coordinate low 3 bits
  yFlags: number;      // Flags from Y coordinate low 3 bits
  isFeed: boolean;     // Jump/move without stitching (Y-bit 0)
  isCut: boolean;      // Trim/cut thread (Y-bit 1)
  isColorEnd: boolean; // Color change marker (X-bits 0-2 = 0x03)
  isDataEnd: boolean;  // Pattern end marker (X-bits 0-2 = 0x05)

  // Compatibility aliases
  isJump: boolean;     // Alias for isFeed (backward compatibility)
  flags: number;       // Combined flags (backward compatibility)
}

/**
 * A color block representing stitches of the same thread color
 */
export interface PenColorBlock {
  startStitchIndex: number; // Index of first stitch in this color
  endStitchIndex: number;   // Index of last stitch in this color
  colorIndex: number;       // Color number (0-based)

  // Compatibility aliases
  startStitch: number; // Alias for startStitchIndex (backward compatibility)
  endStitch: number;   // Alias for endStitchIndex (backward compatibility)
}

/**
 * Complete decoded PEN pattern data
 */
export interface DecodedPenData {
  stitches: DecodedPenStitch[];
  colorBlocks: PenColorBlock[];
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}
