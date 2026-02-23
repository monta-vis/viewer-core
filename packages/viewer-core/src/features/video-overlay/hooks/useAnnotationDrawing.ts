import { useCallback, useState, useRef } from 'react';
import type { ShapeType, ShapeColor, Point, Rectangle, DrawnShape } from '../types';
import {
  applySquareConstraint,
  pointContainerToLocal,
  clampPointToLocalSpace,
} from '../utils';

// Re-export for backwards compatibility
export type AnnotationType = ShapeType;
export type AnnotationColor = ShapeColor;

type Bounds = Rectangle;

interface DrawingState {
  isDrawing: boolean;
  startPoint: Point | null;
  currentPoint: Point | null;
}

interface UseAnnotationDrawingOptions {
  tool: AnnotationType | null;
  color: AnnotationColor;
  onShapeCreate: (shape: DrawnShape) => void;
  onTextInput?: (position: Point) => void;
  /** Optional bounds to constrain drawing (e.g., ImageArea/Viewport bounds in Video-Local %) */
  bounds?: Bounds | null;
}

const IDLE_STATE: DrawingState = {
  isDrawing: false,
  startPoint: null,
  currentPoint: null,
};

export function useAnnotationDrawing({
  tool,
  color,
  onShapeCreate,
  onTextInput,
  bounds,
}: UseAnnotationDrawingOptions) {
  const [state, setState] = useState<DrawingState>(IDLE_STATE);

  // Store container aspect ratio for true pixel-square calculation
  const containerAspectRef = useRef<number>(1);

  // Check if a point is within bounds
  const isPointInBounds = useCallback(
    (point: Point): boolean => {
      if (!bounds) return true; // No bounds = allow anywhere
      return (
        point.x >= bounds.x &&
        point.x <= bounds.x + bounds.width &&
        point.y >= bounds.y &&
        point.y <= bounds.y + bounds.height
      );
    },
    [bounds]
  );

  // Clamp a point to be within bounds
  const clampToBounds = useCallback(
    (point: Point): Point => {
      if (!bounds) return point;
      return {
        x: Math.max(bounds.x, Math.min(bounds.x + bounds.width, point.x)),
        y: Math.max(bounds.y, Math.min(bounds.y + bounds.height, point.y)),
      };
    },
    [bounds]
  );

  /**
   * Get position relative to container as percentage (0-100%).
   * Since the container IS the video overlay div (positioned exactly over video),
   * no additional transformation is needed.
   */
  const getRelativePosition = useCallback(
    (e: React.MouseEvent, container: HTMLElement): Point => {
      const rect = container.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      };
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, container: HTMLElement) => {
      if (!tool) return;

      // Store container aspect ratio for square constraint calculation
      containerAspectRef.current = container.clientWidth / container.clientHeight;

      const point = getRelativePosition(e, container);

      // Only allow drawing to start within bounds
      if (!isPointInBounds(point)) return;

      // For text tool, open text input immediately
      if (tool === 'text') {
        onTextInput?.(point);
        return;
      }

      setState({
        isDrawing: true,
        startPoint: point,
        currentPoint: point,
      });
    },
    [tool, getRelativePosition, onTextInput, isPointInBounds]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent | MouseEvent, container: HTMLElement) => {
      if (!state.isDrawing || !state.startPoint || !tool || tool === 'text') return;

      const rawPoint = getRelativePosition(e as React.MouseEvent, container);
      let point = clampToBounds(rawPoint);

      // Apply square constraint for circle and rectangle (default = square, Shift = free)
      if (tool === 'circle' || tool === 'rectangle') {
        const aspectRatio = containerAspectRef.current;
        const freeMode = e.shiftKey;

        if (freeMode) {
          // Free mode - just use clamped point as-is
          // Point is already clamped to bounds
        } else {
          // Square mode - maintain 1:1 pixel aspect ratio
          const width = Math.abs(point.x - state.startPoint.x);
          const height = Math.abs(point.y - state.startPoint.y);

          const constrained = applySquareConstraint({
            width,
            height,
            aspectRatio,
            freeMode: false,
          });

          // Calculate direction of drag
          const dirX = point.x >= state.startPoint.x ? 1 : -1;
          const dirY = point.y >= state.startPoint.y ? 1 : -1;

          // Calculate unclamped endpoint
          let endX = state.startPoint.x + constrained.width * dirX;
          let endY = state.startPoint.y + constrained.height * dirY;

          // Calculate bounds limits
          const minX = bounds?.x ?? 0;
          const minY = bounds?.y ?? 0;
          const maxX = bounds ? bounds.x + bounds.width : 100;
          const maxY = bounds ? bounds.y + bounds.height : 100;

          // Check if endpoint exceeds bounds and scale proportionally
          let scaledWidth = constrained.width;
          let scaledHeight = constrained.height;

          // Calculate maximum allowed size based on direction
          const maxWidthAvailable = dirX > 0 ? maxX - state.startPoint.x : state.startPoint.x - minX;
          const maxHeightAvailable = dirY > 0 ? maxY - state.startPoint.y : state.startPoint.y - minY;

          // Find limiting factor while maintaining aspect ratio
          const maxWidthPixel = maxWidthAvailable;
          const maxHeightPixel = maxHeightAvailable / aspectRatio;

          if (scaledWidth > maxWidthAvailable || scaledHeight > maxHeightAvailable) {
            // Need to scale down - use the more restrictive constraint
            if (maxWidthPixel < maxHeightPixel) {
              scaledWidth = maxWidthAvailable;
              scaledHeight = maxWidthAvailable * aspectRatio;
            } else {
              scaledHeight = maxHeightAvailable;
              scaledWidth = maxHeightAvailable / aspectRatio;
            }
          }

          endX = state.startPoint.x + scaledWidth * dirX;
          endY = state.startPoint.y + scaledHeight * dirY;

          point = { x: endX, y: endY };
        }
      }

      setState((prev) => ({
        ...prev,
        currentPoint: point,
      }));
    },
    [state.isDrawing, state.startPoint, tool, getRelativePosition, clampToBounds, bounds]
  );

  const handleMouseUp = useCallback(() => {
    if (!state.isDrawing || !state.startPoint || !state.currentPoint || !tool) {
      return;
    }

    const { startPoint, currentPoint } = state;

    // Minimum size threshold (as percentage of container)
    const MIN_SIZE = 2; // 2%

    // Check minimum size for shapes
    const width = Math.abs(currentPoint.x - startPoint.x);
    const height = Math.abs(currentPoint.y - startPoint.y);

    // For arrows, check distance instead of bounding box
    if (tool === 'arrow') {
      const distance = Math.sqrt(width * width + height * height);
      if (distance < MIN_SIZE) {
        // Too small, cancel
        setState(IDLE_STATE);
        return;
      }
    } else if (tool === 'circle' || tool === 'rectangle') {
      // For shapes, check both width and height
      if (width < MIN_SIZE || height < MIN_SIZE) {
        // Too small, cancel
        setState(IDLE_STATE);
        return;
      }
    }

    // Transform coordinates to local space (0-1) if bounds provided
    // Otherwise keep container space (0-100%)
    let finalStart: Point;
    let finalEnd: Point;

    if (bounds) {
      // Transform to local space and clamp to 0-1
      finalStart = clampPointToLocalSpace(pointContainerToLocal(startPoint, bounds));
      finalEnd = clampPointToLocalSpace(pointContainerToLocal(currentPoint, bounds));
    } else {
      finalStart = startPoint;
      finalEnd = currentPoint;
    }

    // Only arrow, circle, rectangle are valid draw tools (text handled in mouseDown)
    if (tool !== 'arrow' && tool !== 'circle' && tool !== 'rectangle') {
      setState(IDLE_STATE);
      return;
    }

    // All drawable shapes share the same structure (circle stored as bounding box)
    onShapeCreate({
      type: tool,
      color,
      strokeWidth: 2,
      x1: finalStart.x,
      y1: finalStart.y,
      x2: finalEnd.x,
      y2: finalEnd.y,
      text: null,
    });

    setState(IDLE_STATE);
  }, [state, tool, color, onShapeCreate, bounds]);

  const createTextShape = useCallback(
    (position: Point, text: string, fontSize = 5) => {
      if (!text.trim()) return;

      // Transform to local space if bounds provided
      const finalPosition = bounds
        ? clampPointToLocalSpace(pointContainerToLocal(position, bounds))
        : position;

      const textShape: DrawnShape = {
        type: 'text',
        color,
        x1: finalPosition.x,
        y1: finalPosition.y,
        x2: null,
        y2: null,
        text,
        strokeWidth: 2,
        fontSize,
      };

      onShapeCreate(textShape);
    },
    [color, onShapeCreate, bounds]
  );

  const cancelDrawing = useCallback(() => {
    setState(IDLE_STATE);
  }, []);

  return {
    isDrawing: state.isDrawing,
    startPoint: state.startPoint,
    currentPoint: state.currentPoint,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    createTextShape,
    cancelDrawing,
  };
}
