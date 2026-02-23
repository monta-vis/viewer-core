import type { AnnotationRow } from '@/features/instruction';
import type { ShapeHandleType, Rectangle } from '../types';
import { useShapeResize, type ShapeCoords } from './useShapeResize';

// Re-export for backwards compatibility
export type AnnotationHandleType = ShapeHandleType;

/**
 * State returned by the annotation resize hook.
 * Maps internal shape state to annotation-specific naming.
 */
export interface AnnotationResizeState {
  isResizing: boolean;
  resizingAnnotationId: string | null;
  activeHandle: ShapeHandleType | null;
  liveCoords: ShapeCoords | null;
}

interface UseAnnotationResizeOptions {
  /** Called when resize/move is complete */
  onResizeComplete?: (annotationId: string, updates: Partial<AnnotationRow>) => void;
  /** Optional bounds to constrain resize/move operations */
  bounds?: Rectangle | null;
}

/**
 * Hook for handling annotation resizing and moving via selection handles.
 * This is a thin wrapper around the unified useShapeResize hook.
 */
export function useAnnotationResize({
  onResizeComplete,
  bounds,
}: UseAnnotationResizeOptions = {}) {
  const {
    isResizing,
    resizingShapeId,
    activeHandle,
    liveCoords,
    containerRef,
    startResize: internalStartResize,
    cancelResize,
  } = useShapeResize<AnnotationRow>({
    onResizeComplete,
    bounds,
  });

  // Wrap startResize to maintain the same API
  const startResize = (
    annotation: AnnotationRow,
    handle: AnnotationHandleType,
    e?: React.MouseEvent
  ) => {
    internalStartResize(annotation, handle, e);
  };

  // Map internal state to annotation-specific naming
  const state: AnnotationResizeState = {
    isResizing,
    resizingAnnotationId: resizingShapeId,
    activeHandle,
    liveCoords,
  };

  return {
    ...state,
    containerRef,
    startResize,
    cancelResize,
  };
}
