import { useMemo } from 'react';

import type { ViewportKeyframe, ViewportKeyframeRow } from '@/features/instruction';
import { lerpViewport, viewportToTransform, keyframeRowToViewport } from './useViewportInterpolation';

// ============================================
// Types
// ============================================

interface UseVideoViewportInterpolationProps {
  /** Current frame in the video */
  currentFrame: number;
  /** All viewport keyframes for the video (sorted by frameNumber) */
  viewportKeyframes: ViewportKeyframeRow[];
  /** Video aspect ratio (width/height) for calculating true square default */
  videoAspectRatio?: number;
}

interface VideoViewportResult {
  /** The interpolated viewport for the current frame (always defined, uses default if no keyframes) */
  viewport: ViewportKeyframe;
  /** CSS transform style to apply to the video */
  style: React.CSSProperties | undefined;
  /** Whether custom viewport keyframes exist (vs using default) */
  hasViewport: boolean;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate default viewport as a true pixel square, centered.
 * Uses 50% of the smaller dimension to ensure it fits.
 * @param aspectRatio Video width/height ratio (e.g., 1.78 for 16:9)
 */
function getDefaultViewport(aspectRatio?: number): ViewportKeyframe {
  // Default: 50% of height as the square size
  const squareHeightPercent = 50;

  if (!aspectRatio || aspectRatio <= 0) {
    // Fallback: assume 16:9
    aspectRatio = 16 / 9;
  }

  // For a true pixel square: width% = height% / aspectRatio
  // This accounts for the video being wider than tall
  const squareWidthPercent = squareHeightPercent / aspectRatio;

  // Center the square
  const x = (100 - squareWidthPercent) / 2;
  const y = (100 - squareHeightPercent) / 2;

  return {
    x,
    y,
    width: squareWidthPercent,
    height: squareHeightPercent,
  };
}

/**
 * Interpolate viewport for a given frame using video-level keyframes.
 * Keyframes have absolute frame numbers (per-Video, not relative to section).
 * Returns default viewport (centered, true square) if no keyframes exist.
 */
function interpolateVideoViewport(
  currentFrame: number,
  keyframes: ViewportKeyframeRow[],
  videoAspectRatio?: number
): ViewportKeyframe {
  // No keyframes = use default viewport (centered, true square)
  if (keyframes.length === 0) {
    return getDefaultViewport(videoAspectRatio);
  }

  // Sort by frame number
  const sorted = [...keyframes].sort((a, b) => a.frameNumber - b.frameNumber);

  // Single keyframe = static viewport
  if (sorted.length === 1) {
    return keyframeRowToViewport(sorted[0]);
  }

  // Before first keyframe
  if (currentFrame <= sorted[0].frameNumber) {
    return keyframeRowToViewport(sorted[0]);
  }

  // After last keyframe
  if (currentFrame >= sorted[sorted.length - 1].frameNumber) {
    return keyframeRowToViewport(sorted[sorted.length - 1]);
  }

  // Find the two keyframes to interpolate between
  for (let i = 0; i < sorted.length - 1; i++) {
    const from = sorted[i];
    const to = sorted[i + 1];

    if (currentFrame >= from.frameNumber && currentFrame <= to.frameNumber) {
      // Hold (default): stay at FROM until exact TO frame, then jump
      if (to.interpolation !== 'linear') {
        return keyframeRowToViewport(currentFrame === to.frameNumber ? to : from);
      }
      // Linear: smooth interpolation
      const duration = to.frameNumber - from.frameNumber;
      if (duration === 0) {
        return keyframeRowToViewport(from);
      }
      const t = (currentFrame - from.frameNumber) / duration;
      return lerpViewport(
        keyframeRowToViewport(from),
        keyframeRowToViewport(to),
        t
      );
    }
  }

  // Fallback (should not reach here)
  return getDefaultViewport(videoAspectRatio);
}

// ============================================
// Hook
// ============================================

/**
 * Hook for video-wide viewport interpolation.
 *
 * SIMPLIFIED: Keyframes are now per-Video (not per-Section) with absolute frame numbers.
 * No inheritance logic needed - all keyframes belong to the video directly.
 *
 * Features:
 * - Linear interpolation between keyframes
 * - Default viewport is a true pixel square (centered, 50% of height)
 * - Returns interpolated viewport and CSS transform style
 */
export function useVideoViewportInterpolation({
  currentFrame,
  viewportKeyframes,
  videoAspectRatio,
}: UseVideoViewportInterpolationProps): VideoViewportResult {
  // Interpolate viewport for current frame
  const viewport = useMemo(
    () => interpolateVideoViewport(currentFrame, viewportKeyframes, videoAspectRatio),
    [currentFrame, viewportKeyframes, videoAspectRatio]
  );

  const hasViewport = viewportKeyframes.length > 0;

  // Only compute CSS transform when keyframes exist — no keyframes means no viewport crop
  const style = useMemo(() => {
    if (!hasViewport) return undefined;
    const transform = viewportToTransform(viewport);
    return {
      transform: `scale(${transform.scale}) translate(${transform.translateX}%, ${transform.translateY}%)`,
      transformOrigin: 'center center',
    } as React.CSSProperties;
  }, [viewport, hasViewport]);

  return {
    viewport,
    style,
    hasViewport,
  };
}

// ============================================
// Legacy exports for backwards compatibility
// ============================================

// Re-export with old name for any remaining consumers during migration
export { useVideoViewportInterpolation as useSubstepViewportInterpolation };

// Export for testing
export {
  interpolateVideoViewport,
  type VideoViewportResult,
};
