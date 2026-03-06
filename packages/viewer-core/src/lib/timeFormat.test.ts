import { describe, it, expect } from 'vitest';
import { formatTimecodeWithFrames } from './timeFormat';

describe('formatTimecodeWithFrames', () => {
  it('formats zero seconds', () => {
    expect(formatTimecodeWithFrames(0, 30)).toBe('00:00:00');
  });

  it('formats seconds with frames at 30fps', () => {
    expect(formatTimecodeWithFrames(61.5, 30)).toBe('01:01:15');
  });

  it('returns placeholder for NaN', () => {
    expect(formatTimecodeWithFrames(NaN, 30)).toBe('--:--:--');
  });

  it('returns placeholder for Infinity', () => {
    expect(formatTimecodeWithFrames(Infinity, 30)).toBe('--:--:--');
  });

  it('defaults to 30fps when fps is 0', () => {
    expect(formatTimecodeWithFrames(61.5, 0)).toBe('01:01:15');
  });

  it('handles over 1 hour (no hour separator)', () => {
    expect(formatTimecodeWithFrames(3661, 25)).toBe('61:01:00');
  });

  it('formats correctly at 25fps', () => {
    // 0.4s * 25fps = 10 frames
    expect(formatTimecodeWithFrames(10.4, 25)).toBe('00:10:10');
  });
});
