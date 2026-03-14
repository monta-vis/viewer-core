import { describe, it, expect, vi } from 'vitest';
import { resolveRawFrameCapture, resolvePartToolFrameCapture } from './resolveRawFrameCapture';
import type { VideoFrameAreaRow, VideoRow } from '@/features/instruction';

vi.mock('@/lib/media', () => ({
  buildMediaUrl: (folder: string, path: string) => `mvis-media://${folder}/${path}`,
}));

const makeArea = (overrides: Partial<VideoFrameAreaRow> = {}): VideoFrameAreaRow => ({
  id: 'vfa1',
  versionId: 'v1',
  videoId: 'vid1',
  frameNumber: 42,
  x: null,
  y: null,
  width: null,
  height: null,
  type: 'SubstepImage',
  ...overrides,
} as VideoFrameAreaRow);

const makeVideo = (overrides: Partial<VideoRow> = {}): VideoRow => ({
  id: 'vid1',
  versionId: 'v1',
  fps: 30,
  width: 1920,
  height: 1080,
  videoPath: 'video.mp4',
  sectionIds: [],
  frameAreaIds: [],
  ...overrides,
} as VideoRow);

describe('resolveRawFrameCapture', () => {
  const videos = { vid1: makeVideo() };

  it('returns FrameCaptureData for valid area', () => {
    const area = makeArea();
    const result = resolveRawFrameCapture(area, videos, 'proj');
    expect(result).toEqual({
      videoSrc: 'mvis-media://proj/video.mp4',
      videoId: 'vid1',
      fps: 30,
      frameNumber: 42,
      cropArea: undefined,
    });
  });

  it('returns null for null area', () => {
    expect(resolveRawFrameCapture(null, videos, 'proj')).toBeNull();
  });

  it('returns null for undefined area', () => {
    expect(resolveRawFrameCapture(undefined, videos, 'proj')).toBeNull();
  });

  it('returns null when area has no videoId', () => {
    const area = makeArea({ videoId: '' });
    expect(resolveRawFrameCapture(area, videos, 'proj')).toBeNull();
  });

  it('returns null when frameNumber is null', () => {
    const area = makeArea({ frameNumber: null as unknown as number });
    expect(resolveRawFrameCapture(area, videos, 'proj')).toBeNull();
  });

  it('returns null when video record is missing', () => {
    const area = makeArea({ videoId: 'nonexistent' });
    expect(resolveRawFrameCapture(area, {}, 'proj')).toBeNull();
  });

  it('returns null when videoPath is null', () => {
    const area = makeArea();
    const vids = { vid1: makeVideo({ videoPath: null as unknown as string }) };
    expect(resolveRawFrameCapture(area, vids, 'proj')).toBeNull();
  });

  it('includes cropArea when x is not null', () => {
    const area = makeArea({ x: 0.1, y: 0.2, width: 0.5, height: 0.6 });
    const result = resolveRawFrameCapture(area, videos, 'proj');
    expect(result?.cropArea).toEqual({ x: 0.1, y: 0.2, width: 0.5, height: 0.6 });
  });

  it('omits cropArea when x is null', () => {
    const area = makeArea({ x: null });
    const result = resolveRawFrameCapture(area, videos, 'proj');
    expect(result?.cropArea).toBeUndefined();
  });
});

describe('resolvePartToolFrameCapture', () => {
  const videos = { vid1: makeVideo() };
  const vfas: Record<string, VideoFrameAreaRow> = {
    vfa1: makeArea({ id: 'vfa1', frameNumber: 10 }),
    vfa2: makeArea({ id: 'vfa2', frameNumber: 20 }),
  };

  it('returns null for unknown partTool (no junctions)', () => {
    expect(resolvePartToolFrameCapture('unknown', {}, vfas, videos, 'proj')).toBeNull();
  });

  it('resolves first valid area sorted by preview first', () => {
    const ptvfas = {
      j1: { partToolId: 'pt1', videoFrameAreaId: 'vfa2', isPreviewImage: false, order: 0 },
      j2: { partToolId: 'pt1', videoFrameAreaId: 'vfa1', isPreviewImage: true, order: 1 },
    };
    const result = resolvePartToolFrameCapture('pt1', ptvfas, vfas, videos, 'proj');
    // Preview (vfa1) should be tried first
    expect(result?.frameNumber).toBe(10);
  });

  it('skips junctions with unresolvable areas and returns next valid', () => {
    const ptvfas = {
      j1: { partToolId: 'pt1', videoFrameAreaId: 'missing', isPreviewImage: true, order: 0 },
      j2: { partToolId: 'pt1', videoFrameAreaId: 'vfa2', isPreviewImage: false, order: 1 },
    };
    const result = resolvePartToolFrameCapture('pt1', ptvfas, vfas, videos, 'proj');
    expect(result?.frameNumber).toBe(20);
  });

  it('returns null when all junctions are unresolvable', () => {
    const ptvfas = {
      j1: { partToolId: 'pt1', videoFrameAreaId: 'missing1', isPreviewImage: true, order: 0 },
      j2: { partToolId: 'pt1', videoFrameAreaId: 'missing2', isPreviewImage: false, order: 1 },
    };
    expect(resolvePartToolFrameCapture('pt1', ptvfas, vfas, videos, 'proj')).toBeNull();
  });

  it('filters junctions by partToolId', () => {
    const ptvfas = {
      j1: { partToolId: 'pt1', videoFrameAreaId: 'vfa1', isPreviewImage: true, order: 0 },
      j2: { partToolId: 'other', videoFrameAreaId: 'vfa2', isPreviewImage: true, order: 0 },
    };
    const result = resolvePartToolFrameCapture('pt1', ptvfas, vfas, videos, 'proj');
    expect(result?.frameNumber).toBe(10);
  });
});
