import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';

import type { ViewportKeyframeRow } from '@/features/instruction';
import { interpolateVideoViewport, useVideoViewportInterpolation } from './useSubstepViewportInterpolation';

// Helper to create viewport keyframe row (normalized 0-1 values)
function createKeyframeRow(
  videoId: string,
  frameNumber: number,
  x: number,
  y: number,
  width: number,
  height: number,
  interpolation?: 'hold' | 'linear'
): ViewportKeyframeRow {
  return {
    id: `kf-${videoId}-${frameNumber}`,
    videoId,
    versionId: 'version-1',
    frameNumber,
    x,
    y,
    width,
    height,
    ...(interpolation ? { interpolation } : {}),
  };
}

describe('interpolateVideoViewport', () => {
  it('returns default viewport (centered, true square) for empty keyframes', () => {
    const result = interpolateVideoViewport(50, [], 16/9);
    expect(result.height).toBe(50);
    expect(result.width).toBeCloseTo(28.125, 1);
    expect(result.y).toBe(25);
    expect(result.x).toBeCloseTo(35.94, 1);
  });

  it('returns default viewport with fallback aspect ratio when not provided', () => {
    const result = interpolateVideoViewport(50, []);
    // Falls back to 16:9
    expect(result.height).toBe(50);
    expect(result.width).toBeCloseTo(28.125, 1);
  });

  it('returns single keyframe at any frame', () => {
    const keyframes = [
      createKeyframeRow('video-1', 0, 0.1, 0.2, 0.5, 0.5),
    ];

    const result = interpolateVideoViewport(50, keyframes);
    expect(result).toEqual({
      x: 10, // 0.1 * 100
      y: 20, // 0.2 * 100
      width: 50,
      height: 50,
    });
  });

  it('returns first keyframe before its frame number', () => {
    const keyframes = [
      createKeyframeRow('video-1', 50, 0.1, 0.2, 0.5, 0.5),
      createKeyframeRow('video-1', 100, 0.3, 0.4, 0.6, 0.6),
    ];

    const result = interpolateVideoViewport(25, keyframes);
    expect(result).toEqual({
      x: 10,
      y: 20,
      width: 50,
      height: 50,
    });
  });

  it('returns last keyframe after its frame number', () => {
    const keyframes = [
      createKeyframeRow('video-1', 50, 0.1, 0.2, 0.5, 0.5),
      createKeyframeRow('video-1', 100, 0.3, 0.4, 0.6, 0.6),
    ];

    const result = interpolateVideoViewport(150, keyframes);
    expect(result).toEqual({
      x: 30,
      y: 40,
      width: 60,
      height: 60,
    });
  });

  it('holds at FROM viewport between keyframes (default hold behavior)', () => {
    const keyframes = [
      createKeyframeRow('video-1', 0, 0, 0, 0.5, 0.5),
      createKeyframeRow('video-1', 100, 0.5, 0.5, 0.5, 0.5),
    ];

    // Default interpolation = hold: stays at FROM until exact TO frame
    const result = interpolateVideoViewport(50, keyframes);
    expect(result).toEqual({
      x: 0,  // FROM viewport (hold)
      y: 0,
      width: 50,
      height: 50,
    });
  });

  it('jumps to TO viewport at exact TO frame with hold', () => {
    const keyframes = [
      createKeyframeRow('video-1', 0, 0, 0, 0.5, 0.5),
      createKeyframeRow('video-1', 100, 0.5, 0.5, 0.5, 0.5),
    ];

    const result = interpolateVideoViewport(100, keyframes);
    expect(result).toEqual({
      x: 50,  // TO viewport at exact frame
      y: 50,
      width: 50,
      height: 50,
    });
  });

  it('interpolates linearly between keyframes at midpoint', () => {
    const keyframes = [
      createKeyframeRow('video-1', 0, 0, 0, 0.5, 0.5),
      createKeyframeRow('video-1', 100, 0.5, 0.5, 0.5, 0.5, 'linear'),
    ];

    const result = interpolateVideoViewport(50, keyframes);
    expect(result).toEqual({
      x: 25, // midpoint between 0 and 50
      y: 25,
      width: 50,
      height: 50,
    });
  });

  it('interpolates linearly at 25% between keyframes', () => {
    const keyframes = [
      createKeyframeRow('video-1', 0, 0, 0, 0.4, 0.4),
      createKeyframeRow('video-1', 100, 0.4, 0.4, 0.8, 0.8, 'linear'),
    ];

    const result = interpolateVideoViewport(25, keyframes);
    expect(result.x).toBeCloseTo(10); // 0 + (40-0) * 0.25
    expect(result.y).toBeCloseTo(10);
    expect(result.width).toBeCloseTo(50); // 40 + (80-40) * 0.25
    expect(result.height).toBeCloseTo(50);
  });

  it('handles unsorted keyframes with hold behavior', () => {
    const keyframes = [
      createKeyframeRow('video-1', 100, 0.5, 0.5, 0.5, 0.5),
      createKeyframeRow('video-1', 0, 0, 0, 0.5, 0.5),
    ];

    // Hold: stays at FROM (frame 0) until exact TO (frame 100)
    const result = interpolateVideoViewport(50, keyframes);
    expect(result).toEqual({
      x: 0,
      y: 0,
      width: 50,
      height: 50,
    });
  });

  it('handles keyframes at same frame number (uses first)', () => {
    const keyframes = [
      createKeyframeRow('video-1', 50, 0.1, 0.1, 0.5, 0.5),
      createKeyframeRow('video-1', 50, 0.2, 0.2, 0.6, 0.6),
    ];

    // At frame 50, should match first keyframe
    const result = interpolateVideoViewport(50, keyframes);
    expect(result).toEqual({
      x: 10,
      y: 10,
      width: 50,
      height: 50,
    });
  });

  it('interpolates linearly through multiple keyframes', () => {
    const keyframes = [
      createKeyframeRow('video-1', 0, 0, 0, 0.5, 0.5),
      createKeyframeRow('video-1', 100, 0.25, 0.25, 0.5, 0.5, 'linear'),
      createKeyframeRow('video-1', 200, 0.5, 0.5, 0.5, 0.5, 'linear'),
    ];

    // Between first and second keyframe (linear)
    const result1 = interpolateVideoViewport(50, keyframes);
    expect(result1.x).toBeCloseTo(12.5); // midpoint 0-25

    // At second keyframe
    const result2 = interpolateVideoViewport(100, keyframes);
    expect(result2.x).toBeCloseTo(25);

    // Between second and third keyframe (linear)
    const result3 = interpolateVideoViewport(150, keyframes);
    expect(result3.x).toBeCloseTo(37.5); // midpoint 25-50
  });

  it('holds through multiple keyframes when default', () => {
    const keyframes = [
      createKeyframeRow('video-1', 0, 0, 0, 0.5, 0.5),
      createKeyframeRow('video-1', 100, 0.25, 0.25, 0.5, 0.5),
      createKeyframeRow('video-1', 200, 0.5, 0.5, 0.5, 0.5),
    ];

    // Between first and second: hold at FROM
    const result1 = interpolateVideoViewport(50, keyframes);
    expect(result1.x).toBeCloseTo(0);

    // At second keyframe: jump to it
    const result2 = interpolateVideoViewport(100, keyframes);
    expect(result2.x).toBeCloseTo(25);

    // Between second and third: hold at FROM (second KF)
    const result3 = interpolateVideoViewport(150, keyframes);
    expect(result3.x).toBeCloseTo(25);
  });

  it('returns default with invalid aspectRatio (0)', () => {
    const result = interpolateVideoViewport(50, [], 0);
    // Should fall back to 16:9
    expect(result.height).toBe(50);
    expect(result.width).toBeCloseTo(28.125, 1);
  });

  it('returns default with negative aspectRatio', () => {
    const result = interpolateVideoViewport(50, [], -1);
    // Should fall back to 16:9
    expect(result.height).toBe(50);
  });

  it('handles duration of 0 between keyframes', () => {
    // Two keyframes at exact same frame should return first
    const keyframes = [
      createKeyframeRow('video-1', 50, 0.1, 0.1, 0.5, 0.5),
      createKeyframeRow('video-1', 50, 0.9, 0.9, 0.2, 0.2),
    ];

    const result = interpolateVideoViewport(50, keyframes);
    expect(result.x).toBe(10);
    expect(result.y).toBe(10);
  });

  it('handles 4:3 aspect ratio correctly', () => {
    const result = interpolateVideoViewport(50, [], 4/3);
    expect(result.height).toBe(50);
    // Width should be 50 / (4/3) = 37.5
    expect(result.width).toBeCloseTo(37.5, 1);
  });

  it('handles 1:1 aspect ratio correctly', () => {
    const result = interpolateVideoViewport(50, [], 1);
    expect(result.height).toBe(50);
    expect(result.width).toBe(50);
  });

  it('holds with explicit interpolation: "hold"', () => {
    const keyframes = [
      createKeyframeRow('video-1', 0, 0, 0, 0.5, 0.5, 'hold'),
      createKeyframeRow('video-1', 100, 0.5, 0.5, 0.5, 0.5, 'hold'),
    ];

    // Between KFs: stay at FROM
    const result = interpolateVideoViewport(50, keyframes);
    expect(result).toEqual({ x: 0, y: 0, width: 50, height: 50 });
  });

  it('mixes hold and linear keyframes in sequence', () => {
    const keyframes = [
      createKeyframeRow('video-1', 0, 0, 0, 0.5, 0.5),
      createKeyframeRow('video-1', 100, 0.5, 0.5, 0.5, 0.5, 'linear'),  // linear from 0→100
      createKeyframeRow('video-1', 200, 0.8, 0.8, 0.5, 0.5),            // hold from 100→200
    ];

    // Frame 50: linear between KF0 and KF1
    const r1 = interpolateVideoViewport(50, keyframes);
    expect(r1.x).toBeCloseTo(25);

    // Frame 150: hold between KF1 and KF2 — stays at KF1
    const r2 = interpolateVideoViewport(150, keyframes);
    expect(r2.x).toBeCloseTo(50);

    // Frame 200: exact TO frame — jump to KF2
    const r3 = interpolateVideoViewport(200, keyframes);
    expect(r3.x).toBeCloseTo(80);
  });
});

