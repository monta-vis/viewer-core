import { describe, it, expect } from 'vitest';
import {
  normalizeFreehandPoints,
  denormalizeFreehandPoints,
  detectAndNormalize,
} from './freehandPoints';

describe('normalizeFreehandPoints', () => {
  it('converts absolute points to bbox-relative [0-1]', () => {
    const points = [
      { x: 25, y: 35 },
      { x: 50, y: 60 },
    ];
    const result = normalizeFreehandPoints(points, 20, 30, 60, 70);
    expect(result).toEqual([
      { x: 0.125, y: 0.125 },
      { x: 0.75, y: 0.75 },
    ]);
  });

  it('handles zero-width bbox (avoids division by zero)', () => {
    const points = [{ x: 50, y: 30 }];
    const result = normalizeFreehandPoints(points, 50, 30, 50, 70);
    // width = 0, fallback to 1: (50 - 50) / 1 = 0
    expect(result[0].x).toBe(0);
    expect(result[0].y).toBe(0);
  });

  it('handles zero-height bbox (avoids division by zero)', () => {
    const points = [{ x: 30, y: 50 }];
    const result = normalizeFreehandPoints(points, 20, 50, 60, 50);
    expect(result[0].x).toBeCloseTo(0.25);
    // height = 0, fallback to 1: (50 - 50) / 1 = 0
    expect(result[0].y).toBe(0);
  });

  it('handles empty points array', () => {
    expect(normalizeFreehandPoints([], 0, 0, 100, 100)).toEqual([]);
  });
});

describe('denormalizeFreehandPoints', () => {
  it('converts bbox-relative [0-1] points to absolute coordinates', () => {
    const points = [
      { x: 0.125, y: 0.125 },
      { x: 0.75, y: 0.75 },
    ];
    const result = denormalizeFreehandPoints(points, 20, 30, 60, 70);
    expect(result[0].x).toBeCloseTo(25);
    expect(result[0].y).toBeCloseTo(35);
    expect(result[1].x).toBeCloseTo(50);
    expect(result[1].y).toBeCloseTo(60);
  });

  it('handles empty points array', () => {
    expect(denormalizeFreehandPoints([], 0, 0, 100, 100)).toEqual([]);
  });
});

describe('normalize/denormalize roundtrip', () => {
  it('roundtrips correctly', () => {
    const original = [
      { x: 25, y: 35 },
      { x: 50, y: 60 },
      { x: 40, y: 45 },
    ];
    const x1 = 20, y1 = 30, x2 = 60, y2 = 70;
    const normalized = normalizeFreehandPoints(original, x1, y1, x2, y2);
    const denormalized = denormalizeFreehandPoints(normalized, x1, y1, x2, y2);

    for (let i = 0; i < original.length; i++) {
      expect(denormalized[i].x).toBeCloseTo(original[i].x, 10);
      expect(denormalized[i].y).toBeCloseTo(original[i].y, 10);
    }
  });

  it('single point at bbox corner normalizes to (0,0)', () => {
    const result = normalizeFreehandPoints([{ x: 10, y: 20 }], 10, 20, 50, 60);
    expect(result[0]).toEqual({ x: 0, y: 0 });
  });

  it('single point at bbox opposite corner normalizes to (1,1)', () => {
    const result = normalizeFreehandPoints([{ x: 50, y: 60 }], 10, 20, 50, 60);
    expect(result[0]).toEqual({ x: 1, y: 1 });
  });
});

describe('detectAndNormalize', () => {
  it('returns points unchanged if already in [0-1] range', () => {
    const points = [
      { x: 0.1, y: 0.2 },
      { x: 0.5, y: 0.8 },
    ];
    const result = detectAndNormalize(points, 20, 30, 60, 70);
    expect(result).toEqual(points);
  });

  it('auto-converts absolute points (values > 1.5) to bbox-relative', () => {
    const points = [
      { x: 25, y: 35 },
      { x: 50, y: 60 },
    ];
    const result = detectAndNormalize(points, 20, 30, 60, 70);
    expect(result[0].x).toBeCloseTo(0.125);
    expect(result[0].y).toBeCloseTo(0.125);
    expect(result[1].x).toBeCloseTo(0.75);
    expect(result[1].y).toBeCloseTo(0.75);
  });

  it('handles empty array', () => {
    expect(detectAndNormalize([], 0, 0, 100, 100)).toEqual([]);
  });

  it('treats points with max value exactly 1.0 as already normalized', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ];
    const result = detectAndNormalize(points, 10, 10, 50, 50);
    expect(result).toEqual(points);
  });
});
