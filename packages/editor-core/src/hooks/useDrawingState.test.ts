import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDrawingState } from './useDrawingState';

describe('useDrawingState', () => {
  const defaultProps = {
    drawings: {
      d1: { color: 'black', type: 'arrow' },
      d2: { color: 'red', type: 'circle' },
      d3: { color: 'teal', type: 'text', fontSize: 8 },
      d4: { color: 'white', type: 'rectangle' },
    },
    updateDrawing: vi.fn(),
    deleteDrawing: vi.fn(),
  };

  it('handleDrawingSelect sets single selection and selectedDrawingIds', () => {
    const { result } = renderHook(() => useDrawingState(defaultProps));

    act(() => result.current.handleDrawingSelect('d1'));

    expect(result.current.selectedDrawingId).toBe('d1');
    expect(result.current.selectedDrawingIds.has('d1')).toBe(true);
    expect(result.current.selectedDrawingIds.size).toBe(1);
  });

  it('handleDrawingMultiSelect with null modifier sets single selection', () => {
    const { result } = renderHook(() => useDrawingState(defaultProps));

    act(() => result.current.handleDrawingMultiSelect('d1', null));

    expect(result.current.selectedDrawingIds).toEqual(new Set(['d1']));
    expect(result.current.selectedDrawingId).toBe('d1');
  });

  it('handleDrawingMultiSelect with ctrl toggles into set', () => {
    const { result } = renderHook(() => useDrawingState(defaultProps));

    act(() => result.current.handleDrawingMultiSelect('d1', null));
    act(() => result.current.handleDrawingMultiSelect('d2', 'ctrl'));

    expect(result.current.selectedDrawingIds).toEqual(new Set(['d1', 'd2']));
    expect(result.current.selectedDrawingId).toBe('d2');
  });

  it('ctrl+click on already-selected removes it from set', () => {
    const { result } = renderHook(() => useDrawingState(defaultProps));

    act(() => result.current.handleDrawingMultiSelect('d1', null));
    act(() => result.current.handleDrawingMultiSelect('d2', 'ctrl'));
    act(() => result.current.handleDrawingMultiSelect('d2', 'ctrl'));

    expect(result.current.selectedDrawingIds).toEqual(new Set(['d1']));
    expect(result.current.selectedDrawingId).toBe('d1');
  });

  it('shift+click selects range using orderedIds', () => {
    const { result } = renderHook(() => useDrawingState(defaultProps));
    const orderedIds = ['d1', 'd2', 'd3', 'd4'];

    act(() => result.current.handleDrawingMultiSelect('d1', null, orderedIds));
    act(() => result.current.handleDrawingMultiSelect('d3', 'shift', orderedIds));

    expect(result.current.selectedDrawingIds).toEqual(new Set(['d1', 'd2', 'd3']));
  });

  it('shift+click with no primary behaves as single click', () => {
    const { result } = renderHook(() => useDrawingState(defaultProps));
    const orderedIds = ['d1', 'd2', 'd3', 'd4'];

    act(() => result.current.handleDrawingMultiSelect('d3', 'shift', orderedIds));

    expect(result.current.selectedDrawingIds).toEqual(new Set(['d3']));
    expect(result.current.selectedDrawingId).toBe('d3');
  });

  it('handleDrawingColorSelect with multiple selected updates all', () => {
    const updateDrawing = vi.fn();
    const { result } = renderHook(() =>
      useDrawingState({ ...defaultProps, updateDrawing }),
    );

    act(() => result.current.handleDrawingMultiSelect('d1', null));
    act(() => result.current.handleDrawingMultiSelect('d2', 'ctrl'));
    act(() => result.current.handleDrawingColorSelect('red'));

    expect(updateDrawing).toHaveBeenCalledWith('d1', { color: 'red' });
    expect(updateDrawing).toHaveBeenCalledWith('d2', { color: 'red' });
  });

  it('handleDrawingFontSizeSelect with mixed selection only updates text drawings', () => {
    const updateDrawing = vi.fn();
    const { result } = renderHook(() =>
      useDrawingState({ ...defaultProps, updateDrawing }),
    );

    // d2 = circle, d3 = text
    act(() => result.current.handleDrawingMultiSelect('d2', null));
    act(() => result.current.handleDrawingMultiSelect('d3', 'ctrl'));
    act(() => result.current.handleDrawingFontSizeSelect(8));

    expect(updateDrawing).toHaveBeenCalledTimes(1);
    expect(updateDrawing).toHaveBeenCalledWith('d3', { fontSize: 8 });
  });

  it('handleDrawingToolSelect clears all selection', () => {
    const { result } = renderHook(() => useDrawingState(defaultProps));

    act(() => result.current.handleDrawingMultiSelect('d1', null));
    act(() => result.current.handleDrawingMultiSelect('d2', 'ctrl'));
    act(() => result.current.handleDrawingToolSelect('arrow'));

    expect(result.current.selectedDrawingIds.size).toBe(0);
    expect(result.current.selectedDrawingId).toBeNull();
  });

  it('deselectAll clears everything', () => {
    const { result } = renderHook(() => useDrawingState(defaultProps));

    act(() => result.current.handleDrawingMultiSelect('d1', null));
    act(() => result.current.handleDrawingMultiSelect('d2', 'ctrl'));
    act(() => result.current.deselectAll());

    expect(result.current.selectedDrawingIds.size).toBe(0);
    expect(result.current.selectedDrawingId).toBeNull();
  });

  it('handleDrawingDelete with multi-select deletes all selected', () => {
    const deleteDrawing = vi.fn();
    const { result } = renderHook(() =>
      useDrawingState({ ...defaultProps, deleteDrawing }),
    );

    act(() => result.current.handleDrawingMultiSelect('d1', null));
    act(() => result.current.handleDrawingMultiSelect('d2', 'ctrl'));
    act(() => result.current.handleDrawingDelete('d1'));

    expect(deleteDrawing).toHaveBeenCalledWith('d1');
    expect(deleteDrawing).toHaveBeenCalledWith('d2');
    expect(result.current.selectedDrawingIds.size).toBe(0);
    expect(result.current.selectedDrawingId).toBeNull();
  });

  it('handleDrawingDelete with single selection deletes only that one', () => {
    const deleteDrawing = vi.fn();
    const { result } = renderHook(() =>
      useDrawingState({ ...defaultProps, deleteDrawing }),
    );

    act(() => result.current.handleDrawingSelect('d1'));
    act(() => result.current.handleDrawingDelete('d1'));

    expect(deleteDrawing).toHaveBeenCalledTimes(1);
    expect(deleteDrawing).toHaveBeenCalledWith('d1');
  });
});
