import { describe, it, expect } from 'vitest';
import { formatTimecode } from './trimUtils';

describe('formatTimecode', () => {
  it('formats zero seconds as 0:00', () => {
    expect(formatTimecode(0)).toBe('0:00');
  });

  it('formats seconds under a minute', () => {
    expect(formatTimecode(5)).toBe('0:05');
    expect(formatTimecode(30)).toBe('0:30');
    expect(formatTimecode(59)).toBe('0:59');
  });

  it('formats minutes and seconds', () => {
    expect(formatTimecode(60)).toBe('1:00');
    expect(formatTimecode(90)).toBe('1:30');
    expect(formatTimecode(125)).toBe('2:05');
  });

  it('formats hours', () => {
    expect(formatTimecode(3600)).toBe('1:00:00');
    expect(formatTimecode(3661)).toBe('1:01:01');
    expect(formatTimecode(7265)).toBe('2:01:05');
  });

  it('floors fractional seconds', () => {
    expect(formatTimecode(1.7)).toBe('0:01');
    expect(formatTimecode(61.9)).toBe('1:01');
  });

  it('handles showMs flag for minutes-only values', () => {
    expect(formatTimecode(65.5, true)).toBe('1:05.50');
    expect(formatTimecode(0.123, true)).toBe('0:00.12');
  });

  it('returns 0:00 for NaN', () => {
    expect(formatTimecode(NaN)).toBe('0:00');
  });

  it('returns 0:00 for Infinity', () => {
    expect(formatTimecode(Infinity)).toBe('0:00');
  });

  it('returns 0:00 for negative values', () => {
    expect(formatTimecode(-5)).toBe('0:00');
  });

  it('returns 0:00 for negative Infinity', () => {
    expect(formatTimecode(-Infinity)).toBe('0:00');
  });
});
