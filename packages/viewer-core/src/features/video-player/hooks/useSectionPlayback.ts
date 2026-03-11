import { useEffect, useMemo, useRef, type RefObject } from 'react';

import { startSectionPlaybackLoop, type SectionPlaybackContext } from '../utils/sectionPlaybackLoop';

export interface SectionPlaybackConfig {
  videoRef: RefObject<HTMLVideoElement | null>;
  sections: ReadonlyArray<{ startFrame: number; endFrame: number }>;
  fps: number;
  /** Caller owns this state — when true, seeks and plays */
  isPlaying: boolean;
  /** Called on every rAF tick during playback */
  onTick?: (ctx: SectionPlaybackContext) => void;
  /** Called when all sections finish or video ends */
  onComplete: () => void;
  /** Called after seek but before play — set playbackRate, initial viewport, etc. */
  onBeforePlay?: (video: HTMLVideoElement, startFrame: number) => void;
}

/**
 * Playback engine lifecycle: seek → onBeforePlay → play → sectionLoop → cleanup.
 * Handles ended event as fallback. Cleans up on isPlaying=false or unmount.
 */
export function useSectionPlayback(config: SectionPlaybackConfig): void {
  const { videoRef, sections, fps, isPlaying, onTick, onComplete, onBeforePlay } = config;

  // Stable refs to avoid re-triggering the effect when callbacks change
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onBeforePlayRef = useRef(onBeforePlay);
  onBeforePlayRef.current = onBeforePlay;

  // Keep a ref so the effect always reads the latest sections without depending on identity
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;

  // Content-based key: only changes when actual frame boundaries change
  const sectionsKey = useMemo(
    () => sections.map((s) => `${s.startFrame}-${s.endFrame}`).join(','),
    [sections],
  );

  useEffect(() => {
    const currentSections = sectionsRef.current;
    if (!isPlaying || currentSections.length === 0) return;

    const video = videoRef.current;
    if (!video) return;

    const startFrame = currentSections[0].startFrame;

    // Seek to first section start
    video.currentTime = startFrame / fps;

    // Let caller set up before play (playbackRate, viewport, etc.)
    onBeforePlayRef.current?.(video, startFrame);

    // Play
    video.play().catch((err: DOMException) => {
      if (err.name === 'AbortError') return;
      console.debug('[useSectionPlayback] Video play failed:', err);
    });

    // Start section loop
    const loopCleanup = startSectionPlaybackLoop(
      video,
      currentSections,
      fps,
      (ctx) => onTickRef.current?.(ctx),
      () => onCompleteRef.current(),
    );

    // Ended event as fallback
    const handleEnded = () => onCompleteRef.current();
    video.addEventListener('ended', handleEnded);

    return () => {
      loopCleanup();
      video.removeEventListener('ended', handleEnded);
      video.pause();
    };
  }, [isPlaying, sectionsKey, fps, videoRef]);
}
