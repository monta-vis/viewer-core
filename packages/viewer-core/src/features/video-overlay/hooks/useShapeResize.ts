import { useState, useCallback, useRef, useEffect } from 'react';
import type { ShapeHandleType, Rectangle } from '../types';
import { containerToLocalSpace, localSpaceToContainer } from '../utils';

/**
 * Common shape coordinates interface
 */
export interface ShapeCoords {
  x1: number;
  y1: number;
  x2: number | null;
  y2: number | null;
  radius: number | null;
}

/**
 * Minimum interface for shapes that can be resized
 */
export interface ResizableShape {
  id: string;
  type: string;
  x1: number | null;
  y1: number | null;
  x2: number | null;
  y2: number | null;
  radius?: number | null;
}

export interface ShapeResizeState {
  /** Is currently resizing or moving */
  isResizing: boolean;
  /** ID of shape being resized/moved */
  resizingShapeId: string | null;
  /** Which handle is being dragged */
  activeHandle: ShapeHandleType | null;
  /** Live coordinates during resize/move */
  liveCoords: ShapeCoords | null;
}

interface UseShapeResizeOptions<T extends ResizableShape> {
  /** Called when resize/move is complete */
  onResizeComplete?: (shapeId: string, updates: Partial<T>) => void;
  /** Optional bounds to constrain resize/move operations (default: 0-100) */
  bounds?: Rectangle | null;
}

/**
 * Generic hook for handling shape resizing and moving via selection handles.
 * Supports arrows (start/end + move), circles (8 handles + move), and rectangles (8 handles + move).
 *
 * This is the unified implementation used by both useAnnotationResize and useDrawingResize.
 */
