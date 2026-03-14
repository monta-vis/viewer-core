/** Convert absolute points to bbox-relative [0-1] */
export function normalizeFreehandPoints(
  points: { x: number; y: number }[],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): { x: number; y: number }[] {
  const rawW = x2 - x1;
  const rawH = y2 - y1;
  if (rawW === 0 || rawH === 0) {
    console.warn('[normalizeFreehandPoints] Zero-size bbox dimension, using fallback divisor');
  }
  const w = rawW || 1;
  const h = rawH || 1;
  return points.map((p) => ({
    x: (p.x - x1) / w,
    y: (p.y - y1) / h,
  }));
}

/** Convert bbox-relative [0-1] points to absolute coordinates */
export function denormalizeFreehandPoints(
  points: { x: number; y: number }[],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): { x: number; y: number }[] {
  const w = x2 - x1;
  const h = y2 - y1;
  return points.map((p) => ({
    x: x1 + p.x * w,
    y: y1 + p.y * h,
  }));
}

/**
 * Backward compatibility: detect old absolute-format points and auto-convert.
 * Bbox-relative points are always in [0, 1]. Absolute points in 0-100% space
 * will have values > 1 (a freehand stroke spanning < 1% of the canvas is practically impossible).
 */
export function detectAndNormalize(
  points: { x: number; y: number }[],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): { x: number; y: number }[] {
  if (points.length === 0) return points;

  const maxVal = Math.max(...points.map((p) => Math.max(Math.abs(p.x), Math.abs(p.y))));
  if (maxVal > 1.5) {
    return normalizeFreehandPoints(points, x1, y1, x2, y2);
  }
  return points;
}
