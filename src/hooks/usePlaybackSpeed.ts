import { useState, useCallback } from 'react';

export type PlaybackSpeed = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2;

const PLAYBACK_SPEED_STORAGE_KEY = 'montavis-playback-speed';

const VALID_SPEEDS: PlaybackSpeed[] = [0.5, 0.75, 1, 1.25, 1.5, 2];

function getStoredPlaybackSpeed(): PlaybackSpeed {
  if (typeof window === 'undefined') return 1;
  const stored = localStorage.getItem(PLAYBACK_SPEED_STORAGE_KEY);
  if (stored) {
    const parsed = parseFloat(stored);
    if (VALID_SPEEDS.includes(parsed as PlaybackSpeed)) {
      return parsed as PlaybackSpeed;
    }
  }
  return 1;
}

export function usePlaybackSpeed() {
  const [playbackSpeed, setPlaybackSpeedState] = useState<PlaybackSpeed>(getStoredPlaybackSpeed);

  const setPlaybackSpeed = useCallback((newSpeed: PlaybackSpeed) => {
    setPlaybackSpeedState(newSpeed);
    localStorage.setItem(PLAYBACK_SPEED_STORAGE_KEY, String(newSpeed));
  }, []);

  return {
    playbackSpeed,
    setPlaybackSpeed,
  };
}
