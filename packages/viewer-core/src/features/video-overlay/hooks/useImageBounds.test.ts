import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useImageBounds } from './useImageBounds';

// Mock ResizeObserver
let resizeCallback: ResizeObserverCallback;
const mockResizeObserver = vi.fn().mockImplementation((cb: ResizeObserverCallback) => {
  resizeCallback = cb;
  return {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  };
});
vi.stubGlobal('ResizeObserver', mockResizeObserver);

describe('useImageBounds', () => {
  const createMockContainer = (width: number, height: number) => {
    const el = document.createElement('div');
    Object.defineProperty(el, 'clientWidth', { value: width, configurable: true });
    Object.defineProperty(el, 'clientHeight', { value: height, configurable: true });
    return el;
  };

  const createMockImage = (naturalWidth: number, naturalHeight: number) => {
    const img = document.createElement('img');
    Object.defineProperty(img, 'naturalWidth', { value: naturalWidth, configurable: true });
    Object.defineProperty(img, 'naturalHeight', { value: naturalHeight, configurable: true });
    return img;
  };

  it('returns null when container ref is null', () => {
    const containerRef = { current: null };
    const imageRef = { current: createMockImage(1920, 1080) };
    const { result } = renderHook(() => useImageBounds(containerRef, imageRef));
    expect(result.current).toBeNull();
  });

  it('returns null when image ref is null', () => {
    const containerRef = { current: createMockContainer(800, 600) };
    const imageRef = { current: null };
    const { result } = renderHook(() => useImageBounds(containerRef, imageRef));
    expect(result.current).toBeNull();
  });

  it('computes correct bounds for landscape image in landscape container', () => {
    const containerRef = { current: createMockContainer(800, 600) };
    const imageRef = { current: createMockImage(1920, 1080) };

    const { result } = renderHook(() => useImageBounds(containerRef, imageRef));

    // 1920/1080 = 16/9 ≈ 1.778, container 800/600 = 1.333
    // Video is wider → width = 800, height = 800 / (16/9) = 450
    // x = 0, y = (600 - 450) / 2 = 75
    expect(result.current).not.toBeNull();
    expect(result.current!.width).toBe(800);
    expect(result.current!.height).toBe(450);
    expect(result.current!.x).toBe(0);
    expect(result.current!.y).toBe(75);
    expect(result.current!.naturalWidth).toBe(1920);
    expect(result.current!.naturalHeight).toBe(1080);
    expect(result.current!.aspectRatio).toBeCloseTo(16 / 9);
  });

  it('computes correct bounds for portrait image in landscape container', () => {
    const containerRef = { current: createMockContainer(800, 600) };
    const imageRef = { current: createMockImage(1080, 1920) };

    const { result } = renderHook(() => useImageBounds(containerRef, imageRef));

    // 1080/1920 = 0.5625, container 800/600 = 1.333
    // Image is taller → height = 600, width = 600 * 0.5625 = 337.5
    // x = (800 - 337.5) / 2 = 231.25, y = 0
    expect(result.current).not.toBeNull();
    expect(result.current!.height).toBe(600);
    expect(result.current!.width).toBe(337.5);
    expect(result.current!.x).toBe(231.25);
    expect(result.current!.y).toBe(0);
  });

  it('computes correct bounds for square image', () => {
    const containerRef = { current: createMockContainer(800, 600) };
    const imageRef = { current: createMockImage(500, 500) };

    const { result } = renderHook(() => useImageBounds(containerRef, imageRef));

    // 1:1, container 800/600 = 1.333
    // Image is taller (aspect < container) → height = 600, width = 600 * 1 = 600
    // x = (800 - 600) / 2 = 100, y = 0
    expect(result.current).not.toBeNull();
    expect(result.current!.height).toBe(600);
    expect(result.current!.width).toBe(600);
    expect(result.current!.x).toBe(100);
    expect(result.current!.y).toBe(0);
  });

  it('returns null when image has no natural dimensions (not loaded)', () => {
    const containerRef = { current: createMockContainer(800, 600) };
    const imageRef = { current: createMockImage(0, 0) };

    const { result } = renderHook(() => useImageBounds(containerRef, imageRef));
    expect(result.current).toBeNull();
  });

  it('returns correct VideoBounds shape', () => {
    const containerRef = { current: createMockContainer(800, 600) };
    const imageRef = { current: createMockImage(1920, 1080) };

    const { result } = renderHook(() => useImageBounds(containerRef, imageRef));
    expect(result.current).toEqual({
      x: 0,
      y: 75,
      width: 800,
      height: 450,
      naturalWidth: 1920,
      naturalHeight: 1080,
      aspectRatio: 1920 / 1080,
    });
  });
});
