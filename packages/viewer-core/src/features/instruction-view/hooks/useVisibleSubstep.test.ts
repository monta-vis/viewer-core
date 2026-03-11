// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVisibleSubstep } from './useVisibleSubstep';
import type { RefObject } from 'react';

// --- IntersectionObserver mock ---
type IOCallback = (entries: IntersectionObserverEntry[]) => void;
let ioCallback: IOCallback;
let ioDisconnect: ReturnType<typeof vi.fn>;
let observedElements: Element[];

beforeEach(() => {
  observedElements = [];
  ioDisconnect = vi.fn();

  vi.stubGlobal('IntersectionObserver', class {
    constructor(cb: IOCallback) {
      ioCallback = cb;
    }
    observe(el: Element) { observedElements.push(el); }
    unobserve() {}
    disconnect() { ioDisconnect(); }
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeRefs(ids: string[]): RefObject<Map<string, HTMLElement> | null> {
  const map = new Map<string, HTMLElement>();
  for (const id of ids) {
    map.set(id, document.createElement('div'));
  }
  return { current: map };
}

function makeContainer(): RefObject<HTMLElement | null> {
  return { current: document.createElement('div') };
}

function fireIntersection(entries: Array<{ target: Element; isIntersecting: boolean }>) {
  ioCallback(entries.map((e) => ({
    ...e,
    boundingClientRect: {} as DOMRectReadOnly,
    intersectionRatio: e.isIntersecting ? 1 : 0,
    intersectionRect: {} as DOMRectReadOnly,
    rootBounds: null,
    time: 0,
    isVisible: false,
  } as IntersectionObserverEntry)));
}

describe('useVisibleSubstep', () => {
  it('returns null with empty refs', () => {
    const emptyRefs: RefObject<Map<string, HTMLElement> | null> = { current: new Map() };
    const { result } = renderHook(() =>
      useVisibleSubstep(emptyRefs, makeContainer(), []),
    );
    expect(result.current).toBeNull();
  });

  it('returns topmost visible substep ID when intersecting', () => {
    const ids = ['sub1', 'sub2', 'sub3'];
    const refs = makeRefs(ids);
    const container = makeContainer();

    const { result } = renderHook(() =>
      useVisibleSubstep(refs, container, ids),
    );

    // Simulate sub2 becoming visible
    act(() => {
      fireIntersection([{ target: refs.current!.get('sub2')!, isIntersecting: true }]);
    });
    expect(result.current).toBe('sub2');

    // Simulate sub1 also becoming visible — topmost should win
    act(() => {
      fireIntersection([{ target: refs.current!.get('sub1')!, isIntersecting: true }]);
    });
    expect(result.current).toBe('sub1');
  });

  it('updates when intersection changes', () => {
    const ids = ['sub1', 'sub2'];
    const refs = makeRefs(ids);
    const container = makeContainer();

    const { result } = renderHook(() =>
      useVisibleSubstep(refs, container, ids),
    );

    // sub1 visible
    act(() => {
      fireIntersection([{ target: refs.current!.get('sub1')!, isIntersecting: true }]);
    });
    expect(result.current).toBe('sub1');

    // sub1 leaves, sub2 enters
    act(() => {
      fireIntersection([
        { target: refs.current!.get('sub1')!, isIntersecting: false },
        { target: refs.current!.get('sub2')!, isIntersecting: true },
      ]);
    });
    expect(result.current).toBe('sub2');
  });

  it('disconnects observer on unmount', () => {
    const ids = ['sub1'];
    const refs = makeRefs(ids);
    const container = makeContainer();

    const { unmount } = renderHook(() =>
      useVisibleSubstep(refs, container, ids),
    );

    unmount();
    expect(ioDisconnect).toHaveBeenCalled();
  });
});
