import { useMemo } from 'react';

import type { ViewportKeyframe, ViewportKeyframeRow } from '@/features/instruction';

interface UseViewportInterpolationProps {
  currentFrame: number;
  /** Keyframes with absolute frameNumber (per-Video, not relative to section) */
  keyframes: ViewportKeyframeRow[];
}

interface ViewportTransform {
  scale: number;
  translateX: number; // in %
  translateY: number; // in %
}

/**
 * Linear interpolation between two values
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Interpolate between two viewport keyframes
 */
function lerpViewport(
  from: ViewportKeyframe,
  to: ViewportKeyframe,
  t: number
): ViewportKeyframe {
  return {
    x: lerp(from.x, to.x, t),
    y: lerp(from.y, to.y, t),
    width: lerp(from.width, to.width, t),
    height: lerp(from.height, to.height, t),
  };
}

/**
 * Convert ViewportKeyframeRow (0-1 normalized) to ViewportKeyframe (0-100%)
 */
function keyframeRowToViewport(row: ViewportKeyframeRow): ViewportKeyframe {
  return {
    x: row.x * 100,
    y: row.y * 100,
    width: row.width * 100,
    height: row.height * 100,
  };
}

/** Pre-sort and convert keyframes (call once when keyframes change, not per frame). */
function prepareKeyframes(keyframes: ViewportKeyframeRow[]) {
  return keyframes
    .map(kf => ({
      frame: kf.frameNumber,
      viewport: keyframeRowToViewport(kf),
      interpolation: kf.interpolation,
    }))
    .sort((a, b) => a.frame - b.frame);
}

type PreparedKeyframe = ReturnType<typeof prepareKeyframes>[number];

/**
 * Calculate the interpolated viewport for a given frame.
 * Returns null if no keyframes are defined (show full video).
 *
 * Note: Keyframes now have absolute frameNumber (per-Video, not relative to section).
 */
function interpolateViewport(
  currentFrame: number,
  keyframes: ViewportKeyframeRow[],
  prepared?: PreparedKeyframe[]
): ViewportKeyframe | null {
  // No keyframes = no viewport (show full video)
  if (!keyframes || keyframes.length === 0) {
    return null;
  }

  const absoluteKeyframes = prepared ?? prepareKeyframes(keyframes);

  // Single keyframe = static viewport (no animation)
  if (absoluteKeyframes.length === 1) {
    return absoluteKeyframes[0].viewport;
  }

  // Clamp to range: before first keyframe, use first keyframe
  if (currentFrame <= absoluteKeyframes[0].frame) {
    return absoluteKeyframes[0].viewport;
  }

  // After last keyframe, use last keyframe
  if (currentFrame >= absoluteKeyframes[absoluteKeyframes.length - 1].frame) {
    return absoluteKeyframes[absoluteKeyframes.length - 1].viewport;
  }

  // Check for exact keyframe match (handles hold "jump" at exact frame)
  const exactMatch = absoluteKeyframes.find(kf => kf.frame === currentFrame);
  if (exactMatch) {
    return exactMatch.viewport;
  }

  // Find the two keyframes to interpolate between
  for (let i = 0; i < absoluteKeyframes.length - 1; i++) {
    const from = absoluteKeyframes[i];
    const to = absoluteKeyframes[i + 1];

    if (currentFrame > from.frame && currentFrame < to.frame) {
      // Hold (default): stay at FROM's values until exact TO frame
      if (to.interpolation !== 'linear') {
        return from.viewport;
      }
      // Linear: smooth interpolation from FROM to TO
      const t = (currentFrame - from.frame) / (to.frame - from.frame);
      return lerpViewport(from.viewport, to.viewport, t);
    }
  }

  // Fallback (should not reach here)
  return null;
}

/**
 * Convert a viewport rectangle to CSS transform values.
 * The transform scales and translates the video to show only the viewport area.
 */
function viewportToTransform(viewport: ViewportKeyframe): ViewportTransform {
  // viewport.width is the percentage of video visible (e.g., 50 = 50%)
  // scale = 100 / viewport.width to fill the container
  const scale = 100 / viewport.width;

  // Calculate the center of the viewport
  const viewportCenterX = viewport.x + viewport.width / 2;
  const viewportCenterY = viewport.y + viewport.height / 2;

  // We need to translate so the viewport center is at the container center (50%)
  // After scaling, translation is in scaled coordinates
  // translateX = (50 - viewportCenterX) means: move the viewport center to container center
  const translateX = 50 - viewportCenterX;
  const translateY = 50 - viewportCenterY;

  return { scale, translateX, translateY };
}

/**
 * Hook to calculate viewport interpolation and CSS transform for the current frame.
 * Returns null if no viewport animation is defined (show full video).
 *
 * Updated: Keyframes are now per-Video with absolute frame numbers.
 */
export function useViewportInterpolation({
  currentFrame,
  keyframes,
}: UseViewportInterpolationProps): {
  viewport: ViewportKeyframe | null;
  transform: ViewportTransform | null;
  style: React.CSSProperties | undefined;
} {
  // Pre-sort once when keyframes change, not on every frame
  const prepared = useMemo(() => prepareKeyframes(keyframes), [keyframes]);

  return useMemo(() => {
    const viewport = interpolateViewport(currentFrame, keyframes, prepared);

    if (!viewport) {
      return { viewport: null, transform: null, style: undefined };
    }

    const transform = viewportToTransform(viewport);

    const style: React.CSSProperties = {
      transform: `scale(${transform.scale}) translate(${transform.translateX}%, ${transform.translateY}%)`,
      transformOrigin: 'center center',
    };

    return { viewport, transform, style };
  }, [currentFrame, keyframes, prepared]);
}

// Export utility functions for testing
export { interpolateViewport, viewportToTransform, lerp, lerpViewport, keyframeRowToViewport, prepareKeyframes };
