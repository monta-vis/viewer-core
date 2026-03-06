import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVisibleStep } from './useVisibleStep';

let observerCallback: IntersectionObserverCallback;
let observerInstances: { observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[];

beforeEach(() => {
  observerInstances = [];
  global.IntersectionObserver = vi.fn().mockImplementation((cb: IntersectionObserverCallback) => {
    observerCallback = cb;
    const instance = {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    };
    observerInstances.push(instance);
    return instance;
  }) as unknown as typeof IntersectionObserver;
});

function makeRefs(ids: string[]): React.RefObject<Map<string, HTMLElement>> {
  const map = new Map<string, HTMLElement>();
  for (const id of ids) {
    map.set(id, document.createElement('div'));
  }
  return { current: map } as React.RefObject<Map<string, HTMLElement>>;
}

describe('useVisibleStep', () => {
  it('returns null with empty refs', () => {
    const emptyRefs = { current: new Map() } as React.RefObject<Map<string, HTMLElement>>;
    const container = { current: document.createElement('div') } as React.RefObject<HTMLElement>;
    const { result } = renderHook(() => useVisibleStep(emptyRefs, container, []));
    expect(result.current).toBeNull();
  });

  it('returns topmost visible step ID', () => {
    const refs = makeRefs(['s1', 's2', 's3']);
    const container = { current: document.createElement('div') } as React.RefObject<HTMLElement>;
    const { result } = renderHook(() => useVisibleStep(refs, container, ['s1', 's2', 's3']));

    // Simulate s2 being the topmost visible
    act(() => {
      observerCallback(
        [
          { target: refs.current!.get('s2')!, isIntersecting: true, intersectionRatio: 0.5 } as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      );
    });

    expect(result.current).toBe('s2');
  });

  it('updates on intersection changes', () => {
    const refs = makeRefs(['s1', 's2']);
    const container = { current: document.createElement('div') } as React.RefObject<HTMLElement>;
    const { result } = renderHook(() => useVisibleStep(refs, container, ['s1', 's2']));

    // First s1 visible
    act(() => {
      observerCallback(
        [{ target: refs.current!.get('s1')!, isIntersecting: true, intersectionRatio: 0.5 } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });
    expect(result.current).toBe('s1');

    // Then s2 becomes visible
    act(() => {
      observerCallback(
        [{ target: refs.current!.get('s2')!, isIntersecting: true, intersectionRatio: 0.5 } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });
    expect(result.current).toBe('s2');
  });

  it('disconnects observer on unmount', () => {
    const refs = makeRefs(['s1']);
    const container = { current: document.createElement('div') } as React.RefObject<HTMLElement>;
    const { unmount } = renderHook(() => useVisibleStep(refs, container, ['s1']));
    unmount();
    expect(observerInstances[0].disconnect).toHaveBeenCalled();
  });
});
