import { describe, it, expect } from 'vitest';
import { shiftFreehandPoints } from './shiftFreehandPoints';

describe('shiftFreehandPoints', () => {
  it('shifts all points by the given delta', () => {
    const points = JSON.stringify([{ x: 10, y: 20 }, { x: 30, y: 40 }]);
    const result = shiftFreehandPoints(points, 5, -3);
    expect(JSON.parse(result!)).toEqual([{ x: 15, y: 17 }, { x: 35, y: 37 }]);
  });

  it('returns undefined for null input', () => {
    expect(shiftFreehandPoints(null, 1, 1)).toBeUndefined();
  });

  it('returns undefined for undefined input', () => {
    expect(shiftFreehandPoints(undefined, 1, 1)).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(shiftFreehandPoints('', 1, 1)).toBeUndefined();
  });

  it('returns undefined for invalid JSON', () => {
    expect(shiftFreehandPoints('not-json', 1, 1)).toBeUndefined();
  });

  it('handles zero delta (no-op shift)', () => {
    const points = JSON.stringify([{ x: 5, y: 10 }]);
    const result = shiftFreehandPoints(points, 0, 0);
    expect(JSON.parse(result!)).toEqual([{ x: 5, y: 10 }]);
  });
});