export function useShapeResize<T extends ResizableShape>({
  onResizeComplete,
  bounds,
}: UseShapeResizeOptions<T> = {}) {
  const [state, setState] = useState<ShapeResizeState>({
    isResizing: false,
    resizingShapeId: null,
    activeHandle: null,
    liveCoords: null,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const initialShapeRef = useRef<T | null>(null);
  const liveCoordsRef = useRef<ShapeCoords | null>(null);
  const initialMousePosRef = useRef<{ x: number; y: number } | null>(null);
  // Store container aspect ratio for true pixel-square calculation
  const containerAspectRef = useRef<number>(1);

  const getRelativePosition = useCallback(
    (e: MouseEvent): { x: number; y: number } | null => {
      if (!containerRef.current) return null;

      const rect = containerRef.current.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      };
    },
    []
  );

  const startResize = useCallback(
    (shape: T, handle: ShapeHandleType, e?: React.MouseEvent) => {
      initialShapeRef.current = { ...shape };

      // When bounds is provided, shape coords are in Local-Space (0-1)
      // Transform to Container-Space (0-100%) for resize operations
      let x1 = shape.x1 ?? 0;
      let y1 = shape.y1 ?? 0;
      let x2 = shape.x2;
      let y2 = shape.y2;

      if (bounds) {
        x1 = localSpaceToContainer(x1, bounds.x, bounds.width);
        y1 = localSpaceToContainer(y1, bounds.y, bounds.height);
        if (x2 !== null) x2 = localSpaceToContainer(x2, bounds.x, bounds.width);
        if (y2 !== null) y2 = localSpaceToContainer(y2, bounds.y, bounds.height);
      }

      liveCoordsRef.current = {
        x1,
        y1,
        x2,
        y2,
        radius: shape.radius ?? null,
      };

      // Capture container aspect ratio for true pixel-square calculation
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        containerAspectRef.current = clientWidth / clientHeight;
      }

      // For move operations, store initial mouse position
      if (handle === 'move' && e && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        initialMousePosRef.current = {
          x: ((e.clientX - rect.left) / rect.width) * 100,
          y: ((e.clientY - rect.top) / rect.height) * 100,
        };
      } else {
        initialMousePosRef.current = null;
      }

      setState({
        isResizing: true,
        resizingShapeId: shape.id,
        activeHandle: handle,
        liveCoords: liveCoordsRef.current,
      });
    },
    [bounds]
  );

  // RAF-throttled state update
  const rafIdRef = useRef<number | null>(null);

  const flushUpdate = useCallback(() => {
    if (liveCoordsRef.current) {
      // When bounds is provided, transform Container-Space liveCoords back to Local-Space
      // so the rendering layer can apply its normal transformation
      let coords = { ...liveCoordsRef.current };

      if (bounds) {
        coords = {
          x1: containerToLocalSpace(coords.x1, bounds.x, bounds.width),
          y1: containerToLocalSpace(coords.y1, bounds.y, bounds.height),
          x2: coords.x2 !== null ? containerToLocalSpace(coords.x2, bounds.x, bounds.width) : null,
          y2: coords.y2 !== null ? containerToLocalSpace(coords.y2, bounds.y, bounds.height) : null,
          radius: coords.radius,
        };
      }

      setState((prev) => ({
        ...prev,
        liveCoords: coords,
      }));
    }
    rafIdRef.current = null;
  }, [bounds]);

  const updateResize = useCallback(
    (e: MouseEvent) => {
      if (!state.isResizing || !initialShapeRef.current || !state.activeHandle) return;

      const pos = getRelativePosition(e);
      if (!pos) return;

      const shape = initialShapeRef.current;
      const handle = state.activeHandle;

      // Calculate bounds - use provided bounds or fall back to container (0-100)
      const minBoundX = bounds?.x ?? 0;
      const minBoundY = bounds?.y ?? 0;
      const maxBoundX = bounds ? bounds.x + bounds.width : 100;
      const maxBoundY = bounds ? bounds.y + bounds.height : 100;

      // Clamp position to bounds
      const clampedX = Math.max(minBoundX, Math.min(maxBoundX, pos.x));
      const clampedY = Math.max(minBoundY, Math.min(maxBoundY, pos.y));

      const newCoords = { ...liveCoordsRef.current! };

      // Handle 'move' for all shape types
      if (handle === 'move' && initialMousePosRef.current) {
        const deltaX = clampedX - initialMousePosRef.current.x;
        const deltaY = clampedY - initialMousePosRef.current.y;

        // Get original shape coords and transform to Container-Space if bounds provided
        let origX1 = shape.x1 ?? 0;
        let origY1 = shape.y1 ?? 0;
        let origX2 = shape.x2;
        let origY2 = shape.y2;

        if (bounds) {
          origX1 = localSpaceToContainer(origX1, bounds.x, bounds.width);
          origY1 = localSpaceToContainer(origY1, bounds.y, bounds.height);
          if (origX2 !== null) origX2 = localSpaceToContainer(origX2, bounds.x, bounds.width);
          if (origY2 !== null) origY2 = localSpaceToContainer(origY2, bounds.y, bounds.height);
        }

        newCoords.x1 = origX1 + deltaX;
        newCoords.y1 = origY1 + deltaY;
        if (origX2 !== null) newCoords.x2 = origX2 + deltaX;
        if (origY2 !== null) newCoords.y2 = origY2 + deltaY;

        // Clamp to bounds
        const minX = Math.min(newCoords.x1, newCoords.x2 ?? newCoords.x1);
        const maxX = Math.max(newCoords.x1, newCoords.x2 ?? newCoords.x1);
        const minY = Math.min(newCoords.y1, newCoords.y2 ?? newCoords.y1);
        const maxY = Math.max(newCoords.y1, newCoords.y2 ?? newCoords.y1);

        // If out of bounds, adjust
        if (minX < minBoundX) {
          const adjust = minBoundX - minX;
          newCoords.x1 += adjust;
          if (newCoords.x2 !== null) newCoords.x2 += adjust;
        }
        if (maxX > maxBoundX) {
          const adjust = maxX - maxBoundX;
          newCoords.x1 -= adjust;
          if (newCoords.x2 !== null) newCoords.x2 -= adjust;
        }
        if (minY < minBoundY) {
          const adjust = minBoundY - minY;
          newCoords.y1 += adjust;
          if (newCoords.y2 !== null) newCoords.y2 += adjust;
        }
        if (maxY > maxBoundY) {
          const adjust = maxY - maxBoundY;
          newCoords.y1 -= adjust;
          if (newCoords.y2 !== null) newCoords.y2 -= adjust;
        }
      } else {
        // Handle resize based on shape type
        switch (shape.type) {
          case 'arrow':
            if (handle === 'start') {
              newCoords.x1 = clampedX;
              newCoords.y1 = clampedY;
            } else if (handle === 'end') {
              newCoords.x2 = clampedX;
              newCoords.y2 = clampedY;
            }
            break;

          case 'circle':
          case 'rectangle': {
            // Both circle and rectangle use bounding box with 8 handles
            const isCornerHandle = handle === 'nw' || handle === 'ne' || handle === 'se' || handle === 'sw';
            const shiftKey = e.shiftKey;
            const aspectRatio = containerAspectRef.current;

            // Get original bounds and transform to Container-Space if bounds provided
            // This is needed because handles and calculations work in Container-Space
            let origX1 = shape.x1 ?? 0;
            let origY1 = shape.y1 ?? 0;
            let origX2 = shape.x2 ?? origX1;
            let origY2 = shape.y2 ?? origY1;

            if (bounds) {
              origX1 = localSpaceToContainer(origX1, bounds.x, bounds.width);
              origY1 = localSpaceToContainer(origY1, bounds.y, bounds.height);
              origX2 = localSpaceToContainer(origX2, bounds.x, bounds.width);
              origY2 = localSpaceToContainer(origY2, bounds.y, bounds.height);
            }

            // Visual bounding box (how handles are positioned in ShapeRenderer)
            const visualMinX = Math.min(origX1, origX2);
            const visualMaxX = Math.max(origX1, origX2);
            const visualMinY = Math.min(origY1, origY2);
            const visualMaxY = Math.max(origY1, origY2);

            // Determine which variable (x1 or x2) corresponds to which visual edge
            const x1IsLeft = origX1 <= origX2;
            const y1IsTop = origY1 <= origY2;

            // Update the correct coordinate based on which VISUAL corner the handle represents
            switch (handle) {
              case 'nw': // Visual top-left
                if (x1IsLeft) newCoords.x1 = clampedX; else newCoords.x2 = clampedX;
                if (y1IsTop) newCoords.y1 = clampedY; else newCoords.y2 = clampedY;
                break;
              case 'ne': // Visual top-right
                if (x1IsLeft) newCoords.x2 = clampedX; else newCoords.x1 = clampedX;
                if (y1IsTop) newCoords.y1 = clampedY; else newCoords.y2 = clampedY;
                break;
              case 'se': // Visual bottom-right
                if (x1IsLeft) newCoords.x2 = clampedX; else newCoords.x1 = clampedX;
                if (y1IsTop) newCoords.y2 = clampedY; else newCoords.y1 = clampedY;
                break;
              case 'sw': // Visual bottom-left
                if (x1IsLeft) newCoords.x1 = clampedX; else newCoords.x2 = clampedX;
                if (y1IsTop) newCoords.y2 = clampedY; else newCoords.y1 = clampedY;
                break;
              case 'n': // Visual top edge
                if (y1IsTop) newCoords.y1 = clampedY; else newCoords.y2 = clampedY;
                break;
              case 's': // Visual bottom edge
                if (y1IsTop) newCoords.y2 = clampedY; else newCoords.y1 = clampedY;
                break;
              case 'w': // Visual left edge
                if (x1IsLeft) newCoords.x1 = clampedX; else newCoords.x2 = clampedX;
                break;
              case 'e': // Visual right edge
                if (x1IsLeft) newCoords.x2 = clampedX; else newCoords.x1 = clampedX;
                break;
            }

            // Default = TRUE PIXEL SQUARE (account for container aspect ratio)
            // Shift key = free resizing (any aspect ratio)
            if (!shiftKey && isCornerHandle) {
              const x1 = newCoords.x1 ?? 0;
              const y1 = newCoords.y1 ?? 0;
              const x2 = newCoords.x2 ?? x1;
              const y2 = newCoords.y2 ?? y1;

              const width = Math.abs(x2 - x1);
              const height = Math.abs(y2 - y1);

              const widthInPixelUnits = width;
              const heightInPixelUnits = height / aspectRatio;

              let squareSize: number;
              if (widthInPixelUnits >= heightInPixelUnits) {
                squareSize = width;
              } else {
                squareSize = height / aspectRatio;
              }

              const newWidth = squareSize;
              const newHeight = squareSize * aspectRatio;

              // Apply square constraint - anchor the OPPOSITE corner
              if (handle === 'se') {
                // Anchor top-left (visualMinX, visualMinY)
                const newMaxX = Math.min(visualMinX + newWidth, maxBoundX);
                const newMaxY = Math.min(visualMinY + newHeight, maxBoundY);
                const clampedWidth = newMaxX - visualMinX;
                const clampedHeight = newMaxY - visualMinY;
                const clampedSize = Math.min(clampedWidth, clampedHeight / aspectRatio);
                if (x1IsLeft) newCoords.x2 = visualMinX + clampedSize; else newCoords.x1 = visualMinX + clampedSize;
                if (y1IsTop) newCoords.y2 = visualMinY + clampedSize * aspectRatio; else newCoords.y1 = visualMinY + clampedSize * aspectRatio;
              } else if (handle === 'sw') {
                // Anchor top-right (visualMaxX, visualMinY)
                const newMinX = Math.max(visualMaxX - newWidth, minBoundX);
                const newMaxY = Math.min(visualMinY + newHeight, maxBoundY);
                const clampedWidth = visualMaxX - newMinX;
                const clampedHeight = newMaxY - visualMinY;
                const clampedSize = Math.min(clampedWidth, clampedHeight / aspectRatio);
                if (x1IsLeft) newCoords.x1 = visualMaxX - clampedSize; else newCoords.x2 = visualMaxX - clampedSize;
                if (y1IsTop) newCoords.y2 = visualMinY + clampedSize * aspectRatio; else newCoords.y1 = visualMinY + clampedSize * aspectRatio;
              } else if (handle === 'ne') {
                // Anchor bottom-left (visualMinX, visualMaxY)
                const newMaxX = Math.min(visualMinX + newWidth, maxBoundX);
                const newMinY = Math.max(visualMaxY - newHeight, minBoundY);
                const clampedWidth = newMaxX - visualMinX;
                const clampedHeight = visualMaxY - newMinY;
                const clampedSize = Math.min(clampedWidth, clampedHeight / aspectRatio);
                if (x1IsLeft) newCoords.x2 = visualMinX + clampedSize; else newCoords.x1 = visualMinX + clampedSize;
                if (y1IsTop) newCoords.y1 = visualMaxY - clampedSize * aspectRatio; else newCoords.y2 = visualMaxY - clampedSize * aspectRatio;
              } else if (handle === 'nw') {
                // Anchor bottom-right (visualMaxX, visualMaxY)
                const newMinX = Math.max(visualMaxX - newWidth, minBoundX);
                const newMinY = Math.max(visualMaxY - newHeight, minBoundY);
                const clampedWidth = visualMaxX - newMinX;
                const clampedHeight = visualMaxY - newMinY;
                const clampedSize = Math.min(clampedWidth, clampedHeight / aspectRatio);
                if (x1IsLeft) newCoords.x1 = visualMaxX - clampedSize; else newCoords.x2 = visualMaxX - clampedSize;
                if (y1IsTop) newCoords.y1 = visualMaxY - clampedSize * aspectRatio; else newCoords.y2 = visualMaxY - clampedSize * aspectRatio;
              }
            }
            break;
          }
        }
      }

      liveCoordsRef.current = newCoords;

      // Throttle React state updates with RAF
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(flushUpdate);
      }
    },
    [state.isResizing, state.activeHandle, getRelativePosition, flushUpdate, bounds]
  );

  const finishResize = useCallback(() => {
    // Cancel any pending RAF
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    if (state.isResizing && state.resizingShapeId && liveCoordsRef.current) {
      const coords = liveCoordsRef.current;

      // When bounds is provided, transform Container-Space (0-100%) back to Local-Space (0-1)
      let x1 = coords.x1;
      let y1 = coords.y1;
      let x2 = coords.x2;
      let y2 = coords.y2;

      if (bounds) {
        x1 = containerToLocalSpace(x1, bounds.x, bounds.width);
        y1 = containerToLocalSpace(y1, bounds.y, bounds.height);
        if (x2 !== null) x2 = containerToLocalSpace(x2, bounds.x, bounds.width);
        if (y2 !== null) y2 = containerToLocalSpace(y2, bounds.y, bounds.height);

        // Clamp to Local-Space bounds (0-1)
        x1 = Math.max(0, Math.min(1, x1));
        y1 = Math.max(0, Math.min(1, y1));
        if (x2 !== null) x2 = Math.max(0, Math.min(1, x2));
        if (y2 !== null) y2 = Math.max(0, Math.min(1, y2));
      }

      const updates: Partial<T> = {
        x1,
        y1,
        x2,
        y2,
      } as Partial<T>;

      // Include radius if it was present
      if (coords.radius !== undefined) {
        (updates as Record<string, unknown>).radius = coords.radius;
      }

      onResizeComplete?.(state.resizingShapeId, updates);
    }

    setState({
      isResizing: false,
      resizingShapeId: null,
      activeHandle: null,
      liveCoords: null,
    });
    initialShapeRef.current = null;
    liveCoordsRef.current = null;
  }, [state.isResizing, state.resizingShapeId, onResizeComplete, bounds]);

  const cancelResize = useCallback(() => {
    // Cancel any pending RAF
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    setState({
      isResizing: false,
      resizingShapeId: null,
      activeHandle: null,
      liveCoords: null,
    });
    initialShapeRef.current = null;
    liveCoordsRef.current = null;
  }, []);

  // Global mouse event listeners during resize
  useEffect(() => {
    if (!state.isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      updateResize(e);
    };

    const handleMouseUp = () => {
      finishResize();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelResize();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [state.isResizing, updateResize, finishResize, cancelResize]);

  const setContainerRef = useCallback((element: HTMLDivElement | null) => {
    containerRef.current = element;
  }, []);

  return {
    ...state,
    containerRef: setContainerRef,
    startResize,
    cancelResize,
  };
}
