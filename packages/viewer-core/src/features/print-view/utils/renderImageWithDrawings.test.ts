import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderImageWithDrawings } from './renderImageWithDrawings';
import type { DrawingRow } from '@/features/instruction';

const mockDrawing: DrawingRow = {
  id: 'd-1',
  versionId: 'v1',
  videoFrameAreaId: 'img-1',
  substepId: 's1',
  startFrame: null,
  endFrame: null,
  type: 'arrow',
  color: 'red',
  strokeWidth: 2,
  x1: 0.1,
  y1: 0.2,
  x2: 0.3,
  y2: 0.4,
  x: null,
  y: null,
  content: null,
  fontSize: null,
  points: null,
  order: 0,
};

function createMockCtx() {
  return {
    scale: vi.fn(),
    drawImage: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    closePath: vi.fn(),
    strokeRect: vi.fn(),
    fillRect: vi.fn(),
    ellipse: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 100 }),
    roundRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    set strokeStyle(_v: string) { /* noop */ },
    set fillStyle(_v: string) { /* noop */ },
    set lineWidth(_v: number) { /* noop */ },
    set lineCap(_v: string) { /* noop */ },
    set lineJoin(_v: string) { /* noop */ },
    set font(_v: string) { /* noop */ },
    set textBaseline(_v: string) { /* noop */ },
  };
}

// Capture the real createElement BEFORE any tests run (before spies are set up)
const realCreateElement = document.createElement.bind(document);

