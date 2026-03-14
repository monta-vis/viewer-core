/**
 * Shifts all freehand points by the given delta (in coordinate-space units).
 * Returns the shifted JSON string, or undefined if not applicable.
 */
export function shiftFreehandPoints(
  points: string | null | undefined,
  deltaX: number,
  deltaY: number,
): string | undefined {
  if (!points) return undefined;
  try {
    const parsed: { x: number; y: number }[] = JSON.parse(points);
    const shifted = parsed.map((p) => ({ x: p.x + deltaX, y: p.y + deltaY }));
    return JSON.stringify(shifted);
  } catch {
    console.error('[shiftFreehandPoints] Failed to parse freehand points:', points);
    return undefined;
  }
}
