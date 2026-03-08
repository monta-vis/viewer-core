import { useMemo } from 'react';
import type { DrawingRow } from '@/features/instruction';
import type { ShapeHandleType, Rectangle } from '../types';
import { useShapeResize, type ShapeCoords } from './useShapeResize';

// Re-export for backwards compatibility
export type DrawingHandleType = ShapeHandleType;

/**
 * State returned by the drawing resize hook.
 * Maps internal shape state to drawing-specific naming.
 */
export interface DrawingResizeState {
  isResizing: boolean;
  resizingDrawingId: string | null;
  activeHandle: ShapeHandleType | null;
  liveCoords: Omit<ShapeCoords, 'radius'> | null;
  /** Live coordinates for all shapes during group move */
  liveGroupCoords: ReadonlyMap<string, Omit<ShapeCoords, 'radius'>> | null;
}

interface UseDrawingResizeOptions {
  /** Called when resize/move is complete */
  onResizeComplete?: (drawingId: string, updates: Partial<DrawingRow>) => void;
  /** Called when group move is complete */
  onGroupMoveComplete?: (moves: Array<{ id: string; updates: Partial<DrawingRow> }>) => void;
  /** Optional bounds to constrain resize/move operations (e.g., Viewport bounds) */
  bounds?: Rectangle | null;
}

/**
 * Hook for handling drawing resizing and moving via selection handles.
 * This is a thin wrapper around the unified useShapeResize hook.
 * Optionally constrains to bounds (e.g., Viewport for video drawings).
 */
export function useDrawingResize({
  onResizeComplete,
  onGroupMoveComplete,
  bounds,
}: UseDrawingResizeOptions = {}) {
  const {
    isResizing,
    resizingShapeId,
    activeHandle,
    liveCoords,
    liveGroupCoords: shapeGroupCoords,
    containerRef,
    startResize: internalStartResize,
    startGroupMove: internalStartGroupMove,
    startGroupResize: internalStartGroupResize,
    cancelResize,
  } = useShapeResize<DrawingRow>({
    onResizeComplete,
    onGroupMoveComplete,
    bounds,
  });

  // Map internal state to drawing-specific naming
  // Remove radius field as drawings don't use it
  const mappedLiveCoords = useMemo(() => {
    if (!liveCoords) return null;
    return {
      x1: liveCoords.x1,
      y1: liveCoords.y1,
      x2: liveCoords.x2,
      y2: liveCoords.y2,
    };
  }, [liveCoords]);

  // Map group coords (remove radius)
  const mappedGroupCoords = useMemo(() => {
    if (!shapeGroupCoords) return null;
    const mapped = new Map<string, Omit<ShapeCoords, 'radius'>>();
    for (const [id, coords] of shapeGroupCoords) {
      mapped.set(id, { x1: coords.x1, y1: coords.y1, x2: coords.x2, y2: coords.y2 });
    }
    return mapped as ReadonlyMap<string, Omit<ShapeCoords, 'radius'>>;
  }, [shapeGroupCoords]);

  const state: DrawingResizeState = {
    isResizing,
    resizingDrawingId: resizingShapeId,
    activeHandle,
    liveCoords: mappedLiveCoords,
    liveGroupCoords: mappedGroupCoords,
  };

  return {
    ...state,
    containerRef,
    startResize: internalStartResize,
    startGroupMove: internalStartGroupMove,
    startGroupResize: internalStartGroupResize,
    cancelResize,
  };
}
