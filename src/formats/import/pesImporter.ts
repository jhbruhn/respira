import { patternConverterClient, type PesPatternData } from "./client";

// Re-export the type for backwards compatibility
export type { PesPatternData };

/**
 * Reads a PES file using PyStitch (via Web Worker) and converts it to PEN format
 */
export async function convertPesToPen(file: File): Promise<PesPatternData> {
  // Delegate to the worker client
  return await patternConverterClient.convertPesToPen(file);
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
