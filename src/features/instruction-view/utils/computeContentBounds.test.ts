import { describe, it, expect } from 'vitest';
import { computeContentBounds } from './computeContentBounds';

describe('computeContentBounds', () => {
  it('returns full bounds for 1:1 image in square container', () => {
    const result = computeContentBounds(400, 400, 500, 500);
    expect(result).toEqual({ x: 0, y: 0, width: 100, height: 100 });
  });

  it('returns vertical offset for 16:9 image in square container', () => {
    const result = computeContentBounds(400, 400, 1920, 1080);
    // 16:9 image fills width, letterboxed vertically
    // Rendered height = 400 / (1920/1080) = 225
    // Offset = (400 - 225) / 2 = 87.5 → as % = 87.5/400*100 = 21.875
    // Height as % = 225/400*100 = 56.25
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(21.875);
    expect(result.width).toBeCloseTo(100);
    expect(result.height).toBeCloseTo(56.25);
  });

  it('returns horizontal offset for 9:16 image in square container', () => {
    const result = computeContentBounds(400, 400, 1080, 1920);
    // 9:16 image fills height, letterboxed horizontally
    // Rendered width = 400 * (1080/1920) = 225
    // Offset = (400 - 225) / 2 = 87.5 → as % = 87.5/400*100 = 21.875
    // Width as % = 225/400*100 = 56.25
    expect(result.x).toBeCloseTo(21.875);
    expect(result.y).toBeCloseTo(0);
    expect(result.width).toBeCloseTo(56.25);
    expect(result.height).toBeCloseTo(100);
  });

  it('returns null when container has zero dimensions', () => {
    expect(computeContentBounds(0, 0, 100, 100)).toBeNull();
  });

  it('returns null when content has zero dimensions', () => {
    expect(computeContentBounds(400, 400, 0, 0)).toBeNull();
  });
});
