import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useImageLoadTracker } from './useImageLoadTracker';

describe('useImageLoadTracker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires onComplete immediately when expectedCount is 0', () => {
    const onComplete = vi.fn();
    renderHook(() => useImageLoadTracker({ expectedCount: 0, onComplete }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('fires onComplete when all images loaded', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useImageLoadTracker({ expectedCount: 2, onComplete }),
    );

    act(() => {
      result.current.onImageLoad();
    });
    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      result.current.onImageLoad();
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('fires onComplete on timeout even if not all images loaded', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useImageLoadTracker({ expectedCount: 3, onComplete, timeoutMs: 5000 }),
    );

    act(() => {
      result.current.onImageLoad(); // 1 of 3
    });
    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('counts errors as loaded', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useImageLoadTracker({ expectedCount: 2, onComplete }),
    );

    act(() => {
      result.current.onImageError();
    });
    act(() => {
      result.current.onImageLoad();
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('does not fire onComplete more than once', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useImageLoadTracker({ expectedCount: 1, onComplete, timeoutMs: 5000 }),
    );

    act(() => {
      result.current.onImageLoad();
    });
    expect(onComplete).toHaveBeenCalledTimes(1);

    // Timeout should not fire again
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
