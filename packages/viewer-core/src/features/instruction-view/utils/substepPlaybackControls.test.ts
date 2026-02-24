import { describe, it, expect } from 'vitest';
import { toggleCardSpeed, computeSkipTime, computeSeekTime } from './substepPlaybackControls';

describe('toggleCardSpeed', () => {
  it('toggles to target speed', () => {
    expect(toggleCardSpeed(1, 2)).toBe(2);
    expect(toggleCardSpeed(1, 0.5)).toBe(0.5);
  });
  it('toggles back to 1 when already at target', () => {
    expect(toggleCardSpeed(2, 2)).toBe(1);
    expect(toggleCardSpeed(0.5, 0.5)).toBe(1);
  });
});

describe('computeSkipTime', () => {
  const sectionStart = 10;
  const sectionEnd = 60;

  it('skips forward by delta within bounds', () => {
    expect(computeSkipTime(30, 5, sectionStart, sectionEnd)).toBe(35);
  });

  it('skips backward by delta within bounds', () => {
    expect(computeSkipTime(30, -5, sectionStart, sectionEnd)).toBe(25);
  });

  it('clamps to section start when -5s goes before start', () => {
    expect(computeSkipTime(12, -5, sectionStart, sectionEnd)).toBe(sectionStart);
  });

  it('clamps to section end when +5s goes past end', () => {
    expect(computeSkipTime(57, 5, sectionStart, sectionEnd)).toBe(sectionEnd);
  });

  it('handles skip from exactly at start', () => {
    expect(computeSkipTime(sectionStart, -5, sectionStart, sectionEnd)).toBe(sectionStart);
  });

  it('handles skip from exactly at end', () => {
    expect(computeSkipTime(sectionEnd, 5, sectionStart, sectionEnd)).toBe(sectionEnd);
  });
});

describe('computeSeekTime', () => {
  const fps = 30;

  // Single section: frames 0–300 (10s total)
  const singleSection = [{ startFrame: 0, endFrame: 300 }];

  it('seeking at 50% returns middle of total duration', () => {
    expect(computeSeekTime(0.5, singleSection, fps)).toBeCloseTo(5);
  });

  it('seeking at 0% returns start of first section', () => {
    expect(computeSeekTime(0, singleSection, fps)).toBeCloseTo(0);
  });

  it('seeking at 100% returns end of last section', () => {
    expect(computeSeekTime(1, singleSection, fps)).toBeCloseTo(10);
  });

  // Multi-section: section A frames 0–150 (5s), section B frames 300–450 (5s) → 10s total
  const multiSections = [
    { startFrame: 0, endFrame: 150 },
    { startFrame: 300, endFrame: 450 },
  ];

  it('seeking at 25% falls in first section', () => {
    // 25% of 10s = 2.5s elapsed → in section A (0–5s): currentTime = 0/30 + 2.5 = 2.5
    expect(computeSeekTime(0.25, multiSections, fps)).toBeCloseTo(2.5);
  });

  it('seeking at 75% falls in second section', () => {
    // 75% of 10s = 7.5s elapsed → 5s in A + 2.5s in B → currentTime = 300/30 + 2.5 = 12.5
    expect(computeSeekTime(0.75, multiSections, fps)).toBeCloseTo(12.5);
  });

  it('seeking at 50% falls at end of first section', () => {
    // 50% of 10s = 5s elapsed → matches end of section A (frame 150 = 5s video time)
    expect(computeSeekTime(0.5, multiSections, fps)).toBeCloseTo(5);
  });
});
