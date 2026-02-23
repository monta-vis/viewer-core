import { describe, it, expect } from 'vitest';
import { computeVideoBounds } from './useVideoBounds';

describe('computeVideoBounds', () => {
  it('returns null when container is null', () => {
    const video = { videoWidth: 1920, videoHeight: 1080 };
    expect(computeVideoBounds(null, video)).toBeNull();
  });

  it('returns null when video is null', () => {
    const container = { clientWidth: 800, clientHeight: 600 };
    expect(computeVideoBounds(container, null)).toBeNull();
  });

  it('returns null when videoWidth is 0', () => {
    const container = { clientWidth: 800, clientHeight: 600 };
    const video = { videoWidth: 0, videoHeight: 0 };
    expect(computeVideoBounds(container, video)).toBeNull();
  });

  it('computes correct bounds for wider-than-container video (letterbox top/bottom)', () => {
    // 16:9 video in 800x800 container → width fills, height is less
    const container = { clientWidth: 800, clientHeight: 800 };
    const video = { videoWidth: 1920, videoHeight: 1080 };
    const result = computeVideoBounds(container, video)!;

    expect(result.width).toBe(800);
    expect(result.height).toBeCloseTo(450, 0);
    expect(result.x).toBe(0);
    expect(result.y).toBeCloseTo(175, 0);
    expect(result.naturalWidth).toBe(1920);
    expect(result.naturalHeight).toBe(1080);
    expect(result.aspectRatio).toBeCloseTo(16 / 9);
  });

  it('computes correct bounds for taller-than-container video (letterbox left/right)', () => {
    // 9:16 video in 800x800 container → height fills, width is less
    const container = { clientWidth: 800, clientHeight: 800 };
    const video = { videoWidth: 1080, videoHeight: 1920 };
    const result = computeVideoBounds(container, video)!;

    expect(result.height).toBe(800);
    expect(result.width).toBe(450);
    expect(result.x).toBe(175);
    expect(result.y).toBe(0);
    expect(result.naturalWidth).toBe(1080);
    expect(result.naturalHeight).toBe(1920);
    expect(result.aspectRatio).toBeCloseTo(9 / 16);
  });

  it('computes correct bounds for exact-fit video (no letterbox)', () => {
    // Same aspect ratio as container → no letterbox
    const container = { clientWidth: 800, clientHeight: 450 };
    const video = { videoWidth: 1920, videoHeight: 1080 };
    const result = computeVideoBounds(container, video)!;

    expect(result.width).toBeCloseTo(800, 0);
    expect(result.height).toBeCloseTo(450, 0);
    expect(result.x).toBeCloseTo(0, 0);
    expect(result.y).toBeCloseTo(0, 0);
  });
});
