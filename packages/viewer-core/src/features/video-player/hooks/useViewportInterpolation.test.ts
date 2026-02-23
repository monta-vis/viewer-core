/**
 * Tests for useViewportInterpolation hook and utility functions
 */
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useViewportInterpolation,
  interpolateViewport,
  viewportToTransform,
  lerp,
  lerpViewport,
  keyframeRowToViewport,
} from './useViewportInterpolation';
import type { ViewportKeyframeRow } from '@/features/instruction';

describe('lerp', () => {
  it('returns start value when t is 0', () => {
    expect(lerp(0, 100, 0)).toBe(0);
  });

  it('returns end value when t is 1', () => {
    expect(lerp(0, 100, 1)).toBe(100);
  });

  it('returns midpoint when t is 0.5', () => {
    expect(lerp(0, 100, 0.5)).toBe(50);
  });

  it('interpolates between negative values', () => {
    expect(lerp(-10, 10, 0.5)).toBe(0);
  });
});

describe('lerpViewport', () => {
  it('interpolates between two viewports', () => {
    const from = { x: 0, y: 0, width: 100, height: 100 };
    const to = { x: 50, y: 50, width: 50, height: 50 };

    const result = lerpViewport(from, to, 0.5);

    expect(result).toEqual({ x: 25, y: 25, width: 75, height: 75 });
  });

  it('returns from viewport when t is 0', () => {
    const from = { x: 0, y: 0, width: 100, height: 100 };
    const to = { x: 50, y: 50, width: 50, height: 50 };

    const result = lerpViewport(from, to, 0);

    expect(result).toEqual(from);
  });

  it('returns to viewport when t is 1', () => {
    const from = { x: 0, y: 0, width: 100, height: 100 };
    const to = { x: 50, y: 50, width: 50, height: 50 };

    const result = lerpViewport(from, to, 1);

    expect(result).toEqual(to);
  });
});

describe('keyframeRowToViewport', () => {
  it('converts normalized (0-1) to percentage (0-100)', () => {
    const row: ViewportKeyframeRow = {
      id: 'kf-1',
      videoId: 'video-1',
      versionId: 'ver-1',
      frameNumber: 0,
      x: 0.25,
      y: 0.5,
      width: 0.5,
      height: 0.75,
    };

    const result = keyframeRowToViewport(row);

    expect(result).toEqual({ x: 25, y: 50, width: 50, height: 75 });
  });

  it('handles full viewport (1,1,1,1)', () => {
    const row: ViewportKeyframeRow = {
      id: 'kf-1',
      videoId: 'video-1',
      versionId: 'ver-1',
      frameNumber: 0,
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    };

    const result = keyframeRowToViewport(row);

    expect(result).toEqual({ x: 0, y: 0, width: 100, height: 100 });
  });
});

