import { useState, useCallback, useRef } from 'react';
import type { Rectangle, Point, VideoBoundsOverride } from '../types';

export interface AreaSelectionState {
  /** Is currently drawing */
  isDrawing: boolean;
  /** Start point of current draw */
  startPoint: Point | null;
  /** Current rectangle being drawn */
  currentRect: Rectangle | null;
}

export interface UseAreaSelectionOptions {
  /** Called when drawing completes */
  onComplete?: (rect: Rectangle) => void;
  /** Called when drawing is cancelled */
  onCancel?: () => void;
  /** Minimum size for valid selection */
  minSize?: number;
  /** If provided, coordinates are relative to these bounds instead of container */
  videoBounds?: VideoBoundsOverride | null;
}

/**
 * Hook for handling rectangle area selection on a canvas.
 * Supports Shift+drag for true pixel-square (accounting for container aspect ratio).
 * When videoBounds is provided, coordinates are relative to video instead of container.
 */
export function useAreaSelection({
  onComplete,
  onCancel,
  minSize = 10,
  videoBounds,
}: UseAreaSelectionOptions = {}) {
  const [state, setState] = useState<AreaSelectionState>({
    isDrawing: false,
    startPoint: null,
    currentRect: null,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  // Store container aspect ratio for true pixel-square calculation
  const containerAspectRef = useRef<number>(1);
  // Store bounds to use for current drawing operation
  const drawingBoundsRef = useRef<VideoBoundsOverride | null>(null);

  const getRelativePosition = useCallback(
    (e: React.MouseEvent | MouseEvent): Point | null => {
      if (!containerRef.current) return null;

      const containerRect = containerRef.current.getBoundingClientRect();
      const bounds = drawingBoundsRef.current;

      if (bounds) {
        // Use video-relative bounds
        const boundsLeft = containerRect.left + bounds.x;
        const boundsTop = containerRect.top + bounds.y;
        // Clamp to 0-100% range (within video bounds)
        return {
          x: Math.max(0, Math.min(100, ((e.clientX - boundsLeft) / bounds.width) * 100)),
          y: Math.max(0, Math.min(100, ((e.clientY - boundsTop) / bounds.height) * 100)),
        };
      }

      // Default: relative to container
      return {
        x: ((e.clientX - containerRect.left) / containerRect.width) * 100,
        y: ((e.clientY - containerRect.top) / containerRect.height) * 100,
      };
    },
    []
  );

  const startDrawing = useCallback(
    (e: React.MouseEvent) => {
      // Store video bounds at start of drawing operation
      if (videoBounds) {
        drawingBoundsRef.current = { ...videoBounds };
        // Use video aspect ratio for square calculation
        containerAspectRef.current = videoBounds.width / videoBounds.height;
      } else {
        drawingBoundsRef.current = null;
        // Capture container aspect ratio for true pixel-square calculation
        if (containerRef.current) {
          const { clientWidth, clientHeight } = containerRef.current;
          containerAspectRef.current = clientWidth / clientHeight;
        }
      }

      const pos = getRelativePosition(e);
      if (!pos) return;

      setState({
        isDrawing: true,
        startPoint: pos,
        currentRect: { x: pos.x, y: pos.y, width: 0, height: 0 },
      });
    },
    [getRelativePosition, videoBounds]
  );

  const updateDrawing = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      if (!state.isDrawing || !state.startPoint) return;

      const pos = getRelativePosition(e);
      if (!pos) return;

      let width = Math.abs(pos.x - state.startPoint.x);
      let height = Math.abs(pos.y - state.startPoint.y);

      // Default = TRUE PIXEL SQUARE (account for container aspect ratio)
      // Shift key = free drawing (any aspect ratio)
      // For a 16:9 container, 10% width ≠ 10% height in pixels
      // To get same pixels: heightPct = widthPct * aspectRatio
      if (!e.shiftKey) {
        const aspectRatio = containerAspectRef.current;

        // Determine which dimension to use as the base
        const widthInPixelUnits = width;
        const heightInPixelUnits = height / aspectRatio;

        let squareSize: number;
        if (widthInPixelUnits >= heightInPixelUnits) {
          squareSize = width;
        } else {
          squareSize = height / aspectRatio;
        }

        // Apply square with aspect ratio correction
        width = squareSize;
        height = squareSize * aspectRatio;
      }

      // Calculate position based on direction of drag
      let x = pos.x >= state.startPoint.x
        ? state.startPoint.x
        : state.startPoint.x - width;
      let y = pos.y >= state.startPoint.y
        ? state.startPoint.y
        : state.startPoint.y - height;

      // Clamp rectangle to stay within 0-100% bounds
      // For constrained aspect ratio (no shift), scale both dimensions proportionally
      const aspectRatio = containerAspectRef.current;
      const maintainAspectRatio = !e.shiftKey;

      if (maintainAspectRatio) {
        // Calculate maximum allowed size based on available space
        const maxWidthLeft = x < 0 ? width + x : width;
        const maxWidthRight = x + width > 100 ? 100 - (x < 0 ? 0 : x) : width;
        const maxHeightTop = y < 0 ? height + y : height;
        const maxHeightBottom = y + height > 100 ? 100 - (y < 0 ? 0 : y) : height;

        // Find the limiting factor while maintaining aspect ratio
        const maxWidth = Math.min(maxWidthLeft, maxWidthRight);
        const maxHeight = Math.min(maxHeightTop, maxHeightBottom);

        // Convert to pixel units to find which dimension is limiting
        const maxWidthPixel = maxWidth;
        const maxHeightPixel = maxHeight / aspectRatio;

        // Use the smaller one (in pixel terms) to maintain square
        if (maxWidthPixel < maxHeightPixel) {
          width = maxWidth;
          height = maxWidth * aspectRatio;
        } else {
          height = maxHeight;
          width = maxHeight / aspectRatio;
        }

        // Recalculate position with new dimensions
        x = pos.x >= state.startPoint.x
          ? state.startPoint.x
          : state.startPoint.x - width;
        y = pos.y >= state.startPoint.y
          ? state.startPoint.y
          : state.startPoint.y - height;
      } else {
        // Free drawing - clamp independently
        if (x < 0) {
          width += x;
          x = 0;
        }
        if (y < 0) {
          height += y;
          y = 0;
        }
        if (x + width > 100) {
          width = 100 - x;
        }
        if (y + height > 100) {
          height = 100 - y;
        }
      }

      // Ensure width and height are non-negative
      width = Math.max(0, width);
      height = Math.max(0, height);

      setState((prev) => ({
        ...prev,
        currentRect: { x, y, width, height },
      }));
    },
    [state.isDrawing, state.startPoint, getRelativePosition]
  );

  const finishDrawing = useCallback(() => {
    if (!state.isDrawing || !state.currentRect) {
      setState({ isDrawing: false, startPoint: null, currentRect: null });
      drawingBoundsRef.current = null;
      return;
    }

    const { width, height } = state.currentRect;

    // Check minimum size
    if (width >= minSize / 10 && height >= minSize / 10) {
      onComplete?.(state.currentRect);
    } else {
      onCancel?.();
    }

    setState({ isDrawing: false, startPoint: null, currentRect: null });
    drawingBoundsRef.current = null;
  }, [state.isDrawing, state.currentRect, minSize, onComplete, onCancel]);

  const cancelDrawing = useCallback(() => {
    setState({ isDrawing: false, startPoint: null, currentRect: null });
    drawingBoundsRef.current = null;
    onCancel?.();
  }, [onCancel]);

  const setContainerRef = useCallback((element: HTMLDivElement | null) => {
    containerRef.current = element;
  }, []);

  return {
    ...state,
    containerRef,
    setContainerRef,
    startDrawing,
    updateDrawing,
    finishDrawing,
    cancelDrawing,
  };
}
