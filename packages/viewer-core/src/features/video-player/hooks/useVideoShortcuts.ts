/**
 * Video Playback Keyboard Shortcuts Hook
 *
 * Configurable frame jump shortcuts (Stream Deck optimized):
 * - - (minus): Step back by configurable jump size
 * - + (plus/equals): Step forward by configurable jump size
 * - F: Cycle jump mode (1 → 10 → 1s)
 *
 * Note: Other shortcuts (Space, JKL, comma/period) are handled by Timeline.tsx
 */
import { useEffect, useCallback } from 'react';

import { useVideo } from '../context/VideoContext';
import { useFrameJumpStore, getJumpFrames } from '../store/frameJumpStore';

interface VideoShortcutsOptions {
  /** Whether shortcuts are enabled */
  enabled?: boolean;
}

export function useVideoShortcuts({ enabled = true }: VideoShortcutsOptions = {}) {
  const { stepFrames, pause, fps } = useVideo();
  const { jumpMode, cycleJumpMode } = useFrameJumpStore();

  // Calculate actual frame count based on mode
  const jumpFrames = getJumpFrames(jumpMode, fps || 30);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore if user is typing in an input
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Check for modifier keys
      const hasCtrlOrMeta = event.ctrlKey || event.metaKey || event.altKey;
      if (hasCtrlOrMeta) return;

      switch (event.key) {
        // === Configurable Frame Steps (Stream Deck) ===

        // - (minus): Step back by jump size
        case '-':
          event.preventDefault();
          pause();
          stepFrames(-jumpFrames);
          break;

        // + or = (plus): Step forward by jump size
        case '+':
        case '=':
          event.preventDefault();
          pause();
          stepFrames(jumpFrames);
          break;

        // F: Cycle jump mode (1 → 10 → 1s → 1)
        case 'f':
        case 'F':
          event.preventDefault();
          cycleJumpMode();
          break;
      }
    },
    [enabled, stepFrames, pause, jumpFrames, cycleJumpMode]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);

  return { jumpMode, jumpFrames, cycleJumpMode };
}
