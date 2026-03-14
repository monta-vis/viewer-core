import { describe, it, expect } from 'vitest';
import { createLruFrameCache } from './createLruFrameCache';
import type { FrameCacheKey } from './mediaResolver';

describe('createLruFrameCache', () => {
  const makeKey = (videoId: string, frame = 1, crop?: FrameCacheKey['cropArea']): FrameCacheKey => ({
    videoId,
    frameNumber: frame,
    cropArea: crop,
  });

  it('returns null for unknown key', () => {
    const cache = createLruFrameCache();
    expect(cache.get(makeKey('v1'))).toBeNull();
  });

  it('stores and retrieves a data URL', async () => {
    const cache = createLruFrameCache();
    const url = 'data:image/jpeg;base64,abc123';
    await cache.set(makeKey('v1', 10), url);
    expect(cache.get(makeKey('v1', 10))).toBe(url);
  });

  it('evicts oldest entry when exceeding maxEntries', async () => {
    const cache = createLruFrameCache(2);
    await cache.set(makeKey('v1'), 'url1');
    await cache.set(makeKey('v2'), 'url2');
    await cache.set(makeKey('v3'), 'url3'); // should evict v1

    expect(cache.get(makeKey('v1'))).toBeNull();
    expect(cache.get(makeKey('v2'))).toBe('url2');
    expect(cache.get(makeKey('v3'))).toBe('url3');
  });

  it('promotes accessed entries so they survive eviction', async () => {
    const cache = createLruFrameCache(2);
    await cache.set(makeKey('v1'), 'url1');
    await cache.set(makeKey('v2'), 'url2');

    // Access v1 to promote it
    cache.get(makeKey('v1'));

    // v2 is now oldest, should be evicted
    await cache.set(makeKey('v3'), 'url3');

    expect(cache.get(makeKey('v1'))).toBe('url1');
    expect(cache.get(makeKey('v2'))).toBeNull();
    expect(cache.get(makeKey('v3'))).toBe('url3');
  });

  it('serializes keys correctly with null crop area values', async () => {
    const cache = createLruFrameCache();
    const crop = { x: null, y: null, width: null, height: null };
    await cache.set(makeKey('v1', 5, crop), 'url-crop');
    expect(cache.get(makeKey('v1', 5, crop))).toBe('url-crop');
  });

  it('distinguishes keys with different crop areas', async () => {
    const cache = createLruFrameCache();
    const cropA = { x: 0, y: 0, width: 100, height: 100 };
    const cropB = { x: 10, y: 20, width: 100, height: 100 };

    await cache.set(makeKey('v1', 5, cropA), 'urlA');
    await cache.set(makeKey('v1', 5, cropB), 'urlB');

    expect(cache.get(makeKey('v1', 5, cropA))).toBe('urlA');
    expect(cache.get(makeKey('v1', 5, cropB))).toBe('urlB');
  });

  it('treats undefined cropArea differently from null-valued cropArea', async () => {
    const cache = createLruFrameCache();
    const crop = { x: null, y: null, width: null, height: null };

    await cache.set(makeKey('v1', 5), 'url-no-crop');
    await cache.set(makeKey('v1', 5, crop), 'url-null-crop');

    expect(cache.get(makeKey('v1', 5))).toBe('url-no-crop');
    expect(cache.get(makeKey('v1', 5, crop))).toBe('url-null-crop');
  });

  it('clear() empties the cache', async () => {
    const cache = createLruFrameCache();
    await cache.set(makeKey('v1'), 'url1');
    await cache.set(makeKey('v2'), 'url2');

    cache.clear();

    expect(cache.get(makeKey('v1'))).toBeNull();
    expect(cache.get(makeKey('v2'))).toBeNull();
  });

  it('set() returns the stored data URL', async () => {
    const cache = createLruFrameCache();
    const result = await cache.set(makeKey('v1'), 'data:image/jpeg;base64,test');
    expect(result).toBe('data:image/jpeg;base64,test');
  });
});
