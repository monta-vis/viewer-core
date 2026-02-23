import type { CSSProperties } from 'react';

import { useVideo } from '../context/VideoContext';
import { useVideoViewportInterpolation } from './useSubstepViewportInterpolation';
import type { ViewportKeyframe, ViewportKeyframeRow } from '@/features/instruction';

interface UsePlaybackViewportProps {
  /** Viewport keyframes for the video (per-Video, not per-Section) */
  viewportKeyframes: ViewportKeyframeRow[];
  /** Whether playback mode is active (enables viewport interpolation) */
  isPlaying?: boolean;
  /** Video aspect ratio (width/height) for calculating true square default */
  videoAspectRatio?: number;
}

interface PlaybackViewportResult {
  /** CSS transform style to apply to the video */
  viewportStyle: CSSProperties | undefined;
  /** The current interpolated viewport (always defined, uses default if no keyframes) */
  currentViewport: ViewportKeyframe;
  /** Whether custom viewport keyframes exist (vs using default) */
  hasViewport: boolean;
}

/**
 * Hook to calculate viewport interpolation during video playback.
 *
 * SIMPLIFIED: Uses per-Video keyframes with absolute frame numbers.
 * No inheritance or section-based logic needed.
 *
 * Features:
 * - Linear interpolation between keyframes
 * - Applies viewport style only when playing
 */
export function usePlaybackViewport({
  viewportKeyframes,
  isPlaying = false,
  videoAspectRatio,
}: UsePlaybackViewportProps): PlaybackViewportResult {
  const { currentFrame } = useVideo();

  // Use video-wide interpolation
  const { viewport, style, hasViewport } = useVideoViewportInterpolation({
    currentFrame,
    viewportKeyframes,
    videoAspectRatio,
  });

  return {
    // Only apply viewport style when playing and there are viewports defined
    viewportStyle: isPlaying && hasViewport ? style : undefined,
    currentViewport: viewport,
    hasViewport,
  };
}
