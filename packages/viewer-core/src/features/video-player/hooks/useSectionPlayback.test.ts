// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSectionPlayback } from './useSectionPlayback';

// Mock startSectionPlaybackLoop
const mockCleanup = vi.fn();
const mockStartLoop = vi.fn(() => mockCleanup);
vi.mock('../utils/sectionPlaybackLoop', () => ({
  startSectionPlaybackLoop: (...args: unknown[]) => mockStartLoop(...args),
}));

// ── Mock HTMLVideoElement ──

function createMockVideo(overrides: Partial<HTMLVideoElement> = {}) {
  const video = {
    currentTime: 0,
    paused: true,
    playbackRate: 1,
    pause: vi.fn(() => { video.paused = true; }),
    play: vi.fn(() => { video.paused = false; return Promise.resolve(); }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    style: { transform: '', transformOrigin: '' },
    ...overrides,
  } as unknown as HTMLVideoElement;
  return video;
}

function createVideoRef(overrides: Partial<HTMLVideoElement> = {}) {
  return { current: createMockVideo(overrides) };
}

beforeEach(() => {
  mockCleanup.mockClear();
  mockStartLoop.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useSectionPlayback', () => {
  const sections = [
    { startFrame: 0, endFrame: 30 },
    { startFrame: 60, endFrame: 90 },
  ];

  it('seeks to first section start and plays when isPlaying=true', () => {
    const videoRef = createVideoRef();

    renderHook(() =>
      useSectionPlayback({
        videoRef,
        sections,
        fps: 30,
        isPlaying: true,
        onComplete: vi.fn(),
      }),
    );

    const video = videoRef.current!;
    expect(video.currentTime).toBe(0); // 0 / 30 = 0
    expect(video.play).toHaveBeenCalled();
  });

  it('calls onBeforePlay before video.play()', () => {
    const videoRef = createVideoRef();
    const onBeforePlay = vi.fn();
    const callOrder: string[] = [];

    onBeforePlay.mockImplementation(() => callOrder.push('onBeforePlay'));
    (videoRef.current! as { play: ReturnType<typeof vi.fn> }).play = vi.fn(() => {
      callOrder.push('play');
      return Promise.resolve();
    });

    renderHook(() =>
      useSectionPlayback({
        videoRef,
        sections,
        fps: 30,
        isPlaying: true,
        onBeforePlay,
        onComplete: vi.fn(),
      }),
    );

    expect(onBeforePlay).toHaveBeenCalledWith(videoRef.current, sections[0].startFrame);
    expect(callOrder).toEqual(['onBeforePlay', 'play']);
  });

  it('starts startSectionPlaybackLoop with correct sections/fps', () => {
    const videoRef = createVideoRef();
    const onTick = vi.fn();
    const onComplete = vi.fn();

    renderHook(() =>
      useSectionPlayback({
        videoRef,
        sections,
        fps: 30,
        isPlaying: true,
        onTick,
        onComplete,
      }),
    );

    expect(mockStartLoop).toHaveBeenCalledWith(
      videoRef.current,
      sections,
      30,
      expect.any(Function), // onTick wrapper
      expect.any(Function), // onComplete wrapper
    );
  });

  it('calls onComplete when sections finish', () => {
    const videoRef = createVideoRef();
    const onComplete = vi.fn();

    renderHook(() =>
      useSectionPlayback({
        videoRef,
        sections,
        fps: 30,
        isPlaying: true,
        onComplete,
      }),
    );

    // Get the onComplete callback passed to startSectionPlaybackLoop
    const loopOnComplete = mockStartLoop.mock.calls[0][4] as () => void;
    loopOnComplete();

    expect(onComplete).toHaveBeenCalled();
  });

  it('cleans up (pauses, cancels loop) when isPlaying becomes false', () => {
    const videoRef = createVideoRef();

    const { rerender } = renderHook(
      ({ isPlaying }) =>
        useSectionPlayback({
          videoRef,
          sections,
          fps: 30,
          isPlaying,
          onComplete: vi.fn(),
        }),
      { initialProps: { isPlaying: true } },
    );

    expect(mockStartLoop).toHaveBeenCalledTimes(1);

    rerender({ isPlaying: false });

    // Cleanup should have been called
    expect(mockCleanup).toHaveBeenCalled();
    expect(videoRef.current!.pause).toHaveBeenCalled();
  });

  it('cleans up on unmount', () => {
    const videoRef = createVideoRef();

    const { unmount } = renderHook(() =>
      useSectionPlayback({
        videoRef,
        sections,
        fps: 30,
        isPlaying: true,
        onComplete: vi.fn(),
      }),
    );

    unmount();

    expect(mockCleanup).toHaveBeenCalled();
    expect(videoRef.current!.pause).toHaveBeenCalled();
  });

  it('handles ended event as fallback', () => {
    const videoRef = createVideoRef();
    const onComplete = vi.fn();

    renderHook(() =>
      useSectionPlayback({
        videoRef,
        sections,
        fps: 30,
        isPlaying: true,
        onComplete,
      }),
    );

    const video = videoRef.current!;
    expect(video.addEventListener).toHaveBeenCalledWith('ended', expect.any(Function));

    // Simulate ended event
    const endedHandler = (video.addEventListener as ReturnType<typeof vi.fn>).mock.calls.find(
      (call) => call[0] === 'ended',
    )![1] as () => void;
    endedHandler();

    expect(onComplete).toHaveBeenCalled();
  });

  it('no-ops when sections array is empty', () => {
    const videoRef = createVideoRef();

    renderHook(() =>
      useSectionPlayback({
        videoRef,
        sections: [],
        fps: 30,
        isPlaying: true,
        onComplete: vi.fn(),
      }),
    );

    expect(videoRef.current!.play).not.toHaveBeenCalled();
    expect(mockStartLoop).not.toHaveBeenCalled();
  });

  it('does NOT restart when sections array identity changes but content is the same', () => {
    const videoRef = createVideoRef();
    const sectionsA = [{ startFrame: 0, endFrame: 30 }];
    const sectionsB = [{ startFrame: 0, endFrame: 30 }]; // same content, new reference

    const { rerender } = renderHook(
      ({ sections: s }) =>
        useSectionPlayback({
          videoRef,
          sections: s,
          fps: 30,
          isPlaying: true,
          onComplete: vi.fn(),
        }),
      { initialProps: { sections: sectionsA } },
    );

    expect(mockStartLoop).toHaveBeenCalledTimes(1);
    mockStartLoop.mockClear();

    // Re-render with new array reference but same content
    rerender({ sections: sectionsB });

    // Should NOT re-trigger the effect
    expect(mockStartLoop).not.toHaveBeenCalled();
  });

  it('DOES restart when section content actually changes', () => {
    const videoRef = createVideoRef();
    const sectionsA = [{ startFrame: 0, endFrame: 30 }];
    const sectionsB = [{ startFrame: 0, endFrame: 60 }]; // different content

    const { rerender } = renderHook(
      ({ sections: s }) =>
        useSectionPlayback({
          videoRef,
          sections: s,
          fps: 30,
          isPlaying: true,
          onComplete: vi.fn(),
        }),
      { initialProps: { sections: sectionsA } },
    );

    expect(mockStartLoop).toHaveBeenCalledTimes(1);
    mockStartLoop.mockClear();

    // Re-render with different content
    rerender({ sections: sectionsB });

    // SHOULD re-trigger the effect
    expect(mockStartLoop).toHaveBeenCalledTimes(1);
  });

  it('handles play() rejection (AbortError) gracefully', async () => {
    const videoRef = createVideoRef();
    const abortError = new DOMException('Aborted', 'AbortError');
    (videoRef.current! as { play: ReturnType<typeof vi.fn> }).play = vi.fn(() => Promise.reject(abortError));

    const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    // Should not throw
    renderHook(() =>
      useSectionPlayback({
        videoRef,
        sections,
        fps: 30,
        isPlaying: true,
        onComplete: vi.fn(),
      }),
    );

    // Wait for promise rejection to be handled
    await vi.waitFor(() => {
      // AbortError should be silently caught
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });
});
