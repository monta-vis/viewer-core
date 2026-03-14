/**
 * In-memory LRU frame cache for raw (editor) mode.
 *
 * Caches extracted video frames as data URLs to avoid redundant
 * video seeking and canvas draws on re-renders.
 */

import type { FrameCacheKey, FrameCacheProvider } from './mediaResolver';

const DEFAULT_MAX_ENTRIES = 150;

export interface LruFrameCache extends FrameCacheProvider {
  clear(): void;
}

function serializeKey(key: FrameCacheKey): string {
  const crop = key.cropArea;
  const cropStr = crop
    ? `${crop.x},${crop.y},${crop.width},${crop.height}`
    : '';
  return `${key.videoId}:${key.frameNumber}:${cropStr}`;
}

export function createLruFrameCache(maxEntries = DEFAULT_MAX_ENTRIES): LruFrameCache {
  const entries = new Map<string, string>();

  return {
    get(key: FrameCacheKey): string | null {
      const serialized = serializeKey(key);
      const value = entries.get(serialized);
      if (value === undefined) return null;

      // Move to end (most recently used)
      entries.delete(serialized);
      entries.set(serialized, value);
      return value;
    },

    async set(key: FrameCacheKey, dataUrl: string): Promise<string> {
      const serialized = serializeKey(key);

      // Delete first so re-insertion moves to end
      entries.delete(serialized);
      entries.set(serialized, dataUrl);

      // Evict oldest if over limit
      if (entries.size > maxEntries) {
        const oldest = entries.keys().next().value;
        if (oldest !== undefined) {
          entries.delete(oldest);
        }
      }

      return dataUrl;
    },

    clear() {
      entries.clear();
    },
  };
}
