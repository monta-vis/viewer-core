/**
 * Coordinate conversion utilities for VideoFrameArea
 *
 * UI format (Rectangle): x, y, width, height (percentages 0-100)
 * DB format (NormalizedRect): x, y, width, height (normalized 0.0-1.0)
 */

import type { Rectangle } from '../types';

export interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Convert UI rectangle format (0-100%) to DB normalized format (0-1)
 * Used when saving drawn areas to the store
 */
export function rectToNormalized(rect: Rectangle): NormalizedRect {
  return {
    x: rect.x / 100,
    y: rect.y / 100,
    width: rect.width / 100,
    height: rect.height / 100,
  };
}

/**
 * Convert DB normalized format (0-1) to UI rectangle format (0-100%)
 * Used when displaying stored areas on the canvas
 */
export function normalizedToRect(normalized: Partial<NormalizedRect>): Rectangle {
  const x = normalized.x ?? 0;
  const y = normalized.y ?? 0;
  const width = normalized.width ?? 0;
  const height = normalized.height ?? 0;

  return {
    x: x * 100,
    y: y * 100,
    width: width * 100,
    height: height * 100,
  };
}
