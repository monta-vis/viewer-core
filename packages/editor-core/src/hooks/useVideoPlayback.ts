/**
 * Hook for managing video playback state.
 *
 * Provides play/pause, seek, frame stepping, and speed control
 * for an HTML5 video element.
 */

import { useState, useCallback, useEffect, useMemo, type RefObject } from 'react';

const FRAME_RATE = 30; // Assume 30fps for frame stepping
const FRAME_DURATION = 1 / FRAME_RATE;

export interface UseVideoPlaybackReturn {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackSpeed: number;
  hasError: boolean;
  togglePlay: () => Promise<void>;
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  stepFrame: (frames: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  // Internal setters for external event handling
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
}

export function useVideoPlayback(
  videoRef: RefObject<HTMLVideoElement | null>,
  src?: string,
): UseVideoPlaybackReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeedState] = useState(1);
  const [hasError, setHasError] = useState(false);

  // Sync state with video element events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      setIsPlaying(true);
      setHasError(false);
    };
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration || 0);
    const handleLoadedMetadata = () => {
      setDuration(video.duration || 0);
      setHasError(false);
    };
    const handleError = () => setHasError(true);

    // Reset error state when a new video element is attached
    setHasError(false);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('error', handleError);

    // Initialize duration if already loaded
    if (video.duration) {
      setDuration(video.duration);
    }

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('error', handleError);
    };
  }, [videoRef, src]);

  const play = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      await video.play();
    } catch (err) {
      // Ignore AbortError (play interrupted by pause/src change) and
      // NotAllowedError (autoplay blocked by browser policy)
      if (err instanceof DOMException && (err.name === 'AbortError' || err.name === 'NotAllowedError')) {
        return;
      }
      throw err;
    }
  }, [videoRef]);

  const pause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
  }, [videoRef]);

  const togglePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    // Check video.paused directly to avoid stale closure issues with isPlaying state
    if (video.paused) {
      await play();
    } else {
      pause();
    }
  }, [videoRef, play, pause]);

  const seek = useCallback(
    (time: number) => {
      const video = videoRef.current;
      if (!video) return;

      // Clamp to valid range
      const clampedTime = Math.max(0, Math.min(time, duration || video.duration || 0));
      video.currentTime = clampedTime;
      setCurrentTime(clampedTime);
    },
    [videoRef, duration],
  );

  const stepFrame = useCallback(
    (frames: number) => {
      const video = videoRef.current;
      if (!video) return;

      const newTime = video.currentTime + frames * FRAME_DURATION;
      seek(newTime);
    },
    [videoRef, seek],
  );

  const setPlaybackSpeed = useCallback(
    (speed: number) => {
      const video = videoRef.current;
      if (video) {
        video.playbackRate = speed;
      }
      setPlaybackSpeedState(speed);
    },
    [videoRef],
  );

  return useMemo(
    () => ({
      isPlaying,
      currentTime,
      duration,
      playbackSpeed,
      hasError,
      togglePlay,
      play,
      pause,
      seek,
      stepFrame,
      setPlaybackSpeed,
      setIsPlaying,
      setCurrentTime,
      setDuration,
    }),
    [isPlaying, currentTime, duration, playbackSpeed, hasError, togglePlay, play, pause, seek, stepFrame, setPlaybackSpeed],
  );
}
