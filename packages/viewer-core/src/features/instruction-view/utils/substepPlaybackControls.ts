export type CardSpeed = 0.5 | 1 | 2;

/** Skip duration in seconds for the -5s / +5s buttons. */
export const SKIP_SECONDS = 5;

export function toggleCardSpeed(current: CardSpeed, target: 0.5 | 2): CardSpeed {
  return current === target ? 1 : target;
}

/**
 * Given a percentage (0–1) along the progress bar, compute the absolute
 * video `currentTime` (in seconds) across one or more sections.
 */
export function computeSeekTime(
  pct: number,
  sections: ReadonlyArray<{ startFrame: number; endFrame: number }>,
  fps: number,
): number {
  const totalDuration = sections.reduce((sum, s) => sum + (s.endFrame - s.startFrame) / fps, 0);
  const targetElapsed = pct * totalDuration;

  let accumulated = 0;
  for (const sec of sections) {
    const secDur = (sec.endFrame - sec.startFrame) / fps;
    if (accumulated + secDur >= targetElapsed) {
      const offset = targetElapsed - accumulated;
      return sec.startFrame / fps + offset;
    }
    accumulated += secDur;
  }

  // Fallback: end of last section
  const last = sections[sections.length - 1];
  return last.endFrame / fps;
}

/**
 * Compute the new time after skipping by `deltaSec`,
 * clamped to [sectionStartSec, sectionEndSec].
 */
export function computeSkipTime(
  currentTime: number,
  deltaSec: number,
  sectionStartSec: number,
  sectionEndSec: number,
): number {
  return Math.min(Math.max(currentTime + deltaSec, sectionStartSec), sectionEndSec);
}
