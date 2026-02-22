/**
 * Utility functions for applying square (1:1 aspect ratio) constraints
 * to rectangle drawing operations.
 *
 * Default behavior: Square (1:1 in true pixels)
 * With Shift key: Free drawing (any aspect ratio)
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

  // Convert to pixel-equivalent units for comparison
  const widthInPixelUnits = width;
  const heightInPixelUnits = height / aspectRatio;

  // Use the larger dimension as the base for the square
  let squareSize: number;
  if (widthInPixelUnits >= heightInPixelUnits) {
    squareSize = width;
  } else {
    squareSize = height / aspectRatio;
  }

  // Apply square with aspect ratio correction
  return {
    width: squareSize,
    height: squareSize * aspectRatio,
  };
}

/**
 * Calculate the aspect ratio from a container element.
 *
 * @param container - The HTML element to get aspect ratio from
 * @returns The aspect ratio (width / height)
 */
export function getContainerAspectRatio(container: HTMLElement): number {
  const { clientWidth, clientHeight } = container;
  return clientWidth / clientHeight || 1;
}
