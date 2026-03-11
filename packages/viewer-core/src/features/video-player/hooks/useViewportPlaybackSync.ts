import { useCallback, useEffect, useMemo, useRef, type RefObject } from 'react';

import type { ViewportKeyframeRow } from '@/features/instruction';
import { applyViewportTransformToElement } from './useViewportInterpolation';

export interface ViewportPlaybackSyncConfig {
  videoRef: RefObject<HTMLVideoElement | null>;
  viewportKeyframes: ViewportKeyframeRow[];
  videoAspectRatio: number;
  fps: number;
  /** When true, runs standalone rAF loop (for viewport-only playback without sections) */
  continuousSync?: boolean;
}

export interface ViewportPlaybackSyncReturn {
  /** Apply viewport transform at a specific frame number */
  applyAtFrame: (frame: number) => void;
  /** Apply viewport transform using video.currentTime */
  applyAtCurrentTime: () => void;
  /** Whether any viewport keyframes exist */
  hasViewport: boolean;
}

/**
 * Wraps applyViewportTransformToElement into stable callbacks.
 * Applies initial viewport on mount.
 * Optional continuousSync for standalone rAF loop (viewport-only, no sections).
 */
export function useViewportPlaybackSync(config: ViewportPlaybackSyncConfig): ViewportPlaybackSyncReturn {
  const { videoRef, viewportKeyframes, videoAspectRatio, fps, continuousSync } = config;

  const hasViewport = viewportKeyframes.length > 0;

  // Stable refs for rAF loop to avoid stale closures
  const configRef = useRef(config);
  configRef.current = config;

  const applyAtFrame = useCallback((frame: number) => {
    const video = videoRef.current;
    if (!video || !hasViewport) return;
    applyViewportTransformToElement(video, frame, viewportKeyframes, videoAspectRatio);
  }, [videoRef, hasViewport, viewportKeyframes, videoAspectRatio]);

  const applyAtCurrentTime = useCallback(() => {
    const video = videoRef.current;
    if (!video || !hasViewport) return;
    const frame = Math.round(video.currentTime * fps);
    applyViewportTransformToElement(video, frame, viewportKeyframes, videoAspectRatio);
  }, [videoRef, hasViewport, fps, viewportKeyframes, videoAspectRatio]);

  // Apply initial viewport on mount + when keyframes change
  useEffect(() => {
    if (!hasViewport) return;
    const video = videoRef.current;
    if (!video) return;
    const frame = Math.round(video.currentTime * fps);
    applyViewportTransformToElement(video, frame, viewportKeyframes, videoAspectRatio);
  }, [videoRef, hasViewport, viewportKeyframes, videoAspectRatio, fps]);

  // Continuous rAF sync (for viewport-only playback without section loop)
  useEffect(() => {
    if (!continuousSync || !hasViewport) return;
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    let rafId = requestAnimationFrame(function tick() {
      if (cancelled) return;
      const { viewportKeyframes: kf, videoAspectRatio: ar, fps: f } = configRef.current;
      const frame = Math.round(video.currentTime * f);
      applyViewportTransformToElement(video, frame, kf, ar);
      rafId = requestAnimationFrame(tick);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [continuousSync, hasViewport, videoRef]);

  return useMemo(
    () => ({ applyAtFrame, applyAtCurrentTime, hasViewport }),
    [applyAtFrame, applyAtCurrentTime, hasViewport],
  );
}
