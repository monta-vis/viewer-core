/**
 * Store for configurable frame jump mode.
 * Used by Stream Deck dial, +/- shortcuts, and Timeline buttons.
 *
 * Jump modes:
 * - 1: 1 frame
 * - 10: 10 frames
 * - 'fps': 1 second (uses current video fps)
 */
import { create } from 'zustand';

export type FrameJumpMode = 1 | 10 | 'fps';

interface FrameJumpState {
  /** Current jump mode: 1 frame, 10 frames, or 1 second (fps) */
  jumpMode: FrameJumpMode;
  /** Cycle through jump modes: 1 → 10 → fps → 1 */
  cycleJumpMode: () => void;
  /** Set specific jump mode */
  setJumpMode: (mode: FrameJumpMode) => void;
}

const JUMP_MODES: FrameJumpMode[] = [1, 10, 'fps'];

export const useFrameJumpStore = create<FrameJumpState>((set) => ({
  jumpMode: 1,

  cycleJumpMode: () =>
    set((state) => {
      const currentIndex = JUMP_MODES.indexOf(state.jumpMode);
      const nextIndex = (currentIndex + 1) % JUMP_MODES.length;
      return { jumpMode: JUMP_MODES[nextIndex] };
    }),

  setJumpMode: (mode) => set({ jumpMode: mode }),
}));

/** Helper to get actual frame count from jump mode */
export function getJumpFrames(mode: FrameJumpMode, fps: number): number {
  if (mode === 'fps') return Math.round(fps);
  return mode;
}
