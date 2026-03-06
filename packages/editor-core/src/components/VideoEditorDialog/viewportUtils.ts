export const MIN_VIEWPORT_SIZE = 0.05;
export const VIDEO_FPS = 30;

export interface LetterboxBounds {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

/**
 * Compute the letterbox-adjusted video bounds within a container.
 * Returns the offset and size of the video area in pixels.
 */
export function computeLetterboxBounds(
  containerW: number,
  containerH: number,
  videoW: number,
  videoH: number,
): LetterboxBounds {
  if (containerW <= 0 || containerH <= 0 || videoW <= 0 || videoH <= 0) {
    return { offsetX: 0, offsetY: 0, width: 0, height: 0 };
  }

  const containerAspect = containerW / containerH;
  const videoAspect = videoW / videoH;

  let width: number;
  let height: number;

  if (videoAspect > containerAspect) {
    // Video wider than container → pillarbox (bars top/bottom)
    width = containerW;
    height = containerW / videoAspect;
  } else {
    // Video taller than container → letterbox (bars left/right)
    height = containerH;
    width = containerH * videoAspect;
  }

  return {
    offsetX: (containerW - width) / 2,
    offsetY: (containerH - height) / 2,
    width,
    height,
  };
}

/** Convert seconds to frame number (floor). */
export function timeToFrame(seconds: number, fps: number): number {
  return Math.floor(seconds * fps);
}

/** Convert frame number to seconds. */
export function frameToTime(frame: number, fps: number): number {
  return frame / fps;
}