describe('interpolateViewport', () => {
  const createKeyframe = (
    frameNumber: number,
    x: number,
    y: number,
    width: number,
    height: number,
    interpolation?: 'hold' | 'linear'
  ): ViewportKeyframeRow => ({
    id: `kf-${frameNumber}`,
    videoId: 'video-1',
    versionId: 'ver-1',
    frameNumber,
    x,
    y,
    width,
    height,
    interpolation,
  });

  it('returns null for empty keyframes array', () => {
    const result = interpolateViewport(50, []);
    expect(result).toBeNull();
  });

  it('returns null for undefined keyframes', () => {
    const result = interpolateViewport(50, undefined as unknown as ViewportKeyframeRow[]);
    expect(result).toBeNull();
  });

  it('returns single keyframe viewport for one keyframe', () => {
    const keyframes = [createKeyframe(0, 0.25, 0.25, 0.5, 0.5)];

    const result = interpolateViewport(50, keyframes);

    expect(result).toEqual({ x: 25, y: 25, width: 50, height: 50 });
  });

  it('returns first keyframe before first frame', () => {
    const keyframes = [
      createKeyframe(30, 0.1, 0.1, 0.5, 0.5),
      createKeyframe(60, 0.5, 0.5, 0.25, 0.25),
    ];

    const result = interpolateViewport(10, keyframes);

    expect(result).toEqual({ x: 10, y: 10, width: 50, height: 50 });
  });

  it('returns last keyframe after last frame', () => {
    const keyframes = [
      createKeyframe(30, 0.1, 0.1, 0.5, 0.5),
      createKeyframe(60, 0.5, 0.5, 0.25, 0.25),
    ];

    const result = interpolateViewport(100, keyframes);

    expect(result).toEqual({ x: 50, y: 50, width: 25, height: 25 });
  });

  it('interpolates between two keyframes (linear)', () => {
    const keyframes = [
      createKeyframe(0, 0, 0, 1, 1),
      createKeyframe(100, 0.5, 0.5, 0.5, 0.5, 'linear'),
    ];

    const result = interpolateViewport(50, keyframes);

    // At t=0.5: x = lerp(0, 50, 0.5) = 25
    expect(result).toEqual({ x: 25, y: 25, width: 75, height: 75 });
  });

  it('sorts keyframes by frame number', () => {
    const keyframes = [
      createKeyframe(100, 0.5, 0.5, 0.5, 0.5, 'linear'),
      createKeyframe(0, 0, 0, 1, 1),
    ];

    const result = interpolateViewport(50, keyframes);

    expect(result).toEqual({ x: 25, y: 25, width: 75, height: 75 });
  });

  it('handles three keyframes correctly (linear)', () => {
    const keyframes = [
      createKeyframe(0, 0, 0, 1, 1),
      createKeyframe(50, 0.25, 0.25, 0.5, 0.5, 'linear'),
      createKeyframe(100, 0.5, 0.5, 0.25, 0.25, 'linear'),
    ];

    // At frame 25, should interpolate between kf0 and kf50
    const result1 = interpolateViewport(25, keyframes);
    expect(result1?.x).toBe(12.5); // lerp(0, 25, 0.5)

    // At frame 75, should interpolate between kf50 and kf100
    const result2 = interpolateViewport(75, keyframes);
    expect(result2?.x).toBe(37.5); // lerp(25, 50, 0.5)
  });

  // ========================================
  // Interpolation mode tests (hold vs linear)
  // ========================================

  it('hold: frames between two keyframes return first KF values', () => {
    const keyframes = [
      createKeyframe(0, 0, 0, 1, 1),
      createKeyframe(100, 0.5, 0.5, 0.5, 0.5, 'hold'),
    ];

    // Frame 50 should stay at KF@0's values (hold = no interpolation)
    const result = interpolateViewport(50, keyframes);
    expect(result).toEqual({ x: 0, y: 0, width: 100, height: 100 });

    // Frame 99 should still be at KF@0
    const result99 = interpolateViewport(99, keyframes);
    expect(result99).toEqual({ x: 0, y: 0, width: 100, height: 100 });
  });

  it('linear: frames between two keyframes are lerped', () => {
    const keyframes = [
      createKeyframe(0, 0, 0, 1, 1),
      createKeyframe(100, 0.5, 0.5, 0.5, 0.5, 'linear'),
    ];

    // Frame 50 should be interpolated (lerp)
    const result = interpolateViewport(50, keyframes);
    expect(result).toEqual({ x: 25, y: 25, width: 75, height: 75 });
  });

  it('at exact second KF frame, returns second KF values regardless of interpolation', () => {
    const holdKFs = [
      createKeyframe(0, 0, 0, 1, 1),
      createKeyframe(100, 0.5, 0.5, 0.5, 0.5, 'hold'),
    ];
    const result = interpolateViewport(100, holdKFs);
    expect(result).toEqual({ x: 50, y: 50, width: 50, height: 50 });

    const linearKFs = [
      createKeyframe(0, 0, 0, 1, 1),
      createKeyframe(100, 0.5, 0.5, 0.5, 0.5, 'linear'),
    ];
    const resultLinear = interpolateViewport(100, linearKFs);
    expect(resultLinear).toEqual({ x: 50, y: 50, width: 50, height: 50 });
  });

  it('three KFs: hold, linear, hold — correct per-segment behavior', () => {
    const keyframes = [
      createKeyframe(0, 0, 0, 1, 1),                          // first KF
      createKeyframe(100, 0.5, 0.5, 0.5, 0.5, 'hold'),       // hold: jump at 100
      createKeyframe(200, 0.25, 0.25, 0.25, 0.25, 'linear'),  // linear: lerp 100→200
      createKeyframe(300, 0, 0, 0.5, 0.5, 'hold'),            // hold: jump at 300
    ];

    // Frame 50: in hold segment (0→100), stays at KF@0
    expect(interpolateViewport(50, keyframes)).toEqual({ x: 0, y: 0, width: 100, height: 100 });

    // Frame 100: exact match on KF@100
    expect(interpolateViewport(100, keyframes)).toEqual({ x: 50, y: 50, width: 50, height: 50 });

    // Frame 150: in linear segment (100→200), should lerp
    const mid = interpolateViewport(150, keyframes);
    expect(mid?.x).toBe(37.5);  // lerp(50, 25, 0.5)
    expect(mid?.width).toBe(37.5); // lerp(50, 25, 0.5)

    // Frame 250: in hold segment (200→300), stays at KF@200
    expect(interpolateViewport(250, keyframes)).toEqual({ x: 25, y: 25, width: 25, height: 25 });
  });

  it('single keyframe: interpolation field is irrelevant', () => {
    const keyframes = [createKeyframe(0, 0.25, 0.25, 0.5, 0.5, 'linear')];
    const result = interpolateViewport(50, keyframes);
    expect(result).toEqual({ x: 25, y: 25, width: 50, height: 50 });
  });

  it('first keyframe interpolation does not matter (no previous)', () => {
    // First KF is linear, but since there's no previous, it should just return its value
    const keyframes = [
      createKeyframe(0, 0, 0, 1, 1, 'linear'),
      createKeyframe(100, 0.5, 0.5, 0.5, 0.5, 'hold'),
    ];
    // Before first KF
    expect(interpolateViewport(0, keyframes)).toEqual({ x: 0, y: 0, width: 100, height: 100 });
  });

  it('default interpolation (undefined) behaves as hold', () => {
    const keyframes = [
      createKeyframe(0, 0, 0, 1, 1),
      createKeyframe(100, 0.5, 0.5, 0.5, 0.5), // no interpolation field
    ];

    // Frame 50 should stay at KF@0 (hold behavior = default)
    const result = interpolateViewport(50, keyframes);
    expect(result).toEqual({ x: 0, y: 0, width: 100, height: 100 });
  });
});

