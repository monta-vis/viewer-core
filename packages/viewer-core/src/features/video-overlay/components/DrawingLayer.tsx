import type { DrawingRow } from '@/features/instruction';
import type { ShapeHandleType, Rectangle } from '../types';
import { ShapeLayer } from './ShapeLayer';

// Re-export for backwards compatibility
export type { DrawingHandleType } from './DrawingRenderer';

interface DrawingLayerProps {
  drawings: DrawingRow[];
  containerWidth: number;
  containerHeight: number;
  selectedId?: string | null;
  /** Multi-select: set of selected drawing IDs */
  selectedIds?: ReadonlySet<string>;
  onSelect?: (id: string) => void;
  /** Called with event for multi-select support (Ctrl+click) */
  onSelectWithEvent?: (id: string, e: React.MouseEvent) => void;
  onDeselect?: () => void;
  onDelete?: (id: string) => void;
  onHandleMouseDown?: (drawingId: string, handle: ShapeHandleType, e: React.MouseEvent) => void;
  /** Bounds in container space (0-100%). When provided, drawing coords are in local space (0-1) */
  bounds?: Rectangle | null;
  /** When true, disable all pointer events to allow drawing through drawings */
  isDrawModeActive?: boolean;
  /** Called when a selected drawing is double-clicked (for text editing) */
  onDoubleClick?: (id: string) => void;
}

/**
 * DrawingLayer - Renders video drawings (time-based) on an SVG layer.
 * This is a thin wrapper around the unified ShapeLayer.
 * Supports DEL key to delete selected drawing.
 *
 * When `bounds` is provided, drawing coordinates are expected in local space (0-1)
 * and are transformed to container space (0-100%) for rendering.
 */
export function DrawingLayer({
  drawings,
  containerWidth,
  containerHeight,
  selectedId,
  selectedIds,
  onSelect,
  onSelectWithEvent,
  onDeselect,
  onHandleMouseDown,
  bounds,
  isDrawModeActive,
  onDoubleClick,
}: DrawingLayerProps) {
  return (
    <ShapeLayer
      shapes={drawings}
      containerWidth={containerWidth}
      containerHeight={containerHeight}
      selectedId={selectedId}
      selectedIds={selectedIds}
      onSelect={onSelect}
      onSelectWithEvent={onSelectWithEvent}
      onDeselect={onDeselect}
      onHandleMouseDown={onHandleMouseDown}
      bounds={bounds}
      isDrawModeActive={isDrawModeActive}
      onDoubleClick={onDoubleClick}
    />
  );
}
