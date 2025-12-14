import { PatternCacheService } from '../../services/PatternCacheService';
import type { IStorageService, ICachedPattern } from '../interfaces/IStorageService';
import type { PesPatternData } from '../../formats/import/pesImporter';

/**
 * Browser implementation of storage service using localStorage
 * Wraps the existing PatternCacheService
 */
export class BrowserStorageService implements IStorageService {
  async savePattern(
    uuid: string,
    pesData: PesPatternData,
    fileName: string,
    patternOffset?: { x: number; y: number }
  ): Promise<void> {
    PatternCacheService.savePattern(uuid, pesData, fileName, patternOffset);
  }

  async getPatternByUUID(uuid: string): Promise<ICachedPattern | null> {
    return PatternCacheService.getPatternByUUID(uuid);
  }

  async getMostRecentPattern(): Promise<ICachedPattern | null> {
    return PatternCacheService.getMostRecentPattern();
  }

  async hasPattern(uuid: string): Promise<boolean> {
    return PatternCacheService.hasPattern(uuid);
  }

  async deletePattern(uuid: string): Promise<void> {
    PatternCacheService.deletePattern(uuid);
  }

  async clearCache(): Promise<void> {
    PatternCacheService.clearCache();
  }

  async getCacheInfo(): Promise<{ hasCache: boolean; fileName?: string; uuid?: string; age?: number }> {
    return PatternCacheService.getCacheInfo();
  }
}
