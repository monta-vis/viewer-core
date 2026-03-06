import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useVideoPlayback } from './useVideoPlayback';

afterEach(cleanup);

function createMockVideo(): HTMLVideoElement {
  const video = document.createElement('video');
  // Stub play/pause to avoid JSDOM errors
  vi.spyOn(video, 'play').mockResolvedValue(undefined);
  vi.spyOn(video, 'pause').mockReturnValue(undefined);
  return video;
}

describe('useVideoPlayback – error handling', () => {
  it('exposes hasError as false initially', () => {
    const ref = { current: createMockVideo() };
    const { result } = renderHook(() => useVideoPlayback(ref));

    expect(result.current.hasError).toBe(false);
  });

  it('sets hasError to true when video fires error event', () => {
    const video = createMockVideo();
    const ref = { current: video };
    const { result } = renderHook(() => useVideoPlayback(ref));

    act(() => {
      video.dispatchEvent(new Event('error'));
    });

    expect(result.current.hasError).toBe(true);
  });

  it('resets hasError on re-mount (new hook instance)', () => {
    const video = createMockVideo();
    const ref = { current: video };
    const { result, unmount } = renderHook(() => useVideoPlayback(ref));

    // Trigger error
    act(() => {
      video.dispatchEvent(new Event('error'));
    });
    expect(result.current.hasError).toBe(true);

    // Unmount and re-mount — fresh hook instance starts with false
    unmount();

    const video2 = createMockVideo();
    const ref2 = { current: video2 };
    const { result: result2 } = renderHook(() => useVideoPlayback(ref2));

    expect(result2.current.hasError).toBe(false);
  });
});

describe('useVideoPlayback – src dependency', () => {
  it('resets hasError when src changes', () => {
    const video = createMockVideo();
    const ref = { current: video };
    let src = 'video-a.mp4';

    const { result, rerender } = renderHook(() => useVideoPlayback(ref, src));

    // Trigger error
    act(() => {
      video.dispatchEvent(new Event('error'));
    });
    expect(result.current.hasError).toBe(true);

    // Change src → effect re-runs → hasError resets
    src = 'video-b.mp4';
    rerender();

    expect(result.current.hasError).toBe(false);
  });
});

describe('useVideoPlayback – play rejection handling', () => {
  it('does not throw when play() rejects with AbortError', async () => {
    const video = createMockVideo();
    const abortError = new DOMException('The play() request was interrupted', 'AbortError');
    vi.spyOn(video, 'play').mockRejectedValue(abortError);
    const ref = { current: video };

    const { result } = renderHook(() => useVideoPlayback(ref));

    // Should not throw
    await act(async () => {
      await result.current.play();
    });
  });

  it('does not throw when play() rejects with NotAllowedError', async () => {
    const video = createMockVideo();
    const notAllowedError = new DOMException('play() failed', 'NotAllowedError');
    vi.spyOn(video, 'play').mockRejectedValue(notAllowedError);
    const ref = { current: video };

    const { result } = renderHook(() => useVideoPlayback(ref));

    await act(async () => {
      await result.current.play();
    });
  });

  it('re-throws non-DOMException errors from play()', async () => {
    const video = createMockVideo();
    vi.spyOn(video, 'play').mockRejectedValue(new Error('unexpected'));
    const ref = { current: video };

    const { result } = renderHook(() => useVideoPlayback(ref));

    await expect(
      act(async () => {
        await result.current.play();
      }),
    ).rejects.toThrow('unexpected');
  });
});