describe('viewportToTransform', () => {
  it('calculates scale from viewport width', () => {
    const viewport = { x: 0, y: 0, width: 50, height: 50 };

    const result = viewportToTransform(viewport);

    expect(result.scale).toBe(2); // 100 / 50
  });

  it('calculates translate to center viewport', () => {
    const viewport = { x: 25, y: 25, width: 50, height: 50 };
    // Center of viewport: (25 + 25, 25 + 25) = (50, 50)
    // translateX = 50 - 50 = 0
    // translateY = 50 - 50 = 0

    const result = viewportToTransform(viewport);

    expect(result.translateX).toBe(0);
    expect(result.translateY).toBe(0);
  });

  it('handles full viewport', () => {
    const viewport = { x: 0, y: 0, width: 100, height: 100 };

    const result = viewportToTransform(viewport);

    expect(result.scale).toBe(1);
    expect(result.translateX).toBe(0);
    expect(result.translateY).toBe(0);
  });

  it('handles offset viewport', () => {
    const viewport = { x: 0, y: 0, width: 50, height: 50 };
    // Center of viewport: (25, 25)
    // translateX = 50 - 25 = 25
    // translateY = 50 - 25 = 25

    const result = viewportToTransform(viewport);

    expect(result.translateX).toBe(25);
    expect(result.translateY).toBe(25);
  });
});

describe('useViewportInterpolation', () => {
  const createKeyframe = (
    frameNumber: number,
    x: number,
    y: number,
    width: number,
    height: number
  ): ViewportKeyframeRow => ({
    id: `kf-${frameNumber}`,
    videoId: 'video-1',
    versionId: 'ver-1',
    frameNumber,
    x,
    y,
    width,
    height,
  });

  it('returns null values when no keyframes', () => {
    const { result } = renderHook(() =>
      useViewportInterpolation({ currentFrame: 50, keyframes: [] })
    );

    expect(result.current.viewport).toBeNull();
    expect(result.current.transform).toBeNull();
    expect(result.current.style).toBeUndefined();
  });

  it('returns computed viewport and transform', () => {
    const keyframes = [createKeyframe(0, 0.25, 0.25, 0.5, 0.5)];

    const { result } = renderHook(() =>
      useViewportInterpolation({ currentFrame: 50, keyframes })
    );

    expect(result.current.viewport).toEqual({ x: 25, y: 25, width: 50, height: 50 });
    expect(result.current.transform).toEqual({
      scale: 2,
      translateX: 0,
      translateY: 0,
    });
  });

  it('returns style with transform CSS', () => {
    const keyframes = [createKeyframe(0, 0.25, 0.25, 0.5, 0.5)];

    const { result } = renderHook(() =>
      useViewportInterpolation({ currentFrame: 50, keyframes })
    );

    expect(result.current.style).toBeDefined();
    expect(result.current.style?.transform).toContain('scale(2)');
    expect(result.current.style?.transformOrigin).toBe('center center');
  });

  it('memoizes result based on inputs', () => {
    const keyframes = [createKeyframe(0, 0.25, 0.25, 0.5, 0.5)];

    const { result, rerender } = renderHook(
      ({ currentFrame, keyframes }) =>
        useViewportInterpolation({ currentFrame, keyframes }),
      { initialProps: { currentFrame: 50, keyframes } }
    );

    const firstResult = result.current;

    // Rerender with same props
    rerender({ currentFrame: 50, keyframes });

    // Should be the same object reference (memoized)
    expect(result.current).toBe(firstResult);

    // Rerender with different frame
    rerender({ currentFrame: 60, keyframes });

    // Should be a new object
    expect(result.current).not.toBe(firstResult);
  });
});
