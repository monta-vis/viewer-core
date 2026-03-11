import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useImageDrawing } from './useImageDrawing';
import type { DrawingRow } from '@monta-vis/viewer-core';

describe('useImageDrawing', () => {
  const defaultProps = {
    videoFrameAreaId: 'img-1',
    versionId: 'v-1',
    drawings: {} as Record<string, DrawingRow>,
    addDrawing: vi.fn(),
    updateDrawing: vi.fn(),
    deleteDrawing: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with null tool and black color', () => {
    const { result } = renderHook(() => useImageDrawing(defaultProps));
    expect(result.current.drawingTool).toBeNull();
    expect(result.current.drawingColor).toBe('black');
    expect(result.current.isDrawingMode).toBe(false);
  });

  it('sets drawing tool', () => {
    const { result } = renderHook(() => useImageDrawing(defaultProps));
    act(() => result.current.handleDrawingToolSelect('arrow'));
    expect(result.current.drawingTool).toBe('arrow');
    expect(result.current.isDrawingMode).toBe(true);
  });

  it('toggles tool off when null is passed (DrawingToolbar sends null on toggle)', () => {
    const { result } = renderHook(() => useImageDrawing(defaultProps));
    act(() => result.current.handleDrawingToolSelect('arrow'));
    act(() => result.current.handleDrawingToolSelect(null));
    expect(result.current.drawingTool).toBeNull();
    expect(result.current.isDrawingMode).toBe(false);
  });

  it('sets drawing color', () => {
    const { result } = renderHook(() => useImageDrawing(defaultProps));
    act(() => result.current.handleDrawingColorSelect('white'));
    expect(result.current.drawingColor).toBe('white');
  });

  it('creates DrawingRow from DrawnShape via handleShapeDrawn', () => {
    const addDrawing = vi.fn();
    const { result } = renderHook(() =>
      useImageDrawing({ ...defaultProps, addDrawing })
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
      });
    });

    expect(addDrawing).toHaveBeenCalledTimes(1);
    const created = addDrawing.mock.calls[0][0] as DrawingRow;
    expect(created.videoFrameAreaId).toBe('img-1');
    expect(created.versionId).toBe('v-1');
    expect(created.type).toBe('arrow');
    expect(created.x1).toBe(0.1);
    expect(created.y1).toBe(0.2);
    expect(created.x2).toBe(0.5);
    expect(created.y2).toBe(0.6);
    expect(created.substepId).toBeNull();
    expect(created.startFrame).toBeNull();
    expect(created.endFrame).toBeNull();
  });

  it('filters annotations by videoFrameAreaId', () => {
    const drawings: Record<string, DrawingRow> = {
      'd1': {
        id: 'd1', versionId: 'v-1', videoFrameAreaId: 'img-1',
        substepId: null, startFrame: null, endFrame: null,
        type: 'arrow', color: 'black', strokeWidth: 2,
        x1: 0, y1: 0, x2: 1, y2: 1,
        x: null, y: null, content: null, fontSize: null, points: null, order: 0,
      },
      'd2': {
        id: 'd2', versionId: 'v-1', videoFrameAreaId: 'img-2', // different image
        substepId: null, startFrame: null, endFrame: null,
        type: 'circle', color: 'white', strokeWidth: 2,
        x1: 0, y1: 0, x2: 1, y2: 1,
        x: null, y: null, content: null, fontSize: null, points: null, order: 1,
      },
    };
    const { result } = renderHook(() =>
      useImageDrawing({ ...defaultProps, drawings })
    );
    expect(result.current.annotations).toHaveLength(1);
    expect(result.current.annotations[0].id).toBe('d1');
  });

  it('deletes drawing', () => {
    const deleteDrawing = vi.fn();
    const { result } = renderHook(() =>
      useImageDrawing({ ...defaultProps, deleteDrawing })
    );
    act(() => result.current.handleDrawingDelete('d1'));
    expect(deleteDrawing).toHaveBeenCalledWith('d1');
  });

  it('selects and deselects drawing', () => {
    const { result } = renderHook(() => useImageDrawing(defaultProps));
    act(() => result.current.handleDrawingSelect('d1'));
    expect(result.current.selectedDrawingId).toBe('d1');
    act(() => result.current.deselectDrawing());
    expect(result.current.selectedDrawingId).toBeNull();
  });

  it('updates color of selected drawing', () => {
    const updateDrawing = vi.fn();
    const drawings: Record<string, DrawingRow> = {
      'd1': {
        id: 'd1', versionId: 'v-1', videoFrameAreaId: 'img-1',
        substepId: null, startFrame: null, endFrame: null,
        type: 'arrow', color: 'black', strokeWidth: 2,
        x1: 0, y1: 0, x2: 1, y2: 1,
        x: null, y: null, content: null, fontSize: null, points: null, order: 0,
      },
    };
    const { result } = renderHook(() =>
      useImageDrawing({ ...defaultProps, drawings, updateDrawing })
    );
    act(() => result.current.handleDrawingSelect('d1'));
    act(() => result.current.handleDrawingColorSelect('white'));
    expect(updateDrawing).toHaveBeenCalledWith('d1', { color: 'white' });
  });

  it('single click selects text drawing without opening text editing', () => {
    const drawings: Record<string, DrawingRow> = {
      't1': {
        id: 't1', versionId: 'v-1', videoFrameAreaId: 'img-1',
        substepId: null, startFrame: null, endFrame: null,
        type: 'text', color: 'black', strokeWidth: 2,
        x1: 0.3, y1: 0.4, x2: null, y2: null,
        x: 0.3, y: 0.4, content: 'Hello', fontSize: 5, points: null, order: 0,
      },
    };
    const { result } = renderHook(() =>
      useImageDrawing({ ...defaultProps, drawings })
    );

    act(() => result.current.handleDrawingSelect('t1'));

    expect(result.current.selectedDrawingId).toBe('t1');
    expect(result.current.textInputState.isOpen).toBe(false);
  });

  it('double-click opens text editing with editingDrawingId', () => {
    const drawings: Record<string, DrawingRow> = {
      't1': {
        id: 't1', versionId: 'v-1', videoFrameAreaId: 'img-1',
        substepId: null, startFrame: null, endFrame: null,
        type: 'text', color: 'black', strokeWidth: 2,
        x1: 0.3, y1: 0.4, x2: null, y2: null,
        x: 0.3, y: 0.4, content: 'Hello', fontSize: 5, points: null, order: 0,
      },
    };
    const { result } = renderHook(() =>
      useImageDrawing({ ...defaultProps, drawings })
    );

    act(() => result.current.handleDrawingDoubleClick('t1'));

    expect(result.current.textInputState.isOpen).toBe(true);
    expect(result.current.textInputState.initialText).toBe('Hello');
    expect(result.current.textInputState.initialFontSize).toBe(5);
    expect(result.current.textInputState.editingDrawingId).toBe('t1');
  });

  it('double-click does nothing for non-text drawings', () => {
    const drawings: Record<string, DrawingRow> = {
      'a1': {
        id: 'a1', versionId: 'v-1', videoFrameAreaId: 'img-1',
        substepId: null, startFrame: null, endFrame: null,
        type: 'arrow', color: 'black', strokeWidth: 2,
        x1: 0, y1: 0, x2: 1, y2: 1,
        x: null, y: null, content: null, fontSize: null, points: null, order: 0,
      },
    };
    const { result } = renderHook(() =>
      useImageDrawing({ ...defaultProps, drawings })
    );

    act(() => result.current.handleDrawingDoubleClick('a1'));

    expect(result.current.textInputState.isOpen).toBe(false);
  });

  it('deselectDrawing closes text popup', () => {
    const drawings: Record<string, DrawingRow> = {
      't1': {
        id: 't1', versionId: 'v-1', videoFrameAreaId: 'img-1',
        substepId: null, startFrame: null, endFrame: null,
        type: 'text', color: 'black', strokeWidth: 2,
        x1: 0.3, y1: 0.4, x2: null, y2: null,
        x: 0.3, y: 0.4, content: 'Hello', fontSize: 5, points: null, order: 0,
      },
    };
    const { result } = renderHook(() =>
      useImageDrawing({ ...defaultProps, drawings })
    );

    // Open text editing via double-click
    act(() => result.current.handleDrawingDoubleClick('t1'));
    expect(result.current.textInputState.isOpen).toBe(true);

    // Deselect should close it
    act(() => result.current.deselectDrawing());
    expect(result.current.textInputState.isOpen).toBe(false);
    expect(result.current.selectedDrawingId).toBeNull();
  });

  it('updates existing text drawing instead of creating duplicate on submit', () => {
    const updateDrawing = vi.fn();
    const addDrawing = vi.fn();
    const drawings: Record<string, DrawingRow> = {
      't1': {
        id: 't1', versionId: 'v-1', videoFrameAreaId: 'img-1',
        substepId: null, startFrame: null, endFrame: null,
        type: 'text', color: 'black', strokeWidth: 2,
        x1: 0.3, y1: 0.4, x2: null, y2: null,
        x: 0.3, y: 0.4, content: 'Hello', fontSize: 5, points: null, order: 0,
      },
    };
    const { result } = renderHook(() =>
      useImageDrawing({ ...defaultProps, drawings, updateDrawing, addDrawing })
    );

    // Double-click text (opens editing with editingDrawingId)
    act(() => result.current.handleDrawingDoubleClick('t1'));

    // Submit edited text
    act(() => result.current.handleTextSubmit('Updated text', 6));

    expect(updateDrawing).toHaveBeenCalledWith('t1', { content: 'Updated text', fontSize: 6 });
    expect(addDrawing).not.toHaveBeenCalled();
    expect(result.current.textInputState.isOpen).toBe(false);
  });

  it('handleTextInput creates text immediately and opens edit popup', () => {
    const addDrawing = vi.fn();
    const { result } = renderHook(() =>
      useImageDrawing({ ...defaultProps, addDrawing })
    );

    // Simulate new text input (from toolbar click on canvas)
    act(() => result.current.handleTextInput({ x: 50, y: 50 }));

    // Text drawing created immediately with empty content
    expect(addDrawing).toHaveBeenCalledTimes(1);
    const created = addDrawing.mock.calls[0][0] as DrawingRow;
    expect(created.content).toBe('');
    expect(created.type).toBe('text');
    expect(created.fontSize).toBe(5);

    // Edit popup opens with editingDrawingId set
    expect(result.current.textInputState.isOpen).toBe(true);
    expect(result.current.textInputState.editingDrawingId).toBe(created.id);
    expect(result.current.selectedDrawingId).toBe(created.id);
  });

  it('returns drawingCards from annotations', () => {
    const drawings: Record<string, DrawingRow> = {
      'd1': {
        id: 'd1', versionId: 'v-1', videoFrameAreaId: 'img-1',
        substepId: null, startFrame: null, endFrame: null,
        type: 'arrow', color: 'black', strokeWidth: 2,
        x1: 0, y1: 0, x2: 1, y2: 1,
        x: null, y: null, content: null, fontSize: null, points: null, order: 0,
      },
    };
    const { result } = renderHook(() =>
      useImageDrawing({ ...defaultProps, drawings })
    );
    expect(result.current.drawingCards).toHaveLength(1);
    expect(result.current.drawingCards[0]).toEqual({ id: 'd1', type: 'image', shapeType: 'arrow', color: 'black' });
  });
});
