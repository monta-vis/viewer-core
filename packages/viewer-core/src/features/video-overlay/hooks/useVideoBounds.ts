import { useState, useEffect, useCallback, useRef } from 'react';
import { useVideo } from '@/features/video-player';

/**
 * Video bounds relative to container (in pixels)
 */
export interface VideoBounds {
  /** X offset from container left edge */
  x: number;
  /** Y offset from container top edge */
  y: number;
  /** Actual video width in container */
  width: number;
  /** Actual video height in container */
  height: number;
  /** Video natural width (original resolution) */
  naturalWidth: number;
  /** Video natural height (original resolution) */
  naturalHeight: number;
  /** Video aspect ratio (width/height) */
  aspectRatio: number;
}

/**
 * Pure function to compute video bounds within a container.
 * Returns null when inputs are unavailable (caller decides whether to clear or keep existing bounds).
 */
export function computeVideoBounds(
  container: { clientWidth: number; clientHeight: number } | null,
  video: { videoWidth: number; videoHeight: number } | null,
): VideoBounds | null {
  if (!container || !video || !video.videoWidth || !video.videoHeight) {
    return null;
  }

  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;
  const videoNaturalWidth = video.videoWidth;
  const videoNaturalHeight = video.videoHeight;
  const videoAspectRatio = videoNaturalWidth / videoNaturalHeight;
  const containerAspectRatio = containerWidth / containerHeight;

  let videoWidth: number;
  let videoHeight: number;

  if (videoAspectRatio > containerAspectRatio) {
    videoWidth = containerWidth;
    videoHeight = containerWidth / videoAspectRatio;
  } else {
    videoHeight = containerHeight;
    videoWidth = containerHeight * videoAspectRatio;
  }

  const x = (containerWidth - videoWidth) / 2;
  const y = (containerHeight - videoHeight) / 2;

  return {
    x,
    y,
    width: videoWidth,
    height: videoHeight,
    naturalWidth: videoNaturalWidth,
    naturalHeight: videoNaturalHeight,
    aspectRatio: videoAspectRatio,
  };
}

/**
 * Hook to calculate video bounds within a container.
 *
 * The video uses object-fit: contain, so it's centered with letterboxing.
 * This hook calculates the actual video position and size within the container.
 */
export function useVideoBounds(containerRef: React.RefObject<HTMLElement | null>) {
  const { getVideoElement, isReady } = useVideo();
  const [bounds, setBounds] = useState<VideoBounds | null>(null);
  const rafRef = useRef<number | null>(null);

  const calculateBounds = useCallback(() => {
    const result = computeVideoBounds(containerRef.current, getVideoElement());
    if (result) setBounds(result);
    // If null → skip, keep existing bounds (avoids overlay flicker)
  }, [containerRef, getVideoElement]);

  // Recalculate on video ready and container resize
  useEffect(() => {
    if (!isReady) {
      setBounds(null);
      return;
    }

    // Initial calculation
    calculateBounds();

    // Retry once — covers race where video element exists but videoWidth is still 0
    const retryId = requestAnimationFrame(calculateBounds);

    // Observe container resize
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(calculateBounds);
    });

    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(retryId);
      resizeObserver.disconnect();
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isReady, calculateBounds, containerRef]);

  return bounds;
}
