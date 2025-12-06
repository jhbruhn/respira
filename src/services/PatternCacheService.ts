import type { PesPatternData } from '../utils/pystitchConverter';

interface CachedPattern {
  uuid: string;
  pesData: PesPatternData;
  fileName: string;
  timestamp: number;
  patternOffset?: { x: number; y: number };
}

const CACHE_KEY = 'brother_pattern_cache';

/**
 * Convert UUID Uint8Array to hex string
 */
export function uuidToString(uuid: Uint8Array): string {
  return Array.from(uuid).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Convert hex string to UUID Uint8Array
 */
export function stringToUuid(str: string): Uint8Array {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(str.substr(i * 2, 2), 16);
  }
  return bytes;
}

export class PatternCacheService {
  /**
   * Save pattern to local storage with its UUID
   */
  static savePattern(
    uuid: string,
    pesData: PesPatternData,
    fileName: string,
    patternOffset?: { x: number; y: number }
  ): void {
    try {
      // Convert penData Uint8Array to array for JSON serialization
      const pesDataWithArrayPenData = {
        ...pesData,
        penData: Array.from(pesData.penData) as unknown as Uint8Array,
      };

      const cached: CachedPattern = {
        uuid,
        pesData: pesDataWithArrayPenData,
        fileName,
        timestamp: Date.now(),
        patternOffset,
      };

      localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
      console.log('[PatternCache] Saved pattern:', fileName, 'UUID:', uuid, 'Offset:', patternOffset);
    } catch (err) {
      console.error('[PatternCache] Failed to save pattern:', err);
      // If quota exceeded, clear and try again
      if (err instanceof Error && err.name === 'QuotaExceededError') {
        this.clearCache();
      }
    }
  }

  /**
   * Get cached pattern by UUID
   */
  static getPatternByUUID(uuid: string): CachedPattern | null {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) {
        return null;
      }

      const pattern: CachedPattern = JSON.parse(cached);

      // Check if UUID matches
      if (pattern.uuid !== uuid) {
        console.log('[PatternCache] UUID mismatch. Cached:', pattern.uuid, 'Requested:', uuid);
        return null;
      }

      // Restore Uint8Array from array inside pesData
      if (Array.isArray(pattern.pesData.penData)) {
        pattern.pesData.penData = new Uint8Array(pattern.pesData.penData);
      }

      console.log('[PatternCache] Found cached pattern:', pattern.fileName, 'UUID:', uuid);
      return pattern;
    } catch (err) {
      console.error('[PatternCache] Failed to retrieve pattern:', err);
      return null;
    }
  }

  /**
   * Get the most recent cached pattern (regardless of UUID)
   */
  static getMostRecentPattern(): CachedPattern | null {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) {
        return null;
      }

      const pattern: CachedPattern = JSON.parse(cached);

      // Restore Uint8Array from array inside pesData
      if (Array.isArray(pattern.pesData.penData)) {
        pattern.pesData.penData = new Uint8Array(pattern.pesData.penData);
      }

      return pattern;
    } catch (err) {
      console.error('[PatternCache] Failed to retrieve pattern:', err);
      return null;
    }
  }

  /**
   * Check if a pattern with the given UUID exists in cache
   */
  static hasPattern(uuid: string): boolean {
    const pattern = this.getMostRecentPattern();
    return pattern?.uuid === uuid;
  }

  /**
   * Delete a specific pattern by UUID
   */
  static deletePattern(uuid: string): void {
    try {
      const cached = this.getPatternByUUID(uuid);
      if (cached) {
        localStorage.removeItem(CACHE_KEY);
        console.log('[PatternCache] Deleted pattern with UUID:', uuid);
      }
    } catch (err) {
      console.error('[PatternCache] Failed to delete pattern:', err);
    }
  }

  /**
   * Clear the pattern cache
   */
  static clearCache(): void {
    try {
      localStorage.removeItem(CACHE_KEY);
      console.log('[PatternCache] Cache cleared');
    } catch (err) {
      console.error('[PatternCache] Failed to clear cache:', err);
    }
  }

  /**
   * Get cache info for debugging
   */
  static getCacheInfo(): { hasCache: boolean; fileName?: string; uuid?: string; age?: number } {
    const pattern = this.getMostRecentPattern();
    if (!pattern) {
      return { hasCache: false };
    }

    return {
      hasCache: true,
      fileName: pattern.fileName,
      uuid: pattern.uuid,
      age: Date.now() - pattern.timestamp,
    };
  }
}
