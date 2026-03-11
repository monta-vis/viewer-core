import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useViewportPlaybackSync } from './useViewportPlaybackSync';
import type { ViewportKeyframeRow } from '@/features/instruction';

// Mock applyViewportTransformToElement
const mockApply = vi.fn();
vi.mock('./useViewportInterpolation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./useViewportInterpolation')>();
  return {
    ...actual,
    applyViewportTransformToElement: (...args: unknown[]) => mockApply(...args),
  };
});

// ── Mock rAF ──
let rafCallbacks: Array<{ id: number; cb: FrameRequestCallback }> = [];
let nextRafId = 1;

function mockRaf(cb: FrameRequestCallback): number {
  const id = nextRafId++;
  rafCallbacks.push({ id, cb });
  return id;
}

function mockCancelRaf(id: number): void {
  rafCallbacks = rafCallbacks.filter((entry) => entry.id !== id);
}

function flushRaf(): void {
  const entry = rafCallbacks.shift();
  if (entry) entry.cb(performance.now());
}

// ── Helpers ──

function makeKeyframe(frame: number, overrides: Partial<ViewportKeyframeRow> = {}): ViewportKeyframeRow {
  return {
    id: `kf-${frame}`,
    videoSectionId: 'vs-1',
    versionId: 'v-1',
    frameNumber: frame,
    x: 0.1,
    y: 0.1,
    width: 0.5,
    height: 0.5,
    interpolation: 'hold',
    ...overrides,
  };
}

function createMockVideoRef(overrides: Partial<HTMLVideoElement> = {}) {
  const video = {
    currentTime: 0,
    style: { transform: '', transformOrigin: '' },
    ...overrides,
  } as unknown as HTMLVideoElement;
  return { current: video };
}

beforeEach(() => {
  rafCallbacks = [];
  nextRafId = 1;
  vi.stubGlobal('requestAnimationFrame', mockRaf);
  vi.stubGlobal('cancelAnimationFrame', mockCancelRaf);
  mockApply.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useViewportPlaybackSync', () => {
  it('applyAtFrame calls applyViewportTransformToElement with correct args', () => {
    const videoRef = createMockVideoRef();
    const keyframes = [makeKeyframe(0), makeKeyframe(30)];

    const { result } = renderHook(() =>
      useViewportPlaybackSync({
        videoRef,
        viewportKeyframes: keyframes,
        videoAspectRatio: 16 / 9,
        fps: 30,
      }),
    );

    act(() => { result.current.applyAtFrame(15); });

    expect(mockApply).toHaveBeenCalledWith(videoRef.current, 15, keyframes, 16 / 9);
  });

  it('applyAtFrame is no-op when keyframes is empty', () => {
    const videoRef = createMockVideoRef();

    const { result } = renderHook(() =>
      useViewportPlaybackSync({
        videoRef,
        viewportKeyframes: [],
        videoAspectRatio: 16 / 9,
        fps: 30,
      }),
    );

    act(() => { result.current.applyAtFrame(10); });

    expect(mockApply).not.toHaveBeenCalled();
  });

  it('applyAtCurrentTime reads video.currentTime and applies transform', () => {
    const videoRef = createMockVideoRef({ currentTime: 0.5 });
    const keyframes = [makeKeyframe(0), makeKeyframe(30)];

    const { result } = renderHook(() =>
      useViewportPlaybackSync({
        videoRef,
        viewportKeyframes: keyframes,
        videoAspectRatio: 16 / 9,
        fps: 30,
      }),
    );

    act(() => { result.current.applyAtCurrentTime(); });

    // frame = Math.round(0.5 * 30) = 15
    expect(mockApply).toHaveBeenCalledWith(videoRef.current, 15, keyframes, 16 / 9);
  });

  it('hasViewport reflects keyframe presence', () => {
    const videoRef = createMockVideoRef();

    const { result: withKf } = renderHook(() =>
      useViewportPlaybackSync({
        videoRef,
        viewportKeyframes: [makeKeyframe(0)],
        videoAspectRatio: 16 / 9,
        fps: 30,
      }),
    );
    expect(withKf.current.hasViewport).toBe(true);

    const { result: noKf } = renderHook(() =>
      useViewportPlaybackSync({
        videoRef,
        viewportKeyframes: [],
        videoAspectRatio: 16 / 9,
        fps: 30,
      }),
    );
    expect(noKf.current.hasViewport).toBe(false);
  });

  it('applies initial viewport on mount', () => {
    const videoRef = createMockVideoRef({ currentTime: 0.5 });
    const keyframes = [makeKeyframe(0)];

    renderHook(() =>
      useViewportPlaybackSync({
        videoRef,
        viewportKeyframes: keyframes,
        videoAspectRatio: 16 / 9,
        fps: 30,
      }),
    );

    // Mount effect: frame = Math.round(0.5 * 30) = 15
    expect(mockApply).toHaveBeenCalledWith(videoRef.current, 15, keyframes, 16 / 9);
  });

  it('updates viewport when keyframes change', () => {
    const videoRef = createMockVideoRef({ currentTime: 0 });
    const keyframes1 = [makeKeyframe(0)];
    const keyframes2 = [makeKeyframe(0, { x: 0.2 }), makeKeyframe(60)];

    const { rerender } = renderHook(
      ({ kf }) =>
        useViewportPlaybackSync({
          videoRef,
          viewportKeyframes: kf,
          videoAspectRatio: 16 / 9,
          fps: 30,
        }),
      { initialProps: { kf: keyframes1 } },
    );

    mockApply.mockClear();

    rerender({ kf: keyframes2 });

    expect(mockApply).toHaveBeenCalledWith(videoRef.current, 0, keyframes2, 16 / 9);
  });

  it('continuousSync=true starts rAF loop', () => {
    const videoRef = createMockVideoRef({ currentTime: 1.0 });
    const keyframes = [makeKeyframe(0), makeKeyframe(60)];

    renderHook(() =>
      useViewportPlaybackSync({
        videoRef,
        viewportKeyframes: keyframes,
        videoAspectRatio: 16 / 9,
        fps: 30,
        continuousSync: true,
      }),
    );

    mockApply.mockClear();

    // Flush rAF tick
    flushRaf();
    expect(mockApply).toHaveBeenCalledWith(videoRef.current, 30, keyframes, 16 / 9);
    // Should have scheduled another rAF
    expect(rafCallbacks.length).toBe(1);
  });

  it('continuousSync rAF stops on cleanup', () => {
    const videoRef = createMockVideoRef({ currentTime: 0 });
    const keyframes = [makeKeyframe(0)];

    const { unmount } = renderHook(() =>
      useViewportPlaybackSync({
        videoRef,
        viewportKeyframes: keyframes,
        videoAspectRatio: 16 / 9,
        fps: 30,
        continuousSync: true,
      }),
    );

    unmount();

    // After cleanup, flushing rAF should not call apply again
    mockApply.mockClear();
    flushRaf();
    expect(mockApply).not.toHaveBeenCalled();
  });
});
