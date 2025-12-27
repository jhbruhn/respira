/**
 * Shared types for ProgressMonitor components
 */

export interface ColorBlock {
  colorIndex: number;
  threadHex: string;
  startStitch: number;
  endStitch: number;
  stitchCount: number;
  threadCatalogNumber: string | null;
  threadBrand: string | null;
  threadDescription: string | null;
  threadChart: string | null;
}
