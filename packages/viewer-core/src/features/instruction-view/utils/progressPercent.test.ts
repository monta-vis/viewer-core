import { describe, it, expect } from 'vitest';
import { progressPercent } from './progressPercent';

describe('progressPercent', () => {
  it('returns 0 on the first step', () => {
    expect(progressPercent(0, 5)).toBe(0);
  });

  it('returns proportional value on middle steps', () => {
    expect(progressPercent(2, 5)).toBe(40);
    expect(progressPercent(3, 10)).toBe(30);
  });

  it('returns less than 100 on the last step', () => {
    expect(progressPercent(4, 5)).toBe(80);
    expect(progressPercent(9, 10)).toBe(90);
  });

  it('returns 0 when totalSteps is 0', () => {
    expect(progressPercent(0, 0)).toBe(0);
  });
});
