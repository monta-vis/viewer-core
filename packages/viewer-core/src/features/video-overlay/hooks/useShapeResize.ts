import { useState, useCallback, useRef, useEffect } from 'react';
import type { ShapeHandleType, Rectangle } from '../types';
import { containerToLocalSpace, localSpaceToContainer, shiftFreehandPoints } from '../utils';

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
  points?: string | null;
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
  /** Live coordinates for all shapes during group move */
  liveGroupCoords: ReadonlyMap<string, ShapeCoords> | null;
}

interface UseShapeResizeOptions<T extends ResizableShape> {
  /** Called when resize/move is complete */
  onResizeComplete?: (shapeId: string, updates: Partial<T>) => void;
  /** Called when group move is complete */
  onGroupMoveComplete?: (moves: Array<{ id: string; updates: Partial<T> }>) => void;
  /** Optional bounds to constrain resize/move operations (default: 0-100) */
  bounds?: Rectangle | null;
}

/**
 * Clamp a group of shape coordinates to fit within container bounds,
 * shifting all shapes uniformly if the group exceeds any boundary.
 */
function clampGroupToContainer(
  groupCoords: Map<string, ShapeCoords>,
  minBoundX: number,
  minBoundY: number,
  maxBoundX: number,
  maxBoundY: number,
): void {
  let groupMinX = Infinity, groupMinY = Infinity;
  let groupMaxX = -Infinity, groupMaxY = -Infinity;

  for (const [, coords] of groupCoords) {
    groupMinX = Math.min(groupMinX, coords.x1, coords.x2 ?? coords.x1);
    groupMinY = Math.min(groupMinY, coords.y1, coords.y2 ?? coords.y1);
    groupMaxX = Math.max(groupMaxX, coords.x1, coords.x2 ?? coords.x1);
    groupMaxY = Math.max(groupMaxY, coords.y1, coords.y2 ?? coords.y1);
  }

  let adjustX = 0, adjustY = 0;
  if (groupMinX < minBoundX) adjustX = minBoundX - groupMinX;
  if (groupMaxX > maxBoundX) adjustX = maxBoundX - groupMaxX;
  if (groupMinY < minBoundY) adjustY = minBoundY - groupMinY;
  if (groupMaxY > maxBoundY) adjustY = maxBoundY - groupMaxY;

  if (adjustX !== 0 || adjustY !== 0) {
    for (const [id, coords] of groupCoords) {
      groupCoords.set(id, {
        x1: coords.x1 + adjustX,
        y1: coords.y1 + adjustY,
        x2: coords.x2 !== null ? coords.x2 + adjustX : null,
        y2: coords.y2 !== null ? coords.y2 + adjustY : null,
        radius: coords.radius,
      });
    }
  }
}

/**
 * Generic hook for handling shape resizing and moving via selection handles.
 * Supports arrows (start/end + move), circles (8 handles + move), and rectangles (8 handles + move).
 *
 * This is the unified implementation used by both useAnnotationResize and useDrawingResize.
 */
