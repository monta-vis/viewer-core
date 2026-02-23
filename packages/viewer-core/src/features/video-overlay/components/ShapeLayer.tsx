import type { ShapeHandleType, Rectangle } from '../types';
import { ShapeRenderer, type ShapeData } from './ShapeRenderer';
import { useShiftKey } from '../hooks/useShiftKey';
import { localSpaceToContainer } from '../utils';

interface ShapeLayerProps<T extends ShapeData> {
  shapes: T[];
  containerWidth: number;
  containerHeight: number;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
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
function transformShapeToContainerSpace<T extends ShapeData>(
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

  return transformed;
}

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
  onSelect,
  onDeselect,
  onHandleMouseDown,
  bounds,
  isDrawModeActive = false,
  onDoubleClick,
}: ShapeLayerProps<T>) {
  const isShiftPressed = useShiftKey();

  if (shapes.length === 0) return null;

  // Handle background click to deselect
  const handleBackgroundClick = (e: React.MouseEvent) => {
    // Only deselect if clicking directly on the SVG background (not on a shape)
    if (e.target === e.currentTarget && selectedId) {
      onDeselect?.();
    }
  };

  // Transform shapes to container space if bounds provided
  const transformedShapes = bounds
    ? shapes.map((shape) => transformShapeToContainerSpace(shape, bounds))
    : shapes;

  // Bounds pixel width for text fontSize scaling
  const boundsWidthPx = bounds ? (bounds.width / 100) * containerWidth : undefined;

  // Disable pointer events when draw mode is active
  const svgPointerEvents = isDrawModeActive ? 'none' : (selectedId ? 'auto' : 'none');
  const shapePointerEvents = isDrawModeActive ? 'none' : 'auto';

  return (
    <svg
      className="absolute inset-0"
      width={containerWidth}
      height={containerHeight}
      style={{ overflow: 'visible', pointerEvents: svgPointerEvents }}
      onClick={handleBackgroundClick}
    >
      {transformedShapes.map((shape) => (
        <g key={shape.id} style={{ pointerEvents: shapePointerEvents }}>
          <ShapeRenderer
            shape={shape}
            containerWidth={containerWidth}
            containerHeight={containerHeight}
            isSelected={selectedId === shape.id}
            showEdgeHandles={isShiftPressed}
            onClick={onSelect ? () => onSelect(shape.id) : undefined}
            onHandleMouseDown={
              onHandleMouseDown
                ? (handle, e) => onHandleMouseDown(shape.id, handle, e)
                : undefined
            }
            isDrawModeActive={isDrawModeActive}
            textScaleWidth={boundsWidthPx}
            onDoubleClick={onDoubleClick ? () => onDoubleClick(shape.id) : undefined}
          />
        </g>
      ))}
    </svg>
  );
}
