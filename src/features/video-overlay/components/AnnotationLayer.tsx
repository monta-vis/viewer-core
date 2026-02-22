import type { AnnotationRow } from '@/features/instruction';
import type { ShapeHandleType, Rectangle } from '../types';
import { ShapeLayer } from './ShapeLayer';

// Re-export for backwards compatibility
export type { AnnotationHandleType } from './AnnotationRenderer';

interface AnnotationLayerProps {
  annotations: AnnotationRow[];
  containerWidth: number;
  containerHeight: number;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onDeselect?: () => void;
  onDelete?: (id: string) => void;
  onHandleMouseDown?: (annotationId: string, handle: ShapeHandleType, e: React.MouseEvent) => void;
  /** Bounds in container space (0-100%). When provided, annotation coords are in local space (0-1) */
  bounds?: Rectangle | null;
  /** When true, disable all pointer events to allow drawing through annotations */
  isDrawModeActive?: boolean;
  /** Called when a selected annotation is double-clicked (for text editing) */
  onDoubleClick?: (id: string) => void;
}

/**
 * AnnotationLayer - Renders multiple annotations on an SVG layer.
 * This is a thin wrapper around the unified ShapeLayer.
 * Supports DEL key to delete selected annotation.
 *
 * When `bounds` is provided, annotation coordinates are expected in local space (0-1)
 * and are transformed to container space (0-100%) for rendering.
 */
export function AnnotationLayer({
  annotations,
  containerWidth,
  containerHeight,
  selectedId,
  onSelect,
  onDeselect,
  onDelete: _onDelete,
  onHandleMouseDown,
  bounds,
  isDrawModeActive,
  onDoubleClick,
}: AnnotationLayerProps) {
  return (
    <ShapeLayer
      shapes={annotations}
      containerWidth={containerWidth}
      containerHeight={containerHeight}
      selectedId={selectedId}
      onSelect={onSelect}
      onDeselect={onDeselect}
      onHandleMouseDown={onHandleMouseDown}
      bounds={bounds}
      isDrawModeActive={isDrawModeActive}
      onDoubleClick={onDoubleClick}
    />
  );
}
