import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useViewportKeyframes } from './useViewportKeyframes';
import type { ViewportKeyframeRow } from '@monta-vis/viewer-core';

const makeKf = (
  frameNumber: number,
  overrides?: Partial<ViewportKeyframeRow>,
): ViewportKeyframeRow => ({
  id: `kf-${frameNumber}`,
  videoSectionId: 'sec-1',
  versionId: 'v1',
  frameNumber,
  x: 0.1,
  y: 0.1,
  width: 0.5,
  height: 0.5,
  interpolation: 'hold',
  ...overrides,
});

describe('useViewportKeyframes', () => {
  it('initializes with empty keyframes by default', () => {
    const { result } = renderHook(() => useViewportKeyframes());
    expect(result.current.keyframes).toHaveLength(0);
  });

  it('initializes with provided keyframes', () => {
    const initial = [makeKf(0), makeKf(30)];
    const { result } = renderHook(() => useViewportKeyframes(initial));
    expect(result.current.keyframes).toHaveLength(2);
  });

  it('upsertAtFrame adds a new keyframe', () => {
    const { result } = renderHook(() => useViewportKeyframes());
    act(() => {
      result.current.upsertAtFrame(10, {
        x: 0.2,
        y: 0.3,
        width: 0.4,
        height: 0.5,
      });
    });
    expect(result.current.keyframes).toHaveLength(1);
    expect(result.current.keyframes[0].frameNumber).toBe(10);
    expect(result.current.keyframes[0].x).toBe(0.2);
  });

  it('upsertAtFrame updates existing keyframe at same frame', () => {
    const { result } = renderHook(() =>
      useViewportKeyframes([makeKf(10)]),
    );
    act(() => {
      result.current.upsertAtFrame(10, {
        x: 0.9,
        y: 0.9,
        width: 0.1,
        height: 0.1,
      });
    });
    expect(result.current.keyframes).toHaveLength(1);
    expect(result.current.keyframes[0].x).toBe(0.9);
  });

  it('deleteAtFrame removes keyframe', () => {
    const { result } = renderHook(() =>
      useViewportKeyframes([makeKf(10), makeKf(20)]),
    );
    act(() => {
      result.current.deleteAtFrame(10);
    });
    expect(result.current.keyframes).toHaveLength(1);
    expect(result.current.keyframes[0].frameNumber).toBe(20);
  });

  it('deleteAtFrame is a no-op for non-existent frame', () => {
    const { result } = renderHook(() =>
      useViewportKeyframes([makeKf(10)]),
    );
    act(() => {
      result.current.deleteAtFrame(99);
    });
    expect(result.current.keyframes).toHaveLength(1);
  });

  it('toggleInterpolation switches hold to linear', () => {
    const { result } = renderHook(() =>
      useViewportKeyframes([makeKf(10, { interpolation: 'hold' })]),
    );
    act(() => {
      result.current.toggleInterpolation(10);
    });
    expect(result.current.keyframes[0].interpolation).toBe('linear');
  });

  it('toggleInterpolation switches linear to hold', () => {
    const { result } = renderHook(() =>
      useViewportKeyframes([makeKf(10, { interpolation: 'linear' })]),
    );
    act(() => {
      result.current.toggleInterpolation(10);
    });
    expect(result.current.keyframes[0].interpolation).toBe('hold');
  });

  it('getViewportAtFrame delegates to interpolateVideoViewport', () => {
    const kf = makeKf(0, { x: 0.1, y: 0.2, width: 0.3, height: 0.4 });
    const { result } = renderHook(() => useViewportKeyframes([kf]));
    const vp = result.current.getViewportAtFrame(0);
    // interpolateVideoViewport converts 0-1 to 0-100
    expect(vp.x).toBe(10);
    expect(vp.y).toBe(20);
    expect(vp.width).toBe(30);
    expect(vp.height).toBe(40);
  });

  it('reset replaces all keyframes', () => {
    const { result } = renderHook(() =>
      useViewportKeyframes([makeKf(10), makeKf(20)]),
    );
    act(() => {
      result.current.reset([makeKf(50)]);
    });
    expect(result.current.keyframes).toHaveLength(1);
    expect(result.current.keyframes[0].frameNumber).toBe(50);
  });
});
