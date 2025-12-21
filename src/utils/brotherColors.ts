/**
 * Brother Color Mapping Utilities
 *
 * This module provides utilities for mapping thread colors to official Brother
 * embroidery thread colors with their proper names and chart codes.
 *
 * Based on the Brother Embroidery thread catalog, this mapping ensures accurate
 * color identification for embroidery patterns.
 *
 * The mapping logic follows the implementation in Asura.Core.Models.EmbroideryUtil.GetThreadColorListFromPesx
 */

import brotherColorData from "../data/BrotherColor.json";

/**
 * Brother thread color data structure
 */
export interface BrotherColor {
  /** RGB red value (0-255) */
  R: number;
  /** RGB green value (0-255) */
  G: number;
  /** RGB blue value (0-255) */
  B: number;
  /** Brother thread chart code (e.g., "001", "843") */
  ColorCode: string;
  /** Color name (e.g., "WHITE", "BEIGE") */
  ColorName: string;
  /** Brand code (13 for Brother Embroidery) */
  BrandCode: number;
  /** Brand name */
  brandName?: string;
}

/**
 * Thread color information with Brother mapping
 */
export interface ThreadColorInfo {
  /** RGB color as hex string */
  hex: string;
  /** Brand name (e.g., "Brother Embroidery") */
  brand: string | null;
  /** Color catalog/chart code (e.g., "001", "843") */
  catalogNumber: string | null;
  /** Color description/name (e.g., "WHITE", "BEIGE") */
  description: string | null;
  /** Chart code (same as catalogNumber for Brother) */
  chart: string | null;
  /** RGB values */
  rgb: {
    r: number;
    g: number;
    b: number;
  };
}

// Type-safe Brother color data
const brotherColors = brotherColorData as BrotherColor[];

/**
 * Convert RGB values to hex color string
 */
