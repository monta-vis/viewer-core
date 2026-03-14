import { memo, useCallback } from 'react';
import type { ShapeHandleType, Rectangle } from '../types';
import { ShapeRenderer, type ShapeData } from './ShapeRenderer';
import { useShiftKey } from '../hooks/useShiftKey';
import { localSpaceToContainer } from '../utils';

interface ShapeLayerProps<T extends ShapeData> {
  shapes: T[];
  containerWidth: number;
  containerHeight: number;
  selectedId?: string | null;
  /** Multi-select: set of selected shape IDs (takes precedence over selectedId) */
  selectedIds?: ReadonlySet<string>;
  onSelect?: (id: string) => void;
  /** Called with event for multi-select support (Ctrl+click) */
  onSelectWithEvent?: (id: string, e: React.MouseEvent) => void;
  onDeselect?: () => void;
  onHandleMouseDown?: (shapeId: string, handle: ShapeHandleType, e: React.MouseEvent) => void;
  /** Bounds in container space (0-100%). When provided, shape coords are in local space (0-1) */
  bounds?: Rectangle | null;
  /** When true, disable all pointer events to allow drawing through shapes */
  isDrawModeActive?: boolean;
  /** Called when a selected shape is double-clicked (for text editing) */
  onDoubleClick?: (id: string) => void;
}

/**
 * Transform shape coordinates from local space (0-1) to container space (0-100%)
 */
export function transformShapeToContainerSpace<T extends ShapeData>(
  shape: T,
  bounds: Rectangle
): T {
  const transformed = { ...shape };

  // Transform x1, y1 if present
  if (shape.x1 !== null) {
    transformed.x1 = localSpaceToContainer(shape.x1, bounds.x, bounds.width);
  }
  if (shape.y1 !== null) {
    transformed.y1 = localSpaceToContainer(shape.y1, bounds.y, bounds.height);
  }

  // Transform x2, y2 if present
  if (shape.x2 !== null) {
    transformed.x2 = localSpaceToContainer(shape.x2, bounds.x, bounds.width);
  }
  if (shape.y2 !== null) {
    transformed.y2 = localSpaceToContainer(shape.y2, bounds.y, bounds.height);
  }

  // Transform x, y if present (used by text shapes)
  if (shape.x !== null && shape.x !== undefined) {
    transformed.x = localSpaceToContainer(shape.x, bounds.x, bounds.width);
  }
  if (shape.y !== null && shape.y !== undefined) {
    transformed.y = localSpaceToContainer(shape.y, bounds.y, bounds.height);
  }

  // Freehand points are bbox-relative [0-1] — no per-point transformation needed.
  // The bbox coordinates (x1/y1/x2/y2) are already transformed above,
  // and the relative points scale with them automatically.

  return transformed;
}

/**
 * Memoized wrapper that gives each shape stable callback references,
 * avoiding per-shape closure allocation on every render.
 */
