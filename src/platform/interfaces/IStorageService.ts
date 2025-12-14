import type { PesPatternData } from '../../formats/import/pesImporter';

export interface ICachedPattern {
  uuid: string;
  pesData: PesPatternData;
  fileName: string;
  timestamp: number;
  patternOffset?: { x: number; y: number };
}

export interface IStorageService {
  savePattern(
    uuid: string,
    pesData: PesPatternData,
    fileName: string,
    patternOffset?: { x: number; y: number }
  ): Promise<void>;

  getPatternByUUID(uuid: string): Promise<ICachedPattern | null>;
  getMostRecentPattern(): Promise<ICachedPattern | null>;
  hasPattern(uuid: string): Promise<boolean>;
  deletePattern(uuid: string): Promise<void>;
  clearCache(): Promise<void>;
  getCacheInfo(): Promise<{ hasCache: boolean; fileName?: string; uuid?: string; age?: number }>;
}
