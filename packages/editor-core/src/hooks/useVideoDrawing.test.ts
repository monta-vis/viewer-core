import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVideoDrawing } from './useVideoDrawing';
import type { DrawingRow } from '@monta-vis/viewer-core';

function makeDrawing(overrides: Partial<DrawingRow> = {}): DrawingRow {
  return {
    id: 'draw-1',
    versionId: 'v1',
    substepImageId: null,
    substepId: 'sub-1',
    startFrame: 20,
    endFrame: 80,
    type: 'arrow',
    color: 'black',
    strokeWidth: 2,
    x1: 0.1,
    y1: 0.2,
    x2: 0.5,
    y2: 0.6,
    x: null,
    y: null,
    content: null,
    fontSize: null,
    points: null,
    order: 0,
    ...overrides,
  };
}

describe('useVideoDrawing', () => {
  const defaultProps = {
    substepId: 'sub-1',
    versionId: 'v1',
    drawings: {} as Record<string, DrawingRow>,
    addDrawing: vi.fn(),
    updateDrawing: vi.fn(),
    deleteDrawing: vi.fn(),
    currentPercent: 50,
  };

  it('filters drawings by substepId, ignoring image drawings', () => {
    const videoDrawing = makeDrawing({ id: 'd1', substepId: 'sub-1', substepImageId: null });
    const imageDrawing = makeDrawing({ id: 'd2', substepId: null, substepImageId: 'img-1', startFrame: null, endFrame: null });
    const otherSubstep = makeDrawing({ id: 'd3', substepId: 'sub-2', substepImageId: null });

    const { result } = renderHook(() =>
      useVideoDrawing({
        ...defaultProps,
        drawings: { d1: videoDrawing, d2: imageDrawing, d3: otherSubstep },
      }),
    );

    expect(result.current.drawingCards).toHaveLength(1);
    expect(result.current.drawingCards[0].id).toBe('d1');
    expect(result.current.drawingCards[0].type).toBe('video');
  });

  it('creates drawing with correct defaults (startFrame capped at 99, endFrame=100)', () => {
    const addDrawing = vi.fn();
    const { result } = renderHook(() =>
      useVideoDrawing({ ...defaultProps, addDrawing, currentPercent: 99.5 }),
    );

    act(() => {
      result.current.handleShapeDrawn({
        type: 'arrow',
        color: 'black',
        strokeWidth: 2,
        x1: 0.1,
        y1: 0.2,
        x2: 0.5,
        y2: 0.6,
        text: null,
        fontSize: null,
      });
    });

    expect(addDrawing).toHaveBeenCalledTimes(1);
    const created = addDrawing.mock.calls[0][0] as DrawingRow;
    expect(created.startFrame).toBe(99);
    expect(created.endFrame).toBe(100);
    expect(created.substepId).toBe('sub-1');
    expect(created.substepImageId).toBeNull();
  });

  it('manages tool/color/selection state', () => {
    const { result } = renderHook(() => useVideoDrawing(defaultProps));

    // Initial state
    expect(result.current.drawingTool).toBeNull();
    expect(result.current.drawingColor).toBe('black');
    expect(result.current.selectedDrawingId).toBeNull();

    // Select tool
    act(() => result.current.handleDrawingToolSelect('circle'));
    expect(result.current.drawingTool).toBe('circle');

    // Select color
    act(() => result.current.handleDrawingColorSelect('red'));
    expect(result.current.drawingColor).toBe('red');
  });

  it('updates font size for text drawings', () => {
    const updateDrawing = vi.fn();
    const textDrawing = makeDrawing({ id: 'd1', type: 'text', fontSize: 5, substepId: 'sub-1' });

    const { result } = renderHook(() =>
      useVideoDrawing({
        ...defaultProps,
        drawings: { d1: textDrawing },
        updateDrawing,
      }),
    );

    // Select the drawing first
    act(() => result.current.handleDrawingSelect('d1'));

    // Update font size
    act(() => result.current.handleDrawingFontSizeSelect(8));
    expect(updateDrawing).toHaveBeenCalledWith('d1', { fontSize: 8 });
  });

  it('filters visibleDrawings by currentPercent', () => {
    const d1 = makeDrawing({ id: 'd1', substepId: 'sub-1', startFrame: 0, endFrame: 50 });
    const d2 = makeDrawing({ id: 'd2', substepId: 'sub-1', startFrame: 40, endFrame: 90 });
    const d3 = makeDrawing({ id: 'd3', substepId: 'sub-1', startFrame: 60, endFrame: 100 });

    const { result } = renderHook(() =>
      useVideoDrawing({
        ...defaultProps,
        drawings: { d1, d2, d3 },
        currentPercent: 45, // inside d1 and d2, but not d3
      }),
    );

    expect(result.current.visibleDrawings).toHaveLength(2);
    expect(result.current.visibleDrawings.map((d) => d.id)).toEqual(['d1', 'd2']);
  });

  it('delete clears selection when deleting selected drawing', () => {
    const deleteDrawing = vi.fn();
    const d1 = makeDrawing({ id: 'd1', substepId: 'sub-1' });

    const { result } = renderHook(() =>
      useVideoDrawing({
        ...defaultProps,
        drawings: { d1 },
        deleteDrawing,
      }),
    );

    // Select then delete
    act(() => result.current.handleDrawingSelect('d1'));
    expect(result.current.selectedDrawingId).toBe('d1');

    act(() => result.current.handleDrawingDelete('d1'));
    expect(deleteDrawing).toHaveBeenCalledWith('d1');
    expect(result.current.selectedDrawingId).toBeNull();
  });

  it('handles frame update', () => {
    const updateDrawing = vi.fn();
    const { result } = renderHook(() =>
      useVideoDrawing({ ...defaultProps, updateDrawing }),
    );

    act(() => result.current.handleDrawingFrameUpdate('d1', 10, 90));
    expect(updateDrawing).toHaveBeenCalledWith('d1', { startFrame: 10, endFrame: 90 });
  });

  it('returns empty arrays when substepId is null', () => {
    const { result } = renderHook(() =>
      useVideoDrawing({ ...defaultProps, substepId: null }),
    );
    expect(result.current.drawingCards).toHaveLength(0);
    expect(result.current.visibleDrawings).toHaveLength(0);
  });

  it('tool select deselects drawing', () => {
    const d1 = makeDrawing({ id: 'd1', substepId: 'sub-1' });
    const { result } = renderHook(() =>
      useVideoDrawing({ ...defaultProps, drawings: { d1 } }),
    );

    act(() => result.current.handleDrawingSelect('d1'));
    expect(result.current.selectedDrawingId).toBe('d1');

    act(() => result.current.handleDrawingToolSelect('circle'));
    expect(result.current.selectedDrawingId).toBeNull();
    expect(result.current.drawingTool).toBe('circle');
  });

  it('color select also updates selected drawing', () => {
    const updateDrawing = vi.fn();
    const d1 = makeDrawing({ id: 'd1', substepId: 'sub-1' });
    const { result } = renderHook(() =>
      useVideoDrawing({ ...defaultProps, drawings: { d1 }, updateDrawing }),
    );

    act(() => result.current.handleDrawingSelect('d1'));
    act(() => result.current.handleDrawingColorSelect('red'));

    expect(updateDrawing).toHaveBeenCalledWith('d1', { color: 'red' });
  });
});
