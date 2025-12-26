import type { PesPatternData } from "../../formats/import/pesImporter";

export interface ICachedPattern {
  uuid: string;
  pesData: PesPatternData; // Original unrotated pattern data
  uploadedPesData?: PesPatternData; // Pattern with rotation applied (what was uploaded to machine)
  fileName: string;
  timestamp: number;
  patternOffset?: { x: number; y: number };
  patternRotation?: number; // Rotation angle in degrees
}

export interface IStorageService {
  savePattern(
    uuid: string,
    pesData: PesPatternData,
    fileName: string,
    patternOffset?: { x: number; y: number },
    patternRotation?: number,
    uploadedPesData?: PesPatternData,
  ): Promise<void>;

  getPatternByUUID(uuid: string): Promise<ICachedPattern | null>;
  getMostRecentPattern(): Promise<ICachedPattern | null>;
  hasPattern(uuid: string): Promise<boolean>;
  deletePattern(uuid: string): Promise<void>;
  clearCache(): Promise<void>;
  getCacheInfo(): Promise<{
    hasCache: boolean;
    fileName?: string;
    uuid?: string;
    age?: number;
  }>;
}