const ShapeItem = memo(function ShapeItem({
  shape,
  containerWidth,
  containerHeight,
  isSelected,
  showEdgeHandles,
  isDrawModeActive,
  textScaleWidth,
  shapePointerEvents,
  onSelect,
  onSelectWithEvent,
  onHandleMouseDown,
  onDoubleClick,
}: {
  shape: ShapeData;
  containerWidth: number;
  containerHeight: number;
  isSelected: boolean;
  showEdgeHandles: boolean;
  isDrawModeActive: boolean;
  textScaleWidth: number | undefined;
  shapePointerEvents: React.CSSProperties['pointerEvents'];
  onSelect?: (id: string) => void;
  onSelectWithEvent?: (id: string, e: React.MouseEvent) => void;
  onHandleMouseDown?: (shapeId: string, handle: ShapeHandleType, e: React.MouseEvent) => void;
  onDoubleClick?: (id: string) => void;
}) {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (onSelectWithEvent) {
        onSelectWithEvent(shape.id, e);
      } else {
        onSelect?.(shape.id);
      }
    },
    [shape.id, onSelect, onSelectWithEvent],
  );

  const handleHandleMouseDown = useCallback(
    (handle: ShapeHandleType, e: React.MouseEvent) => {
      onHandleMouseDown?.(shape.id, handle, e);
    },
    [shape.id, onHandleMouseDown],
  );

  const handleDoubleClick = useCallback(
    () => onDoubleClick?.(shape.id),
    [shape.id, onDoubleClick],
  );

  return (
    <g style={{ pointerEvents: shapePointerEvents }}>
      <ShapeRenderer
        shape={shape}
        containerWidth={containerWidth}
        containerHeight={containerHeight}
        isSelected={isSelected}
        selectionMode={isSelected ? 'primary' : undefined}
        showEdgeHandles={showEdgeHandles}
        onClick={onSelect || onSelectWithEvent ? handleClick : undefined}
        onHandleMouseDown={onHandleMouseDown ? handleHandleMouseDown : undefined}
        isDrawModeActive={isDrawModeActive}
        textScaleWidth={textScaleWidth}
        onDoubleClick={onDoubleClick ? handleDoubleClick : undefined}
      />
    </g>
  );
});

/**
 * ShapeLayer - Unified SVG layer for rendering multiple shapes.
 * Used by both AnnotationLayer and DrawingLayer.
 *
 * When `bounds` is provided, shape coordinates are expected in local space (0-1)
 * and are transformed to container space (0-100%) for rendering.
 */
export function ShapeLayer<T extends ShapeData>({
  shapes,
  containerWidth,
  containerHeight,
  selectedId,
  selectedIds,
  onSelect,
  onSelectWithEvent,
  onDeselect,
  onHandleMouseDown,
  bounds,
  isDrawModeActive = false,
  onDoubleClick,
}: ShapeLayerProps<T>) {
  const isShiftPressed = useShiftKey();

  // Derive effective selection check
  const isShapeSelected = (id: string) => selectedIds ? selectedIds.has(id) : selectedId === id;
  const hasAnySelection = selectedIds ? selectedIds.size > 0 : !!selectedId;

  if (shapes.length === 0) return null;

  // Handle background click to deselect
  const handleBackgroundClick = (e: React.MouseEvent) => {
    // Only deselect if clicking directly on the SVG background (not on a shape)
    if (e.target === e.currentTarget && hasAnySelection) {
      onDeselect?.();
    }
  };

  // Transform shapes to container space if bounds provided
  const transformedShapes = bounds
    ? shapes.map((shape) => transformShapeToContainerSpace(shape, bounds))
    : shapes;

  // Bounds pixel width for text fontSize scaling
  const boundsWidthPx = bounds ? (bounds.width / 100) * containerWidth : undefined;

  // Disable pointer events when draw mode is active or nothing is selected
  const shapePointerEvents = isDrawModeActive ? 'none' : 'auto';
  const svgPointerEvents = isDrawModeActive || !hasAnySelection ? 'none' : 'auto';

  return (
    <svg
      className="absolute inset-0"
      width={containerWidth}
      height={containerHeight}
      style={{ overflow: 'visible', pointerEvents: svgPointerEvents }}
      onClick={handleBackgroundClick}
    >
      {transformedShapes.map((shape) => (
        <ShapeItem
          key={shape.id}
          shape={shape}
          containerWidth={containerWidth}
          containerHeight={containerHeight}
          isSelected={isShapeSelected(shape.id)}
          showEdgeHandles={isShiftPressed}
          isDrawModeActive={isDrawModeActive}
          textScaleWidth={boundsWidthPx}
          shapePointerEvents={shapePointerEvents}
          onSelect={onSelect}
          onSelectWithEvent={onSelectWithEvent}
          onHandleMouseDown={onHandleMouseDown}
          onDoubleClick={onDoubleClick}
        />
      ))}
    </svg>
  );
}
