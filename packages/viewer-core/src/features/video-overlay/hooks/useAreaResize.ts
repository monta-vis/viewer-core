import { useState, useCallback, useRef, useEffect } from 'react';
import type { Rectangle, AreaResizeHandle, VideoBoundsOverride } from '../types';

export interface ResizeState {
  /** Is currently resizing */
  isResizing: boolean;
  /** ID of area being resized */
  resizingAreaId: string | null;
  /** Which handle is being dragged */
  activeHandle: AreaResizeHandle | null;
  /** Current rectangle during resize */
  currentRect: Rectangle | null;
}

export interface UseAreaResizeOptions {
  /** Called when resize is complete */
  onResizeComplete?: (areaId: string, newRect: Rectangle) => void;
  /** Minimum size as percentage (default: 3) */
  minSize?: number;
  /** If provided, resize calculations for all areas will use these bounds (video-relative) */
  videoBounds?: VideoBoundsOverride | null;
}

/**
 * Hook for handling area resizing.
 * Default = square resize (1:1 aspect ratio in true pixels).
 * Shift+drag = free resize (any aspect ratio).
 * Uses direct DOM updates during drag for smooth performance.
 */
export function useAreaResize({
  onResizeComplete,
  minSize = 3,
  videoBounds,
}: UseAreaResizeOptions = {}) {
  const [state, setState] = useState<ResizeState>({
    isResizing: false,
    resizingAreaId: null,
    activeHandle: null,
    currentRect: null,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const initialRectRef = useRef<Rectangle | null>(null);
  // Use ref for live rect during drag to avoid re-renders
  const liveRectRef = useRef<Rectangle | null>(null);
  // Store container aspect ratio for true pixel-square calculation
  const containerAspectRef = useRef<number>(1);
  // Store bounds to use for current resize operation
  const resizeBoundsRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  // For move operations, store initial mouse position
  const initialMouseRef = useRef<{ x: number; y: number } | null>(null);

  const getRelativePosition = useCallback(
    (e: MouseEvent): { x: number; y: number } | null => {
      if (!containerRef.current) return null;

      const containerRect = containerRef.current.getBoundingClientRect();
      const bounds = resizeBoundsRef.current;

      if (bounds) {
        // Use video-relative bounds (for viewport resizing)
        const boundsLeft = containerRect.left + bounds.x;
        const boundsTop = containerRect.top + bounds.y;
        return {
          x: ((e.clientX - boundsLeft) / bounds.width) * 100,
          y: ((e.clientY - boundsTop) / bounds.height) * 100,
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

  const startResize = useCallback(
    (areaId: string, handle: AreaResizeHandle, initialRect: Rectangle, e?: React.MouseEvent) => {
      initialRectRef.current = { ...initialRect };
      liveRectRef.current = { ...initialRect };

      // For move operations, store initial mouse position
      if (handle === 'move' && e && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        // Use video bounds for all areas (coordinates are video-relative)
        const bounds = videoBounds ? {
          x: videoBounds.x,
          y: videoBounds.y,
          width: videoBounds.width,
          height: videoBounds.height,
        } : null;

        if (bounds) {
          const boundsLeft = containerRect.left + bounds.x;
          const boundsTop = containerRect.top + bounds.y;
          initialMouseRef.current = {
            x: ((e.clientX - boundsLeft) / bounds.width) * 100,
            y: ((e.clientY - boundsTop) / bounds.height) * 100,
          };
        } else {
          initialMouseRef.current = {
            x: ((e.clientX - containerRect.left) / containerRect.width) * 100,
            y: ((e.clientY - containerRect.top) / containerRect.height) * 100,
          };
        }
      } else {
        initialMouseRef.current = null;
      }

      // Use video bounds for all areas (coordinates are video-relative)
      if (videoBounds) {
        resizeBoundsRef.current = {
          x: videoBounds.x,
          y: videoBounds.y,
          width: videoBounds.width,
          height: videoBounds.height,
        };
        // Use video aspect ratio for square calculation
        containerAspectRef.current = videoBounds.width / videoBounds.height;
      } else {
        resizeBoundsRef.current = null;
        // Capture container aspect ratio for true pixel-square calculation
        if (containerRef.current) {
          const { clientWidth, clientHeight } = containerRef.current;
          containerAspectRef.current = clientWidth / clientHeight;
        }
      }

      setState({
        isResizing: true,
        resizingAreaId: areaId,
        activeHandle: handle,
        currentRect: { ...initialRect },
      });
    },
    [videoBounds]
  );

  // RAF-throttled state update for smooth performance
  const rafIdRef = useRef<number | null>(null);
  const pendingRectRef = useRef<Rectangle | null>(null);

  const flushUpdate = useCallback(() => {
    if (pendingRectRef.current) {
      setState((prev) => ({
        ...prev,
        currentRect: pendingRectRef.current,
      }));
    }
    rafIdRef.current = null;
  }, []);

  const updateResize = useCallback(
    (e: MouseEvent) => {
      if (!state.isResizing || !initialRectRef.current || !state.activeHandle) return;

      const pos = getRelativePosition(e);
      if (!pos) return;

      const initial = initialRectRef.current;
      const handle = state.activeHandle;
      const shiftKey = e.shiftKey;
      const aspectRatio = containerAspectRef.current;

      // Start with initial rect values
      let x = initial.x;
      let y = initial.y;
      let width = initial.width;
      let height = initial.height;

      // Handle move operation
      if (handle === 'move' && initialMouseRef.current) {
        const deltaX = pos.x - initialMouseRef.current.x;
        const deltaY = pos.y - initialMouseRef.current.y;

        x = initial.x + deltaX;
        y = initial.y + deltaY;

        // Clamp to container bounds
        x = Math.max(0, Math.min(x, 100 - width));
        y = Math.max(0, Math.min(y, 100 - height));
      } else {
        // Calculate new bounds based on handle type
        const left = initial.x;
        const top = initial.y;
        const right = initial.x + initial.width;
        const bottom = initial.y + initial.height;

        // Horizontal resize (left edge)
        if (handle === 'topLeft' || handle === 'left' || handle === 'bottomLeft') {
        const newLeft = Math.max(0, Math.min(pos.x, right - minSize));
        x = newLeft;
        width = right - newLeft;
      }

      // Horizontal resize (right edge)
      if (handle === 'topRight' || handle === 'right' || handle === 'bottomRight') {
        const newRight = Math.min(100, Math.max(pos.x, left + minSize));
        width = newRight - left;
      }

      // Vertical resize (top edge)
      if (handle === 'topLeft' || handle === 'top' || handle === 'topRight') {
        const newTop = Math.max(0, Math.min(pos.y, bottom - minSize));
        y = newTop;
        height = bottom - newTop;
      }

      // Vertical resize (bottom edge)
      if (handle === 'bottomLeft' || handle === 'bottom' || handle === 'bottomRight') {
        const newBottom = Math.min(100, Math.max(pos.y, top + minSize));
        height = newBottom - top;
      }

      // Default = TRUE PIXEL SQUARE (account for container aspect ratio)
      // Shift key = free resizing (any aspect ratio)
      if (!shiftKey && (handle === 'topLeft' || handle === 'topRight' || handle === 'bottomLeft' || handle === 'bottomRight')) {
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

        if (handle === 'bottomRight') {
          width = Math.min(newWidth, 100 - x);
          height = Math.min(newHeight, 100 - y);
          const clampedSize = Math.min(width, height / aspectRatio);
          width = clampedSize;
          height = clampedSize * aspectRatio;
        } else if (handle === 'bottomLeft') {
          width = Math.min(newWidth, right);
          height = Math.min(newHeight, 100 - y);
          const clampedSize = Math.min(width, height / aspectRatio);
          width = clampedSize;
          height = clampedSize * aspectRatio;
          x = right - width;
        } else if (handle === 'topRight') {
          width = Math.min(newWidth, 100 - x);
          height = Math.min(newHeight, bottom);
          const clampedSize = Math.min(width, height / aspectRatio);
          width = clampedSize;
          height = clampedSize * aspectRatio;
          y = bottom - height;
        } else if (handle === 'topLeft') {
          width = Math.min(newWidth, right);
          height = Math.min(newHeight, bottom);
          const clampedSize = Math.min(width, height / aspectRatio);
          width = clampedSize;
          height = clampedSize * aspectRatio;
          x = right - width;
          y = bottom - height;
        }
        }
      }

      // Store in ref for immediate access
      const newRect = { x, y, width, height };
      liveRectRef.current = newRect;
      pendingRectRef.current = newRect;

      // Throttle React state updates with RAF for smooth performance
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(flushUpdate);
      }
    },
    [state.isResizing, state.activeHandle, getRelativePosition, minSize, flushUpdate]
  );

  const finishResize = useCallback(() => {
    // Cancel any pending RAF
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    // Use liveRectRef for the final value (might not be in state yet)
    const finalRect = liveRectRef.current || state.currentRect;
    if (state.isResizing && state.resizingAreaId && finalRect) {
      onResizeComplete?.(state.resizingAreaId, finalRect);
    }

    setState({
      isResizing: false,
      resizingAreaId: null,
      activeHandle: null,
      currentRect: null,
    });
    initialRectRef.current = null;
    liveRectRef.current = null;
    pendingRectRef.current = null;
    resizeBoundsRef.current = null;
    initialMouseRef.current = null;
  }, [state.isResizing, state.resizingAreaId, state.currentRect, onResizeComplete]);

  const cancelResize = useCallback(() => {
    // Cancel any pending RAF
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    setState({
      isResizing: false,
      resizingAreaId: null,
      activeHandle: null,
      currentRect: null,
    });
    initialRectRef.current = null;
    liveRectRef.current = null;
    pendingRectRef.current = null;
    resizeBoundsRef.current = null;
    initialMouseRef.current = null;
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