describe('useVideoViewportInterpolation', () => {
  function createKeyframeRow(
    videoId: string,
    frameNumber: number,
    x: number,
    y: number,
    width: number,
    height: number
  ): ViewportKeyframeRow {
    return {
      id: `kf-${videoId}-${frameNumber}`,
      videoId,
      versionId: 'version-1',
      frameNumber,
      x,
      y,
      width,
      height,
    };
  }

  it('returns viewport, style, and hasViewport: false for empty keyframes', () => {
    const { result } = renderHook(() =>
      useVideoViewportInterpolation({
        currentFrame: 50,
        viewportKeyframes: [],
        videoAspectRatio: 16/9,
      })
    );

    expect(result.current.hasViewport).toBe(false);
    expect(result.current.viewport).toBeDefined();
    expect(result.current.style).toBeUndefined();
  });

  it('returns hasViewport: true when keyframes exist', () => {
    const keyframes = [
      createKeyframeRow('video-1', 0, 0.25, 0.25, 0.5, 0.5),
    ];

    const { result } = renderHook(() =>
      useVideoViewportInterpolation({
        currentFrame: 50,
        viewportKeyframes: keyframes,
      })
    );

    expect(result.current.hasViewport).toBe(true);
    expect(result.current.viewport).toEqual({ x: 25, y: 25, width: 50, height: 50 });
  });

  it('holds between keyframes by default', () => {
    const keyframes = [
      createKeyframeRow('video-1', 0, 0, 0, 0.5, 0.5),
      createKeyframeRow('video-1', 100, 0.5, 0.5, 0.5, 0.5),
    ];

    const { result } = renderHook(() =>
      useVideoViewportInterpolation({
        currentFrame: 50,
        viewportKeyframes: keyframes,
      })
    );

    // Default hold: stays at FROM
    expect(result.current.viewport.x).toBe(0);
    expect(result.current.viewport.y).toBe(0);
  });

  it('maintains viewport and style values when inputs are stable', () => {
    const keyframes = [
      createKeyframeRow('video-1', 0, 0.25, 0.25, 0.5, 0.5),
    ];

    const { result, rerender } = renderHook(
      ({ currentFrame, viewportKeyframes, videoAspectRatio }) =>
        useVideoViewportInterpolation({ currentFrame, viewportKeyframes, videoAspectRatio }),
      { initialProps: { currentFrame: 50, viewportKeyframes: keyframes, videoAspectRatio: 16/9 } }
    );

    const firstViewport = result.current.viewport;

    // Rerender with same props - viewport should have same values
    rerender({ currentFrame: 50, viewportKeyframes: keyframes, videoAspectRatio: 16/9 });
    expect(result.current.viewport).toEqual(firstViewport);

    // Rerender with different frame - viewport should change
    rerender({ currentFrame: 60, viewportKeyframes: keyframes, videoAspectRatio: 16/9 });
    // Same keyframe, same values
    expect(result.current.viewport).toEqual(firstViewport);
  });

  it('updates when videoAspectRatio changes', () => {
    const { result, rerender } = renderHook(
      ({ videoAspectRatio }) =>
        useVideoViewportInterpolation({
          currentFrame: 50,
          viewportKeyframes: [],
          videoAspectRatio,
        }),
      { initialProps: { videoAspectRatio: 16/9 } }
    );

    const firstViewport = result.current.viewport;

    rerender({ videoAspectRatio: 4/3 });

    // Should have different width due to different aspect ratio
    expect(result.current.viewport.width).not.toBeCloseTo(firstViewport.width, 0);
  });
});
