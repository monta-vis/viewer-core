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
}

interface UseDrawingResizeOptions {
  /** Called when resize/move is complete */
  onResizeComplete?: (drawingId: string, updates: Partial<DrawingRow>) => void;
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
  bounds,
}: UseDrawingResizeOptions = {}) {
  const {
    isResizing,
    resizingShapeId,
    activeHandle,
    liveCoords,
    containerRef,
    startResize: internalStartResize,
    cancelResize,
  } = useShapeResize<DrawingRow>({
    onResizeComplete,
    bounds,
  });

  // Wrap startResize to maintain the same API
  const startResize = (
    drawing: DrawingRow,
    handle: DrawingHandleType,
    e?: React.MouseEvent
  ) => {
    internalStartResize(drawing, handle, e);
  };

  // Map internal state to drawing-specific naming
  // Remove radius field as drawings don't use it
  const mappedLiveCoords = liveCoords
    ? {
        x1: liveCoords.x1,
        y1: liveCoords.y1,
        x2: liveCoords.x2,
        y2: liveCoords.y2,
      }
    : null;

  const state: DrawingResizeState = {
    isResizing,
    resizingDrawingId: resizingShapeId,
    activeHandle,
    liveCoords: mappedLiveCoords,
  };

  return {
    ...state,
    containerRef,
    startResize,
    cancelResize,
  };
}
