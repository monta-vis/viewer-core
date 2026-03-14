import { describe, it, expect, vi } from 'vitest';
import { resolveNoteIconUrl } from './resolveNoteIconUrl';
import type { MediaResolver } from '@/lib/mediaResolver';

// Mock safetyIconUrl (uses publicAsset internally)
vi.mock('@/features/instruction', () => ({
  safetyIconUrl: (filename: string) => `/${`SafetyIcons/${filename.replace(/\.(jpg|gif)$/i, '.png')}`}`,
}));

/** Create a minimal MediaResolver mock. */
function mockResolver(imageMap: Record<string, { kind: 'url'; url: string } | { kind: 'frameCapture'; data: unknown } | null>): MediaResolver {
  return {
    mode: 'processed',
    resolveImage: (areaId: string) => imageMap[areaId] ?? null,
    resolveAllPartToolImages: () => [],
    resolvePartToolImage: () => null,
    resolveVideo: () => null,
  };
}

describe('resolveNoteIconUrl', () => {
  it('returns safetyIconUrl for legacy .png filename', () => {
    const result = resolveNoteIconUrl('W001-Allgemeines-Warnzeichen.png', null);
    expect(result).toBe('/SafetyIcons/W001-Allgemeines-Warnzeichen.png');
  });

  it('returns safetyIconUrl for legacy .jpg filename (converted to .png)', () => {
    const result = resolveNoteIconUrl('icon.jpg', null);
    expect(result).toBe('/SafetyIcons/icon.png');
  });

  it('returns safetyIconUrl for legacy .gif filename (converted to .png)', () => {
    const result = resolveNoteIconUrl('icon.gif', null);
    expect(result).toBe('/SafetyIcons/icon.png');
  });

  it('returns URL string when resolver returns kind "url"', () => {
    const resolver = mockResolver({
      'vfa-uuid-1': { kind: 'url', url: 'mvis-media://proj/media/frames/vfa-uuid-1/image' },
    });
    const result = resolveNoteIconUrl('vfa-uuid-1', resolver);
    expect(result).toBe('mvis-media://proj/media/frames/vfa-uuid-1/image');
  });

  it('returns null when resolver returns kind "frameCapture"', () => {
    const resolver = mockResolver({
      'vfa-uuid-2': { kind: 'frameCapture', data: { videoId: 'v1', fps: 30, frameNumber: 10, videoSrc: '' } },
    });
    const result = resolveNoteIconUrl('vfa-uuid-2', resolver);
    expect(result).toBeNull();
  });

  it('returns null when resolver returns null for unknown VFA UUID', () => {
    const resolver = mockResolver({});
    const result = resolveNoteIconUrl('unknown-uuid', resolver);
    expect(result).toBeNull();
  });

  it('returns null when resolver is null and icon is VFA UUID', () => {
    const result = resolveNoteIconUrl('some-vfa-uuid', null);
    expect(result).toBeNull();
  });
});