function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase()}`;
}

/**
 * Pad a color code to 3 digits with leading zeros
 * e.g., "5" -> "005", "43" -> "043", "900" -> "900"
 *
 * This replicates the logic:
 * ```csharp
 * if (int.TryParse(threadCode, NumberStyles.Number, CultureInfo.InvariantCulture, out result))
 *   threadCode = $"{result:000}";
 * ```
 */
function padColorCode(code: string | number): string {
  const codeStr = typeof code === "number" ? code.toString() : code;
  const parsed = parseInt(codeStr, 10);
  if (!isNaN(parsed)) {
    return parsed.toString().padStart(3, "0");
  }
  return codeStr;
}

/**
 * Find Brother color by color code (exact match only)
 *
 * This replicates:
 * ```csharp
 * IEnumerable<BrotherColor> source2 = BrotherColor.Colors.Where<BrotherColor>((c => c.ColorCode == threadCode));
 * ```
 *
 * @param colorCode - Brother thread code (e.g., "001", "5", 843)
 * @returns Brother color data or undefined if not found
 */
export function findBrotherColorByCode(
  colorCode: string | number,
): BrotherColor | undefined {
  const paddedCode = padColorCode(colorCode);
  return brotherColors.find((c) => c.ColorCode === paddedCode);
}

/**
 * Find Brother color by RGB values (exact match only)
 *
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @returns Brother color data or undefined if no exact match found
 */
export function findBrotherColorByRGB(
  r: number,
  g: number,
  b: number,
): BrotherColor | undefined {
  return brotherColors.find((c) => c.R === r && c.G === g && c.B === b);
}

/**
 * Convert Brother color to ThreadColorInfo
 *
 * This replicates:
 * ```csharp
 * threadColor1.BrandName = brotherColor.BrandName;
 * threadColor1.BrandCode = brotherColor.BrandCode;
 * threadColor1.ColorName = brotherColor.ColorName;
 * threadColor1.ColorCode = brotherColor.ColorCode;
 * threadColor1.R = brotherColor.R;
 * threadColor1.G = brotherColor.G;
 * threadColor1.B = brotherColor.B;
 * ```
 *
 * @param brotherColor - Brother color data
 * @returns Thread color information
 */
export function brotherColorToThreadInfo(
  brotherColor: BrotherColor,
): ThreadColorInfo {
  return {
    hex: rgbToHex(brotherColor.R, brotherColor.G, brotherColor.B),
    brand: brotherColor.brandName || "Brother Embroidery",
    catalogNumber: brotherColor.ColorCode,
    description: brotherColor.ColorName,
    chart: brotherColor.ColorCode,
    rgb: {
      r: brotherColor.R,
      g: brotherColor.G,
      b: brotherColor.B,
    },
  };
}

/**
 * Map a thread color code to full Brother thread information
 *
 * This is the main mapping function that replicates the logic from
 * EmbroideryUtil.GetThreadColorListFromPesx in the C# app.
 *
 * Returns null if the color code doesn't match any Brother color (exact match only).
 *
 * @param threadCode - Thread code from pattern file (can be string or number)
 * @returns Thread color information with Brother mapping, or null if code doesn't match
 */
export function mapThreadCode(
  threadCode: string | number,
): ThreadColorInfo | null {
  // Parse and pad the thread code
  const code = padColorCode(threadCode);

  // Look up the Brother color (exact match only)
  const brotherColor = findBrotherColorByCode(code);

  if (!brotherColor) {
    return null;
  }

  return brotherColorToThreadInfo(brotherColor);
}

/**
 * Create a custom thread color (for non-Brother colors)
 *
 * This replicates the custom color handling for chartcodes 250-253:
 * ```csharp
 * if ("000".Equals(threadCode) && num >= 250 && num <= 253) {
 *   Color colorLong = EmbroideryUtil.GetColorLong(element);
 *   threadColor1.BrandName = "";
 *   threadColor1.BrandCode = num;
 *   threadColor1.ColorName = "";
 *   threadColor1.ColorCode = "0";
 *   threadColor1.R = colorLong.R;
 *   threadColor1.G = colorLong.G;
 *   threadColor1.B = colorLong.B;
 * }
 * ```
 *
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @param chartCode - Chart code (250-253 for custom colors)
 * @returns Thread color information for custom color
 */
export function createCustomThreadColor(
  r: number,
  g: number,
  b: number,
  chartCode?: number,
): ThreadColorInfo {
  return {
    hex: rgbToHex(r, g, b),
    brand: chartCode !== undefined ? "" : null,
    catalogNumber: chartCode !== undefined ? "0" : null,
    description: chartCode !== undefined ? "" : null,
    chart: chartCode !== undefined ? chartCode.toString() : null,
    rgb: { r, g, b },
  };
}

/**
 * Get all available Brother colors
 *
 * @returns Array of all Brother thread colors
 */
export function getAllBrotherColors(): BrotherColor[] {
  return [...brotherColors];
}

/**
 * Get all Brother colors as ThreadColorInfo
 *
 * @returns Array of all Brother thread colors as ThreadColorInfo
 */
export function getAllBrotherThreads(): ThreadColorInfo[] {
  return brotherColors.map(brotherColorToThreadInfo);
}

/**
 * Enhance thread data with Brother color mapping
 *
 * Takes thread data from a PES file and enhances it with Brother color information
 * if the catalogNumber matches a Brother thread code.
 *
 * This follows the logic from EmbroideryUtil.GetThreadColorListFromPesx:
 * - If catalogNumber matches a Brother color code, use Brother data
 * - Otherwise, preserve the original thread data
 *
 * @param thread - Thread data from PES file
 * @returns Enhanced thread data with Brother mapping if applicable
 */
export function enhanceThreadWithBrotherColor(thread: {
  color: number;
  hex: string;
  brand: string | null;
  catalogNumber: string | null;
  description: string | null;
  chart: string | null;
}): ThreadColorInfo {
  // If we have a catalog number, try to map it to a Brother color
  if (thread.catalogNumber) {
    const brotherInfo = mapThreadCode(thread.catalogNumber);
    if (brotherInfo) {
      // Found a Brother color match - use Brother data
      return brotherInfo;
    }
  }

  // No Brother match - return thread data as-is
  const cleanHex = thread.hex.replace("#", "");
  return {
    hex: thread.hex,
    brand: thread.brand,
    catalogNumber: thread.catalogNumber,
    description: thread.description,
    chart: thread.chart,
    rgb: {
      r: parseInt(cleanHex.slice(0, 2), 16),
      g: parseInt(cleanHex.slice(2, 4), 16),
      b: parseInt(cleanHex.slice(4, 6), 16),
    },
  };
}
