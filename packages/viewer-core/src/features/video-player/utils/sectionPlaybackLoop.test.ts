import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  startSectionPlaybackLoop,
  type SectionPlaybackContext,
} from './sectionPlaybackLoop';

// ── Mock rAF ──

let rafCallbacks: Array<{ id: number; cb: FrameRequestCallback }> = [];
let nextRafId = 1;

function mockRaf(cb: FrameRequestCallback): number {
  const id = nextRafId++;
  rafCallbacks.push({ id, cb });
  return id;
}

function mockCancelRaf(id: number): void {
  rafCallbacks = rafCallbacks.filter((entry) => entry.id !== id);
}

/** Flush one pending rAF tick (calls the first queued callback). */
function flushRaf(): void {
  const entry = rafCallbacks.shift();
  if (entry) entry.cb(performance.now());
}

/** Flush all pending rAF ticks (up to a safety limit). */
function flushAllRaf(limit = 20): void {
  let count = 0;
  while (rafCallbacks.length > 0 && count < limit) {
    flushRaf();
    count++;
  }
}

// ── Mock HTMLVideoElement ──

function createMockVideo(overrides: Partial<HTMLVideoElement> = {}): HTMLVideoElement {
  const video = {
    currentTime: 0,
    paused: false,
    playbackRate: 1,
    pause: vi.fn(() => {
      video.paused = true;
    }),
    play: vi.fn(() => {
      video.paused = false;
      return Promise.resolve();
    }),
    ...overrides,
  } as unknown as HTMLVideoElement;
  return video;
}