describe('renderImageWithDrawings', () => {
  let mockCtx: ReturnType<typeof createMockCtx>;
  let createElementSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockCtx = createMockCtx();

    // Mock fetch for mvis-media:// URLs
    const mockFetchBlob = new Blob(['fake-image'], { type: 'image/png' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockFetchBlob),
    }));

    // Stub FileReader
    class MockFileReader {
      result: string | null = null;
      onloadend: ((ev: ProgressEvent) => void) | null = null;
      onerror: ((ev: ProgressEvent) => void) | null = null;
      readAsDataURL() {
        this.result = 'data:image/png;base64,fakebase64';
        setTimeout(() => this.onloadend?.(new ProgressEvent('loadend')), 0);
      }
    }
    vi.stubGlobal('FileReader', MockFileReader);

    // Stub createElement to mock canvas and img — use realCreateElement to avoid recursion
    createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        const canvas = realCreateElement(tag);
        Object.defineProperty(canvas, 'getContext', {
          value: () => mockCtx,
          writable: true,
        });
        Object.defineProperty(canvas, 'toDataURL', {
          value: () => 'data:image/png;base64,canvasOutput123',
          writable: true,
        });
        return canvas;
      }
      const el = realCreateElement(tag);
      if (tag === 'img') {
        // Simulate image load in next microtask
        setTimeout(() => {
          Object.defineProperty(el, 'naturalWidth', { value: 800, configurable: true });
          Object.defineProperty(el, 'naturalHeight', { value: 600, configurable: true });
          if (typeof el.onload === 'function') {
            el.onload(new Event('load'));
          }
        }, 0);
      }
      return el;
    });
  });

  afterEach(() => {
    createElementSpy.mockRestore();
  });

  it('returns canvas data URL when rendering succeeds', async () => {
    const result = await renderImageWithDrawings({
      imageUrl: 'mvis-media://folder/media/frames/vfa-1/image',
      drawings: [mockDrawing],
      width: 800,
    });

    expect(result).toBe('data:image/png;base64,canvasOutput123');
    expect(mockCtx.scale).toHaveBeenCalledWith(2, 2);
    // Black background fill + image draw
    expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 800, 800);
    expect(mockCtx.drawImage).toHaveBeenCalledTimes(1);
  });

  it('draws arrow shape correctly', async () => {
    await renderImageWithDrawings({
      imageUrl: 'mvis-media://folder/media/frames/vfa-1/image',
      drawings: [mockDrawing],
      width: 800,
    });

    // Arrow draws a line then an arrowhead
    expect(mockCtx.beginPath).toHaveBeenCalled();
    expect(mockCtx.moveTo).toHaveBeenCalled();
    expect(mockCtx.lineTo).toHaveBeenCalled();
    expect(mockCtx.stroke).toHaveBeenCalled();
    expect(mockCtx.fill).toHaveBeenCalled();
  });

  it('draws rectangle shape correctly', async () => {
    const rectDrawing: DrawingRow = {
      ...mockDrawing,
      type: 'rectangle',
    };

    await renderImageWithDrawings({
      imageUrl: 'mvis-media://folder/media/frames/vfa-1/image',
      drawings: [rectDrawing],
      width: 800,
    });

    expect(mockCtx.strokeRect).toHaveBeenCalledTimes(1);
  });

  it('draws circle shape correctly', async () => {
    const circleDrawing: DrawingRow = {
      ...mockDrawing,
      type: 'circle',
    };

    await renderImageWithDrawings({
      imageUrl: 'mvis-media://folder/media/frames/vfa-1/image',
      drawings: [circleDrawing],
      width: 800,
    });

    expect(mockCtx.ellipse).toHaveBeenCalledTimes(1);
    expect(mockCtx.stroke).toHaveBeenCalled();
  });

  it('draws text shape with card background', async () => {
    const textDrawing: DrawingRow = {
      ...mockDrawing,
      type: 'text',
      x: 0.5,
      y: 0.5,
      content: 'Hello',
      fontSize: 16,
      x1: null,
      y1: null,
      x2: null,
      y2: null,
    };

    await renderImageWithDrawings({
      imageUrl: 'mvis-media://folder/media/frames/vfa-1/image',
      drawings: [textDrawing],
      width: 800,
    });

    // Should measure text for card sizing
    expect(mockCtx.measureText).toHaveBeenCalledWith('Hello');
    // Should draw rounded rect background card
    expect(mockCtx.beginPath).toHaveBeenCalled();
    expect(mockCtx.roundRect).toHaveBeenCalled();
    expect(mockCtx.fill).toHaveBeenCalled();
    // Should draw the text content
    expect(mockCtx.fillText).toHaveBeenCalledWith('Hello', expect.any(Number), expect.any(Number));
  });

  it('draws freehand shape with bbox-relative points correctly', async () => {
    const freehandDrawing: DrawingRow = {
      ...mockDrawing,
      type: 'freehand',
      // Bbox-relative points [0-1] within bbox (0.1, 0.1) → (0.3, 0.3)
      points: JSON.stringify([{ x: 0, y: 0 }, { x: 0.5, y: 0.5 }, { x: 1, y: 1 }]),
      x1: 0.1,
      y1: 0.1,
      x2: 0.3,
      y2: 0.3,
    };

    await renderImageWithDrawings({
      imageUrl: 'mvis-media://folder/media/frames/vfa-1/image',
      drawings: [freehandDrawing],
      width: 800,
    });

    expect(mockCtx.moveTo).toHaveBeenCalledTimes(1);
    expect(mockCtx.lineTo).toHaveBeenCalledTimes(2);
    expect(mockCtx.stroke).toHaveBeenCalled();
  });

  it('falls back to plain imageUrl on fetch error', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(new Error('Network error'));

    const result = await renderImageWithDrawings({
      imageUrl: 'mvis-media://folder/media/frames/vfa-1/image',
      drawings: [mockDrawing],
      width: 800,
    });

    expect(result).toBe('mvis-media://folder/media/frames/vfa-1/image');
  });

  it('returns plain imageUrl when no drawings', async () => {
    const result = await renderImageWithDrawings({
      imageUrl: 'mvis-media://folder/media/frames/vfa-1/image',
      drawings: [],
      width: 800,
    });

    expect(result).toBe('mvis-media://folder/media/frames/vfa-1/image');
  });
});
