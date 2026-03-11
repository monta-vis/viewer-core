export interface SectionPlaybackContext {
  /** Current frame number (absolute, based on video.currentTime * fps) */
  frame: number;
  /** Index of the current section */
  sectionIndex: number;
  /** Overall progress 0-100 across all sections */
  overallPercent: number;
  /** Total duration of all sections in seconds */
  totalDuration: number;
}

/**
 * Start a rAF loop that enforces section boundaries during video playback.
 * Uses pause → seek → play to avoid race conditions with browser playback.
 * Returns a cleanup function.
 *
 * Caller is responsible for initial seek + play. This utility only monitors
 * and handles section transitions during ongoing playback.
 */
export function startSectionPlaybackLoop(
  video: HTMLVideoElement,
  sections: ReadonlyArray<{ startFrame: number; endFrame: number }>,
  fps: number,
  onTick: (ctx: SectionPlaybackContext) => void,
  onComplete: () => void,
): () => void {
  // Edge case: no sections → complete immediately
  if (sections.length === 0) {
    onComplete();
    return () => {};
  }

  // Pre-compute section times and cumulative elapsed durations
  const sectionTimes = sections.map((s) => ({
    startTime: s.startFrame / fps,
    endTime: s.endFrame / fps,
    startFrame: s.startFrame,
    endFrame: s.endFrame,
    duration: (s.endFrame - s.startFrame) / fps,
  }));

  const totalDuration = sectionTimes.reduce((sum, s) => sum + s.duration, 0);

  // Cumulative elapsed time before each section
  const elapsedBefore: number[] = [];
  let cumulative = 0;
  for (const s of sectionTimes) {
    elapsedBefore.push(cumulative);
    cumulative += s.duration;
  }

  let rafId = 0;
  let cancelled = false;

  function tick() {
    if (cancelled) return;

    // Video paused externally → stop requesting frames
    if (video.paused) return;

    const currentTime = video.currentTime;
    const frame = Math.round(currentTime * fps);

    // Find which section we're in
    let sectionIndex = -1;
    for (let i = 0; i < sectionTimes.length; i++) {
      const s = sectionTimes[i];
      if (currentTime >= s.startTime && currentTime < s.endTime) {
        sectionIndex = i;
        break;
      }
    }

    if (sectionIndex >= 0) {
      // In a section — compute overall percent and call onTick
      const s = sectionTimes[sectionIndex];
      const currentSectionElapsed = Math.max(0, currentTime - s.startTime);
      const totalElapsed = elapsedBefore[sectionIndex] + currentSectionElapsed;
      const overallPercent = totalDuration > 0
        ? Math.min((totalElapsed / totalDuration) * 100, 100)
        : 0;

      onTick({
        frame,
        sectionIndex,
        overallPercent,
        totalDuration,
      });

      rafId = requestAnimationFrame(tick);
      return;
    }

    // Outside all sections — find next section or complete
    const nextSectionIndex = sectionTimes.findIndex((s) => s.startTime > currentTime);

    if (nextSectionIndex === -1) {
      // Past all sections → complete
      video.pause();
      onComplete();
      return;
    }

    // Before first section: initial seek hasn't completed yet — wait
    if (nextSectionIndex === 0 && currentTime < sectionTimes[0].startTime) {
      rafId = requestAnimationFrame(tick);
      return;
    }

    // Transition to next section: pause → seek → onTick → play
    const nextSection = sectionTimes[nextSectionIndex];
    video.pause();
    video.currentTime = nextSection.startTime;

    // Call onTick with start frame for immediate viewport update
    onTick({
      frame: nextSection.startFrame,
      sectionIndex: nextSectionIndex,
      overallPercent: totalDuration > 0
        ? Math.min((elapsedBefore[nextSectionIndex] / totalDuration) * 100, 100)
        : 0,
      totalDuration,
    });

    video.play()
      .then(() => {
        if (!cancelled) {
          rafId = requestAnimationFrame(tick);
        }
      })
      .catch((err: DOMException) => {
        // AbortError: play() was interrupted (e.g., by another seek) — silently ignore
        if (err.name === 'AbortError') return;
        console.error('[sectionPlaybackLoop] play() failed during transition:', err);
        onComplete();
      });
  }

  rafId = requestAnimationFrame(tick);

  return () => {
    cancelled = true;
    cancelAnimationFrame(rafId);
  };
}
