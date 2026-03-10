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
  /** Snapshot of freehand points for preview rendering (updated periodically) */
  freehandPoints: Point[];
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
  freehandPoints: [],
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

  // Accumulate freehand points in a ref to avoid re-renders on every mousemove.
  // Points are flushed to state periodically for preview and on mouseup for commit.
  const freehandPointsRef = useRef<Point[]>([]);
  const freehandFlushTimerRef = useRef<number | null>(null);

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

      freehandPointsRef.current = tool === 'freehand' ? [point] : [];
      setState({
        isDrawing: true,
        startPoint: point,
        currentPoint: point,
        freehandPoints: freehandPointsRef.current,
      });
    },
    [tool, getRelativePosition, onTextInput, isPointInBounds]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent | MouseEvent, container: HTMLElement) => {
      if (!state.isDrawing || !state.startPoint || !tool || tool === 'text') return;

      const rawPoint = getRelativePosition(e as React.MouseEvent, container);
      let point = clampToBounds(rawPoint);

      // Freehand: collect points in ref with distance-based thinning, flush to state periodically
      if (tool === 'freehand') {
        const pts = freehandPointsRef.current;
        const last = pts[pts.length - 1];
        if (last) {
          const dx = point.x - last.x;
          const dy = point.y - last.y;
          if (dx * dx + dy * dy < 0.25) {
            setState((prev) => ({ ...prev, currentPoint: point }));
            return;
          }
        }
        pts.push(point);
        // Flush to state at ~30fps for smooth preview without per-point re-renders
        if (freehandFlushTimerRef.current === null) {
          freehandFlushTimerRef.current = window.requestAnimationFrame(() => {
            freehandFlushTimerRef.current = null;
            setState((prev) => ({
              ...prev,
              currentPoint: point,
              freehandPoints: [...freehandPointsRef.current],
            }));
          });
        }
        return;
      }

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

    // Cancel any pending flush timer
    if (freehandFlushTimerRef.current !== null) {
      cancelAnimationFrame(freehandFlushTimerRef.current);
      freehandFlushTimerRef.current = null;
    }

    // Freehand: compute bounding box from collected points
    if (tool === 'freehand') {
      const freehandPoints = freehandPointsRef.current;
      if (freehandPoints.length < 2) {
        freehandPointsRef.current = [];
        setState(IDLE_STATE);
        return;
      }

      // Compute bounding box
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of freehandPoints) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }

      // Transform points to local space if bounds provided
      let finalPoints: Point[];
      let finalBBoxStart: Point;
      let finalBBoxEnd: Point;

      if (bounds) {
        finalPoints = freehandPoints.map((p) =>
          clampPointToLocalSpace(pointContainerToLocal(p, bounds))
        );
        finalBBoxStart = clampPointToLocalSpace(pointContainerToLocal({ x: minX, y: minY }, bounds));
        finalBBoxEnd = clampPointToLocalSpace(pointContainerToLocal({ x: maxX, y: maxY }, bounds));
      } else {
        finalPoints = freehandPoints;
        finalBBoxStart = { x: minX, y: minY };
        finalBBoxEnd = { x: maxX, y: maxY };
      }

      onShapeCreate({
        type: 'freehand',
        color,
        strokeWidth: 2,
        x1: finalBBoxStart.x,
        y1: finalBBoxStart.y,
        x2: finalBBoxEnd.x,
        y2: finalBBoxEnd.y,
        text: null,
        points: JSON.stringify(finalPoints),
      });

      freehandPointsRef.current = [];
      setState(IDLE_STATE);
      return;
    }

    // For arrows and lines, check distance instead of bounding box
    if (tool === 'arrow' || tool === 'line') {
      const distance = Math.sqrt(width * width + height * height);
      if (distance < MIN_SIZE) {
        setState(IDLE_STATE);
        return;
      }
    } else if (tool === 'circle' || tool === 'rectangle') {
      // For shapes, check both width and height
      if (width < MIN_SIZE || height < MIN_SIZE) {
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

    // Only arrow, line, circle, rectangle are valid draw tools (text handled in mouseDown)
    if (tool !== 'arrow' && tool !== 'line' && tool !== 'circle' && tool !== 'rectangle') {
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
    if (freehandFlushTimerRef.current !== null) {
      cancelAnimationFrame(freehandFlushTimerRef.current);
      freehandFlushTimerRef.current = null;
    }
    freehandPointsRef.current = [];
    setState(IDLE_STATE);
  }, []);

  return {
    isDrawing: state.isDrawing,
    startPoint: state.startPoint,
    currentPoint: state.currentPoint,
    freehandPoints: state.freehandPoints,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    createTextShape,
    cancelDrawing,
  };
}
