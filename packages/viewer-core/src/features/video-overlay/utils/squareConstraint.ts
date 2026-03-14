/**
 * Utility functions for applying square (1:1 aspect ratio) constraints
 * to rectangle drawing operations.
 *
 * Default behavior: Free drawing (any aspect ratio)
 * With Shift key: Square (1:1 in true pixels)
 */

export interface SquareConstraintOptions {
  /** Width in percentage units (0-100) */
  width: number;
  /** Height in percentage units (0-100) */
  height: number;
  /** Container aspect ratio (width / height) for true pixel-square calculation */
  aspectRatio: number;
  /** If true, allow free drawing (no square constraint) */
  freeMode?: boolean;
}

export interface SquareConstraintResult {
  /** Constrained width in percentage units */
  width: number;
  /** Constrained height in percentage units */
  height: number;
}

/**
 * Apply square constraint to width/height values.
 *
 * For a 16:9 container, 10% width ≠ 10% height in pixels.
 * To get same pixels: heightPct = widthPct * aspectRatio
 *
 * @param options - The constraint options
 * @returns The constrained width and height
 */
export function applySquareConstraint({
  width,
  height,
  aspectRatio,
  freeMode = false,
}: SquareConstraintOptions): SquareConstraintResult {
  // If free mode (Shift key), return original dimensions
  if (freeMode) {
    return { width, height };
  }

  // Use the larger dimension (in pixel-equivalent units) as the base for the square.
  // height / aspectRatio converts height-% to the same pixel-equivalent unit as width-%.
  const squareSize = Math.max(width, height / aspectRatio);

  return {
    width: squareSize,
    height: squareSize * aspectRatio,
  };
}
