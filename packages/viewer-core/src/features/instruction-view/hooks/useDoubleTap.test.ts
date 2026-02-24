import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDoubleTap } from './useDoubleTap';

/** Helper: create a minimal React.MouseEvent with clientX and a target element */
function makeTapEvent(clientX: number, elementWidth = 200): React.MouseEvent {
  const rect = { left: 0, right: elementWidth, width: elementWidth } as DOMRect;
  return {
    clientX,
    currentTarget: { getBoundingClientRect: () => rect } as HTMLElement,
  } as unknown as React.MouseEvent;
}

describe('useDoubleTap', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('calls onDoubleTap("left") on second tap within 300ms on left half', () => {
    const onDoubleTap = vi.fn();
    const { result } = renderHook(() => useDoubleTap({ onDoubleTap }));

    // First tap (left half, x=30 on 200px element)
    act(() => { result.current.handleTap(makeTapEvent(30)); });
    expect(onDoubleTap).not.toHaveBeenCalled();

    // Second tap within threshold (200ms later)
    vi.advanceTimersByTime(200);
    act(() => { result.current.handleTap(makeTapEvent(30)); });
    expect(onDoubleTap).toHaveBeenCalledWith('left');
  });

  it('calls onDoubleTap("right") on second tap within 300ms on right half', () => {
    const onDoubleTap = vi.fn();
    const { result } = renderHook(() => useDoubleTap({ onDoubleTap }));

    // First tap (right half, x=150 on 200px element)
    act(() => { result.current.handleTap(makeTapEvent(150)); });
    expect(onDoubleTap).not.toHaveBeenCalled();

    // Second tap within threshold
    vi.advanceTimersByTime(100);
    act(() => { result.current.handleTap(makeTapEvent(150)); });
    expect(onDoubleTap).toHaveBeenCalledWith('right');
  });

  it('does NOT call onDoubleTap when second tap is after 300ms', () => {
    const onDoubleTap = vi.fn();
    const { result } = renderHook(() => useDoubleTap({ onDoubleTap }));

    act(() => { result.current.handleTap(makeTapEvent(30)); });

    // Wait beyond threshold
    vi.advanceTimersByTime(301);
    act(() => { result.current.handleTap(makeTapEvent(30)); });
    expect(onDoubleTap).not.toHaveBeenCalled();
  });

  it('resets after double-tap fires — third rapid tap is treated as new first tap', () => {
    const onDoubleTap = vi.fn();
    const { result } = renderHook(() => useDoubleTap({ onDoubleTap }));

    // First tap
    act(() => { result.current.handleTap(makeTapEvent(30)); });
    // Second tap → fires
    vi.advanceTimersByTime(100);
    act(() => { result.current.handleTap(makeTapEvent(30)); });
    expect(onDoubleTap).toHaveBeenCalledTimes(1);

    // Third tap immediately — should be treated as new first tap (no fire)
    vi.advanceTimersByTime(50);
    act(() => { result.current.handleTap(makeTapEvent(30)); });
    expect(onDoubleTap).toHaveBeenCalledTimes(1); // still 1

    // Fourth tap → new double-tap
    vi.advanceTimersByTime(100);
    act(() => { result.current.handleTap(makeTapEvent(150)); });
    expect(onDoubleTap).toHaveBeenCalledTimes(2);
    expect(onDoubleTap).toHaveBeenLastCalledWith('right');
  });

  it('supports custom threshold', () => {
    const onDoubleTap = vi.fn();
    const { result } = renderHook(() => useDoubleTap({ onDoubleTap, threshold: 500 }));

    act(() => { result.current.handleTap(makeTapEvent(30)); });
    vi.advanceTimersByTime(400);
    act(() => { result.current.handleTap(makeTapEvent(30)); });
    expect(onDoubleTap).toHaveBeenCalledWith('left');
  });
});
