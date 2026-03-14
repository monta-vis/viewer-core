import { shiftFreehandPoints } from './shiftFreehandPoints';

/** Minimal coordinate shape for live preview updates */
interface LiveCoords {
  x1: number;
  y1: number;
  x2: number | null;
  y2: number | null;
}

interface ShapeWithCoords {
  id: string;
  type: string;
  x1: number | null;
  y1: number | null;
  x2: number | null;
  y2: number | null;
  x?: number | null;
  y?: number | null;
  radius?: number | null;
  points?: string | null;
}

/**
 * Applies live resize/move coordinates to a list of shapes for real-time visual feedback.
 * Handles three modes: group coords, single coords, or passthrough.
 *
 * Text shapes get their x/y synced to x1/y1 in both group and single modes.
 */
export function applyLiveCoords<T extends ShapeWithCoords>(
  shapes: T[],
  opts: {
    isResizing: boolean;
    liveGroupCoords: ReadonlyMap<string, LiveCoords> | null | undefined;
    liveCoords: LiveCoords | null;
    resizingShapeId: string | null;
  },
): T[] {
  if (!opts.isResizing) return shapes;

  // Group move/resize mode
  if (opts.liveGroupCoords) {
    return shapes.map((shape) => {
      const groupCoords = opts.liveGroupCoords!.get(shape.id);
      if (!groupCoords) return shape;
      const updated = {
        ...shape,
        x1: groupCoords.x1,
        y1: groupCoords.y1,
        x2: groupCoords.x2,
        y2: groupCoords.y2,
      };
      if (shape.type === 'text') {
        updated.x = groupCoords.x1;
        updated.y = groupCoords.y1;
      }
      if (shape.type === 'freehand' && shape.points && shape.x1 !== null && shape.y1 !== null) {
        const deltaX = groupCoords.x1 - shape.x1;
        const deltaY = groupCoords.y1 - shape.y1;
        const shifted = shiftFreehandPoints(shape.points, deltaX, deltaY);
        if (shifted !== undefined) updated.points = shifted;
      }
      return updated;
    });
  }

  // Single shape mode
  if (!opts.liveCoords) return shapes;

  return shapes.map((shape) => {
    if (shape.id === opts.resizingShapeId) {
      const updated = {
        ...shape,
        x1: opts.liveCoords!.x1,
        y1: opts.liveCoords!.y1,
        x2: opts.liveCoords!.x2,
        y2: opts.liveCoords!.y2,
      };
      if (shape.type === 'text') {
        updated.x = opts.liveCoords!.x1;
        updated.y = opts.liveCoords!.y1;
      }
      if (shape.type === 'freehand' && shape.points && shape.x1 !== null && shape.y1 !== null) {
        const deltaX = opts.liveCoords!.x1 - shape.x1;
        const deltaY = opts.liveCoords!.y1 - shape.y1;
        const shifted = shiftFreehandPoints(shape.points, deltaX, deltaY);
        if (shifted !== undefined) updated.points = shifted;
      }
      return updated;
    }
    return shape;
  });
}
