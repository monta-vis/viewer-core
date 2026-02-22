export type CardSpeed = 0.5 | 1 | 2;

/** Visual rewind shows ~3 frames per second of video (matching baseStep = fps/3) */
export const REWIND_STEPS_PER_SEC = 3;

export function toggleCardSpeed(current: CardSpeed, target: 0.5 | 2): CardSpeed {
  return current === target ? 1 : target;
}

export function rewindFrame(
  currentFrame: number,
  stepFrames: number,
  sectionStartFrame: number,
): number {
  return Math.max(currentFrame - stepFrames, sectionStartFrame);
}