export function useShapeResize<T extends ResizableShape>({
  onResizeComplete,
  onGroupMoveComplete,
  bounds,
}: UseShapeResizeOptions<T> = {}) {
  const [state, setState] = useState<ShapeResizeState>({
    isResizing: false,
    resizingShapeId: null,
    activeHandle: null,
    liveCoords: null,
    liveGroupCoords: null,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const initialShapeRef = useRef<T | null>(null);
  const liveCoordsRef = useRef<ShapeCoords | null>(null);
  const initialMousePosRef = useRef<{ x: number; y: number } | null>(null);
  // Store container aspect ratio for true pixel-square calculation
  const containerAspectRef = useRef<number>(1);
  // Group move/resize refs
  const groupInitialCoordsRef = useRef<Map<string, ShapeCoords> | null>(null);
  const liveGroupCoordsRef = useRef<Map<string, ShapeCoords> | null>(null);
  const groupInitialBBoxRef = useRef<{ minX: number; minY: number; maxX: number; maxY: number } | null>(null);
  // Store initial freehand points per shape for delta computation in group mode
  const groupInitialPointsRef = useRef<Map<string, string> | null>(null);

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

      // For move operations, store initial mouse position as raw client coordinates
      // (immune to container repositioning caused by React re-renders)
      if (handle === 'move' && e) {
        initialMousePosRef.current = {
          x: e.clientX,
          y: e.clientY,
        };
      } else {
        initialMousePosRef.current = null;
      }

      setState({
        isResizing: true,
        resizingShapeId: shape.id,
        activeHandle: handle,
        liveCoords: null,
        liveGroupCoords: null,
      });
    },
    [bounds]
  );

  const startGroupMove = useCallback(
    (shapes: T[], primaryId: string, e: React.MouseEvent) => {
      if (!containerRef.current) return;

      // Store raw client coordinates (immune to container repositioning)
      initialMousePosRef.current = {
        x: e.clientX,
        y: e.clientY,
      };

      // Store initial coords for all shapes (transform to Container-Space if bounds)
      const initialCoords = new Map<string, ShapeCoords>();
      for (const shape of shapes) {
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

        initialCoords.set(shape.id, { x1, y1, x2, y2, radius: shape.radius ?? null });
      }

      groupInitialCoordsRef.current = initialCoords;
      liveGroupCoordsRef.current = new Map(initialCoords);

      // Store initial freehand points for delta computation
      const initialPoints = new Map<string, string>();
      for (const shape of shapes) {
        if (shape.type === 'freehand' && typeof shape.points === 'string') {
          initialPoints.set(shape.id, shape.points);
        }
      }
      groupInitialPointsRef.current = initialPoints;

      // Use the primary shape for single-shape compat fields
      const primaryShape = shapes.find((s) => s.id === primaryId) ?? shapes[0];
      initialShapeRef.current = { ...primaryShape } as T;

      setState({
        isResizing: true,
        resizingShapeId: primaryId,
        activeHandle: 'move',
        liveCoords: null,
        liveGroupCoords: null,
      });
    },
    [bounds],
  );

  const startGroupResize = useCallback(
    (shapes: T[], primaryId: string, handle: ShapeHandleType, e: React.MouseEvent) => {
      if (!containerRef.current || handle === 'move' || handle === 'start' || handle === 'end') return;

      // Store raw client coordinates (immune to container repositioning)
      initialMousePosRef.current = {
        x: e.clientX,
        y: e.clientY,
      };

      // Capture container aspect ratio
      containerAspectRef.current = containerRef.current.clientWidth / containerRef.current.clientHeight;

      // Store initial coords for all shapes (transform to Container-Space if bounds)
      const initialCoords = new Map<string, ShapeCoords>();
      let bboxMinX = Infinity, bboxMinY = Infinity;
      let bboxMaxX = -Infinity, bboxMaxY = -Infinity;

      for (const shape of shapes) {
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

        initialCoords.set(shape.id, { x1, y1, x2, y2, radius: shape.radius ?? null });

        // Text shapes excluded from bounding box computation
        if (shape.type === 'text') continue;

        bboxMinX = Math.min(bboxMinX, x1, x2 ?? x1);
        bboxMinY = Math.min(bboxMinY, y1, y2 ?? y1);
        bboxMaxX = Math.max(bboxMaxX, x1, x2 ?? x1);
        bboxMaxY = Math.max(bboxMaxY, y1, y2 ?? y1);
      }

      groupInitialCoordsRef.current = initialCoords;
      liveGroupCoordsRef.current = new Map(initialCoords);

      // Store group bounding box (only non-text shapes)
      if (bboxMinX !== Infinity) {
        groupInitialBBoxRef.current = { minX: bboxMinX, minY: bboxMinY, maxX: bboxMaxX, maxY: bboxMaxY };
      } else {
        // All text shapes — no-op resize, treat as group move
        groupInitialBBoxRef.current = null;
      }

      const primaryShape = shapes.find((s) => s.id === primaryId) ?? shapes[0];
      initialShapeRef.current = { ...primaryShape } as T;

      setState({
        isResizing: true,
        resizingShapeId: primaryId,
        activeHandle: handle,
        liveCoords: null,
        liveGroupCoords: null,
      });
    },
    [bounds],
  );

  // RAF-throttled state update
  const rafIdRef = useRef<number | null>(null);

  const flushUpdate = useCallback(() => {
    if (liveGroupCoordsRef.current) {
      // Group move mode: transform all coords back to Local-Space
      const groupCoords = new Map<string, ShapeCoords>();
      for (const [id, coords] of liveGroupCoordsRef.current) {
        if (bounds) {
          groupCoords.set(id, {
            x1: containerToLocalSpace(coords.x1, bounds.x, bounds.width),
            y1: containerToLocalSpace(coords.y1, bounds.y, bounds.height),
            x2: coords.x2 !== null ? containerToLocalSpace(coords.x2, bounds.x, bounds.width) : null,
            y2: coords.y2 !== null ? containerToLocalSpace(coords.y2, bounds.y, bounds.height) : null,
            radius: coords.radius,
          });
        } else {
          groupCoords.set(id, { ...coords });
        }
      }
      setState((prev) => ({
        ...prev,
        liveGroupCoords: groupCoords,
      }));
    } else if (liveCoordsRef.current) {
      // Single shape mode
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
      e.preventDefault();
      if (!state.isResizing || !initialShapeRef.current || !state.activeHandle) {
        return;
      }

      const pos = getRelativePosition(e);
      if (!pos) return;

      // Calculate bounds - use provided bounds or fall back to container (0-100)
      const minBoundX = bounds?.x ?? 0;
      const minBoundY = bounds?.y ?? 0;
      const maxBoundX = bounds ? bounds.x + bounds.width : 100;
      const maxBoundY = bounds ? bounds.y + bounds.height : 100;

      // Clamp position to bounds
      const clampedX = Math.max(minBoundX, Math.min(maxBoundX, pos.x));
      const clampedY = Math.max(minBoundY, Math.min(maxBoundY, pos.y));

      // GROUP MODE (move or resize)
      if (groupInitialCoordsRef.current && initialMousePosRef.current) {
        // GROUP RESIZE MODE
        if (groupInitialBBoxRef.current && state.activeHandle !== 'move') {
          const MIN_GROUP_SCALE = 0.05;
          const bbox = groupInitialBBoxRef.current;
          const handle = state.activeHandle;

          // Determine anchor corner (opposite of dragged handle)
          let anchorX: number, anchorY: number;
          let edgeX: number, edgeY: number;

          // Which axes does this handle affect?
          let scalesX = true, scalesY = true;

          switch (handle) {
            case 'nw': anchorX = bbox.maxX; anchorY = bbox.maxY; edgeX = bbox.minX; edgeY = bbox.minY; break;
            case 'ne': anchorX = bbox.minX; anchorY = bbox.maxY; edgeX = bbox.maxX; edgeY = bbox.minY; break;
            case 'sw': anchorX = bbox.maxX; anchorY = bbox.minY; edgeX = bbox.minX; edgeY = bbox.maxY; break;
            case 'se': anchorX = bbox.minX; anchorY = bbox.minY; edgeX = bbox.maxX; edgeY = bbox.maxY; break;
            case 'n':  anchorX = bbox.minX; anchorY = bbox.maxY; edgeX = bbox.minX; edgeY = bbox.minY; scalesX = false; break;
            case 's':  anchorX = bbox.minX; anchorY = bbox.minY; edgeX = bbox.minX; edgeY = bbox.maxY; scalesX = false; break;
            case 'w':  anchorX = bbox.maxX; anchorY = bbox.minY; edgeX = bbox.minX; edgeY = bbox.minY; scalesY = false; break;
            case 'e':  anchorX = bbox.minX; anchorY = bbox.minY; edgeX = bbox.maxX; edgeY = bbox.minY; scalesY = false; break;
            default: return;
          }

          // Compute scale factors
          const rangeX = edgeX - anchorX;
          const rangeY = edgeY - anchorY;

          let scaleX = scalesX && rangeX !== 0 ? (clampedX - anchorX) / rangeX : 1;
          let scaleY = scalesY && rangeY !== 0 ? (clampedY - anchorY) / rangeY : 1;

          // Clamp to minimum scale
          if (scalesX) scaleX = Math.max(MIN_GROUP_SCALE, scaleX);
          if (scalesY) scaleY = Math.max(MIN_GROUP_SCALE, scaleY);

          // Default = uniform scaling (fixed aspect ratio) for corner handles
          // Shift key = free resizing (independent X/Y scaling)
          const isCornerHandle = handle === 'nw' || handle === 'ne' || handle === 'se' || handle === 'sw';
          if (!e.shiftKey && isCornerHandle) {
            const uniformScale = Math.max(scaleX, scaleY);
            scaleX = uniformScale;
            scaleY = uniformScale;
          }

          // Apply proportional scaling to each shape
          const newGroupCoords = new Map<string, ShapeCoords>();

          for (const [id, initial] of groupInitialCoordsRef.current) {
            const nx1 = anchorX + (initial.x1 - anchorX) * scaleX;
            const ny1 = anchorY + (initial.y1 - anchorY) * scaleY;
            const nx2 = initial.x2 !== null ? anchorX + (initial.x2 - anchorX) * scaleX : null;
            const ny2 = initial.y2 !== null ? anchorY + (initial.y2 - anchorY) * scaleY : null;

            newGroupCoords.set(id, { x1: nx1, y1: ny1, x2: nx2, y2: ny2, radius: initial.radius });
          }

          // Clamp group to container bounds
          clampGroupToContainer(newGroupCoords, minBoundX, minBoundY, maxBoundX, maxBoundY);

          liveGroupCoordsRef.current = newGroupCoords;
        } else {
          // GROUP MOVE MODE — compute delta from raw pixel movement
          const moveRect = containerRef.current!.getBoundingClientRect();
          const deltaX = ((e.clientX - initialMousePosRef.current.x) / moveRect.width) * 100;
          const deltaY = ((e.clientY - initialMousePosRef.current.y) / moveRect.height) * 100;

          const newGroupCoords = new Map<string, ShapeCoords>();

          for (const [id, initial] of groupInitialCoordsRef.current) {
            const nx1 = initial.x1 + deltaX;
            const ny1 = initial.y1 + deltaY;
            const nx2 = initial.x2 !== null ? initial.x2 + deltaX : null;
            const ny2 = initial.y2 !== null ? initial.y2 + deltaY : null;

            newGroupCoords.set(id, { x1: nx1, y1: ny1, x2: nx2, y2: ny2, radius: initial.radius });
          }

          clampGroupToContainer(newGroupCoords, minBoundX, minBoundY, maxBoundX, maxBoundY);

          liveGroupCoordsRef.current = newGroupCoords;
        }

        if (rafIdRef.current === null) {
          rafIdRef.current = requestAnimationFrame(flushUpdate);
        }
        return;
      }

      // SINGLE SHAPE MODE
      const shape = initialShapeRef.current;
      const handle = state.activeHandle;

      const newCoords = { ...liveCoordsRef.current! };

      // Handle 'move' for all shape types — compute delta from raw pixel movement
      if (handle === 'move' && initialMousePosRef.current) {
        const moveRect = containerRef.current!.getBoundingClientRect();
        const deltaX = ((e.clientX - initialMousePosRef.current.x) / moveRect.width) * 100;
        const deltaY = ((e.clientY - initialMousePosRef.current.y) / moveRect.height) * 100;

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

    if (state.isResizing) {
      // GROUP MOVE MODE
      if (groupInitialCoordsRef.current && liveGroupCoordsRef.current) {
        const moves: Array<{ id: string; updates: Partial<T> }> = [];

        for (const [id, coords] of liveGroupCoordsRef.current) {
          let x1 = coords.x1;
          let y1 = coords.y1;
          let x2 = coords.x2;
          let y2 = coords.y2;

          if (bounds) {
            x1 = Math.max(0, Math.min(1, containerToLocalSpace(x1, bounds.x, bounds.width)));
            y1 = Math.max(0, Math.min(1, containerToLocalSpace(y1, bounds.y, bounds.height)));
            if (x2 !== null) x2 = Math.max(0, Math.min(1, containerToLocalSpace(x2, bounds.x, bounds.width)));
            if (y2 !== null) y2 = Math.max(0, Math.min(1, containerToLocalSpace(y2, bounds.y, bounds.height)));
          }

          const updates: Partial<T> = { x1, y1, x2, y2 } as Partial<T>;

          // Shift freehand points by the delta from initial to final coords
          const initialCoords = groupInitialCoordsRef.current!.get(id);
          const initialPoints = groupInitialPointsRef.current?.get(id);
          if (initialCoords && initialPoints) {
            const deltaX = x1 - (bounds
              ? Math.max(0, Math.min(1, containerToLocalSpace(initialCoords.x1, bounds.x, bounds.width)))
              : initialCoords.x1);
            const deltaY = y1 - (bounds
              ? Math.max(0, Math.min(1, containerToLocalSpace(initialCoords.y1, bounds.y, bounds.height)))
              : initialCoords.y1);
            const shifted = shiftFreehandPoints(initialPoints, deltaX, deltaY);
            if (shifted !== undefined) {
              (updates as Partial<ResizableShape>).points = shifted;
            }
          }

          moves.push({ id, updates });
        }

        onGroupMoveComplete?.(moves);

        groupInitialCoordsRef.current = null;
        liveGroupCoordsRef.current = null;
        groupInitialPointsRef.current = null;
      }
      // SINGLE SHAPE MODE
      else if (state.resizingShapeId && liveCoordsRef.current) {
        const coords = liveCoordsRef.current;

        let x1 = coords.x1;
        let y1 = coords.y1;
        let x2 = coords.x2;
        let y2 = coords.y2;

        if (bounds) {
          x1 = containerToLocalSpace(x1, bounds.x, bounds.width);
          y1 = containerToLocalSpace(y1, bounds.y, bounds.height);
          if (x2 !== null) x2 = containerToLocalSpace(x2, bounds.x, bounds.width);
          if (y2 !== null) y2 = containerToLocalSpace(y2, bounds.y, bounds.height);

          x1 = Math.max(0, Math.min(1, x1));
          y1 = Math.max(0, Math.min(1, y1));
          if (x2 !== null) x2 = Math.max(0, Math.min(1, x2));
          if (y2 !== null) y2 = Math.max(0, Math.min(1, y2));
        }

        const updates: Partial<T> = { x1, y1, x2, y2 } as Partial<T>;
        if (coords.radius !== undefined) {
          (updates as Partial<ResizableShape>).radius = coords.radius;
        }

        // Shift freehand points by the delta from initial to final coords
        const initialShape = initialShapeRef.current;
        if (initialShape && initialShape.type === 'freehand' && typeof initialShape.points === 'string') {
          const deltaX = x1 - (initialShape.x1 ?? 0);
          const deltaY = y1 - (initialShape.y1 ?? 0);
          const shifted = shiftFreehandPoints(initialShape.points, deltaX, deltaY);
          if (shifted !== undefined) {
            (updates as Partial<ResizableShape>).points = shifted;
          }
        }

        onResizeComplete?.(state.resizingShapeId, updates);
      }
    }

    setState({
      isResizing: false,
      resizingShapeId: null,
      activeHandle: null,
      liveCoords: null,
      liveGroupCoords: null,
    });
    initialShapeRef.current = null;
    liveCoordsRef.current = null;
    groupInitialCoordsRef.current = null;
    liveGroupCoordsRef.current = null;
    groupInitialBBoxRef.current = null;
    groupInitialPointsRef.current = null;
  }, [state.isResizing, state.resizingShapeId, onResizeComplete, onGroupMoveComplete, bounds]);

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
      liveGroupCoords: null,
    });
    initialShapeRef.current = null;
    liveCoordsRef.current = null;
    groupInitialCoordsRef.current = null;
    liveGroupCoordsRef.current = null;
    groupInitialBBoxRef.current = null;
    groupInitialPointsRef.current = null;
  }, []);

  // Global mouse event listeners during resize
  useEffect(() => {
    if (!state.isResizing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelResize();
      }
    };

    window.addEventListener('mousemove', updateResize);
    window.addEventListener('mouseup', finishResize);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousemove', updateResize);
      window.removeEventListener('mouseup', finishResize);
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
    startGroupMove,
    startGroupResize,
    cancelResize,
  };
}
