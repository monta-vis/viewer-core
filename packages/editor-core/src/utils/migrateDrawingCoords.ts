import type { DrawingRow } from '@monta-vis/viewer-core';

/**
 * Compute the bounds of an image within a 1:1 container (object-contain).
 * Returns { x, y, w, h } as fractions of the container (0-1).
 */
function computeImageBoundsInContainer(imageAspectRatio: number): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  if (imageAspectRatio > 1) {
    // Wider than tall: fills width, letterboxed top/bottom
    const h = 1 / imageAspectRatio;
    return { x: 0, y: (1 - h) / 2, w: 1, h };
  }
  if (imageAspectRatio < 1) {
    // Taller than wide: fills height, letterboxed left/right
    const w = imageAspectRatio;
    return { x: (1 - w) / 2, y: 0, w, h: 1 };
  }
  // Square
  return { x: 0, y: 0, w: 1, h: 1 };
}

/**
 * Migrate a drawing from image-relative coords (0-1 of image) to
 * container-relative coords (0-1 of 1:1 container with letterboxing).
 *
 * Formula: new_coord = bounds_offset + old_coord * bounds_size
 */
export function migrateImageDrawingToContainerSpace(
  drawing: DrawingRow,
  imageAspectRatio: number,
): Partial<DrawingRow> {
  const bounds = computeImageBoundsInContainer(imageAspectRatio);

  const transformX = (v: number) => bounds.x + v * bounds.w;
  const transformY = (v: number) => bounds.y + v * bounds.h;

  const updates: Partial<DrawingRow> = {};

  if (drawing.x1 != null) updates.x1 = transformX(drawing.x1);
  if (drawing.y1 != null) updates.y1 = transformY(drawing.y1);
  if (drawing.x2 != null) updates.x2 = transformX(drawing.x2);
  if (drawing.y2 != null) updates.y2 = transformY(drawing.y2);
  if (drawing.x != null) updates.x = transformX(drawing.x);
  if (drawing.y != null) updates.y = transformY(drawing.y);

  // Transform freehand points
  if (drawing.points) {
    try {
      const points = JSON.parse(drawing.points) as Array<{ x: number; y: number }>;
      const migratedPoints = points.map((p) => ({
        x: transformX(p.x),
        y: transformY(p.y),
      }));
      updates.points = JSON.stringify(migratedPoints);
    } catch (err) {
      console.error('[migrateImageDrawingToContainerSpace] Failed to parse freehand points:', err);
    }
  }

  return updates;
}