beforeEach(() => {
  rafCallbacks = [];
  nextRafId = 1;
  vi.stubGlobal('requestAnimationFrame', mockRaf);
  vi.stubGlobal('cancelAnimationFrame', mockCancelRaf);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================================
// Single section
// ============================================================
describe('startSectionPlaybackLoop — single section', () => {
  it('calls onTick with correct context on each frame', () => {
    const video = createMockVideo({ currentTime: 0 });
    const onTick = vi.fn();
    const onComplete = vi.fn();

    startSectionPlaybackLoop(
      video,
      [{ startFrame: 0, endFrame: 300 }],
      30,
      onTick,
      onComplete,
    );

    // Simulate mid-section: frame 150 = 5s
    (video as { currentTime: number }).currentTime = 5;
    flushRaf();

    expect(onTick).toHaveBeenCalledWith(
      expect.objectContaining({
        frame: 150,
        sectionIndex: 0,
        totalDuration: 10, // 300 frames / 30 fps
      }),
    );
    // overallPercent should be ~50%
    const ctx = onTick.mock.calls[0][0] as SectionPlaybackContext;
    expect(ctx.overallPercent).toBeCloseTo(50, 0);
  });

  it('calls onComplete when past all sections', () => {
    const video = createMockVideo({ currentTime: 0 });
    const onTick = vi.fn();
    const onComplete = vi.fn();

    startSectionPlaybackLoop(
      video,
      [{ startFrame: 0, endFrame: 300 }],
      30,
      onTick,
      onComplete,
    );

    // Simulate past end: frame 301
    (video as { currentTime: number }).currentTime = 10.1;
    flushRaf();

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(video.pause).toHaveBeenCalled();
  });
});

// ============================================================
// Multi-section transitions
// ============================================================
describe('startSectionPlaybackLoop — multi-section', () => {
  it('transitions to next section with pause → seek → play', async () => {
    const video = createMockVideo({ currentTime: 0 });
    const onTick = vi.fn();
    const onComplete = vi.fn();

    startSectionPlaybackLoop(
      video,
      [
        { startFrame: 0, endFrame: 150 },
        { startFrame: 300, endFrame: 450 },
      ],
      30,
      onTick,
      onComplete,
    );

    // Video is at frame 150 (end of first section, outside any section)
    (video as { currentTime: number }).currentTime = 5;
    flushRaf();

    // Should pause, seek to section 2 start, and call onTick with section 2 start frame
    expect(video.pause).toHaveBeenCalled();
    expect(video.play).toHaveBeenCalled();
    expect((video as { currentTime: number }).currentTime).toBe(10); // 300/30 = 10s

    // onTick should have been called with start frame of next section
    expect(onTick).toHaveBeenCalledWith(
      expect.objectContaining({
        frame: 300,
        sectionIndex: 1,
      }),
    );
  });

  it('calls onComplete when past the last section', () => {
    const video = createMockVideo({ currentTime: 0 });
    const onTick = vi.fn();
    const onComplete = vi.fn();

    startSectionPlaybackLoop(
      video,
      [
        { startFrame: 0, endFrame: 150 },
        { startFrame: 300, endFrame: 450 },
      ],
      30,
      onTick,
      onComplete,
    );

    // Past last section end: 450/30 = 15s, so 15.1s
    (video as { currentTime: number }).currentTime = 15.1;
    flushRaf();

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(video.pause).toHaveBeenCalled();
  });
});

// ============================================================
// Overall percent computation
// ============================================================
describe('startSectionPlaybackLoop — overallPercent', () => {
  it('computes correct percent across multiple sections', () => {
    const video = createMockVideo({ currentTime: 0 });
    const onTick = vi.fn();
    const onComplete = vi.fn();

    // Two sections: 0-150 (5s) and 300-450 (5s) = 10s total
    startSectionPlaybackLoop(
      video,
      [
        { startFrame: 0, endFrame: 150 },
        { startFrame: 300, endFrame: 450 },
      ],
      30,
      onTick,
      onComplete,
    );

    // In first section, at frame 75 (2.5s into section 1)
    (video as { currentTime: number }).currentTime = 2.5;
    flushRaf();

    const ctx = onTick.mock.calls[0][0] as SectionPlaybackContext;
    // 2.5s elapsed out of 10s total = 25%
    expect(ctx.overallPercent).toBeCloseTo(25, 0);
  });
});

// ============================================================
// Cleanup
// ============================================================
describe('startSectionPlaybackLoop — cleanup', () => {
  it('cleanup function cancels rAF loop', () => {
    const video = createMockVideo({ currentTime: 0 });
    const onTick = vi.fn();
    const onComplete = vi.fn();

    const cleanup = startSectionPlaybackLoop(
      video,
      [{ startFrame: 0, endFrame: 300 }],
      30,
      onTick,
      onComplete,
    );

    cleanup();

    // After cleanup, flushing rAF should not call onTick
    (video as { currentTime: number }).currentTime = 5;
    flushAllRaf();

    expect(onTick).not.toHaveBeenCalled();
  });
});

// ============================================================
// Empty sections
// ============================================================
describe('startSectionPlaybackLoop — edge cases', () => {
  it('calls onComplete immediately for empty sections array', () => {
    const video = createMockVideo({ currentTime: 0 });
    const onTick = vi.fn();
    const onComplete = vi.fn();

    startSectionPlaybackLoop(video, [], 30, onTick, onComplete);

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onTick).not.toHaveBeenCalled();
  });

  it('waits for initial seek when currentTime is before first section', () => {
    // Simulates raw video: sections start at frame 500 (16.67s at 30fps),
    // but video.currentTime is still 0 because the async seek hasn't completed.
    const video = createMockVideo({ currentTime: 0 });
    const onTick = vi.fn();
    const onComplete = vi.fn();

    startSectionPlaybackLoop(
      video,
      [{ startFrame: 500, endFrame: 1000 }],
      30,
      onTick,
      onComplete,
    );

    // First tick: currentTime=0, section starts at 16.67s — seek pending
    flushRaf();

    // Should NOT pause, complete, or call onTick — just reschedule
    expect(video.pause).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
    expect(onTick).not.toHaveBeenCalled();
    // Should have scheduled another rAF
    expect(rafCallbacks).toHaveLength(1);

    // Second tick: seek completed, now in the section
    (video as { currentTime: number }).currentTime = 16.67;
    flushRaf();

    // Now onTick should fire with section 0
    expect(onTick).toHaveBeenCalledWith(
      expect.objectContaining({
        sectionIndex: 0,
      }),
    );
  });

  it('stops loop when video is paused externally', () => {
    const video = createMockVideo({ currentTime: 0, paused: false });
    const onTick = vi.fn();
    const onComplete = vi.fn();

    startSectionPlaybackLoop(
      video,
      [{ startFrame: 0, endFrame: 300 }],
      30,
      onTick,
      onComplete,
    );

    // Externally pause the video
    (video as { paused: boolean }).paused = true;

    flushRaf();

    // Should not call onTick when video is paused externally
    expect(onTick).not.toHaveBeenCalled();
    // Should not schedule more rAF callbacks
    expect(rafCallbacks).toHaveLength(0);
  });
});
