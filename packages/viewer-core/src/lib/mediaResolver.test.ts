import { describe, it, expect } from 'vitest';
import { sortPartToolJunctions } from './mediaResolver';

describe('sortPartToolJunctions', () => {
  it('returns empty array for empty input', () => {
    expect(sortPartToolJunctions([])).toEqual([]);
  });

  it('sorts preview images first', () => {
    const input = [
      { isPreviewImage: false, order: 0 },
      { isPreviewImage: true, order: 1 },
    ];
    const result = sortPartToolJunctions(input);
    expect(result[0].isPreviewImage).toBe(true);
    expect(result[1].isPreviewImage).toBe(false);
  });

  it('preserves order within same group', () => {
    const input = [
      { isPreviewImage: false, order: 2 },
      { isPreviewImage: false, order: 0 },
      { isPreviewImage: false, order: 1 },
    ];
    const result = sortPartToolJunctions(input);
    expect(result.map((r) => r.order)).toEqual([0, 1, 2]);
  });

  it('does not mutate original array', () => {
    const input = [
      { isPreviewImage: false, order: 1 },
      { isPreviewImage: true, order: 0 },
    ];
    const copy = [...input];
    sortPartToolJunctions(input);
    expect(input).toEqual(copy);
  });

  it('handles mixed groups correctly', () => {
    const input = [
      { isPreviewImage: false, order: 3 },
      { isPreviewImage: true, order: 2 },
      { isPreviewImage: false, order: 1 },
      { isPreviewImage: true, order: 0 },
    ];
    const result = sortPartToolJunctions(input);
    // Previews first (order 0, 2), then non-previews (order 1, 3)
    expect(result).toEqual([
      { isPreviewImage: true, order: 0 },
      { isPreviewImage: true, order: 2 },
      { isPreviewImage: false, order: 1 },
      { isPreviewImage: false, order: 3 },
    ]);
  });
});
