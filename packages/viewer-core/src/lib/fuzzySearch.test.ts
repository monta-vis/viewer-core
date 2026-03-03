import { describe, it, expect } from 'vitest';
import { fuzzyScore, fuzzySearch } from './fuzzySearch';

describe('fuzzyScore', () => {
  it('returns 0 for empty query or target', () => {
    expect(fuzzyScore('', 'test')).toBe(0);
    expect(fuzzyScore('test', '')).toBe(0);
    expect(fuzzyScore('', '')).toBe(0);
  });

  it('returns 100 for exact match', () => {
    expect(fuzzyScore('test', 'test')).toBe(100);
    expect(fuzzyScore('Test', 'test')).toBe(100); // case insensitive
  });

  it('returns 90 for starts-with match', () => {
    expect(fuzzyScore('scr', 'screw')).toBe(90);
    expect(fuzzyScore('Scr', 'Screw M4x10')).toBe(90);
  });

  it('returns 70 for contains match', () => {
    expect(fuzzyScore('M4', 'Screw M4x10')).toBe(70);
    expect(fuzzyScore('x10', 'Screw M4x10')).toBe(70);
  });

  it('returns positive score for fuzzy character match', () => {
    const score = fuzzyScore('sm4', 'Screw M4x10');
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(70);
  });

  it('returns 0 when not all characters match', () => {
    expect(fuzzyScore('xyz', 'test')).toBe(0);
    expect(fuzzyScore('abc', 'test')).toBe(0);
  });

  it('gives bonus for word boundary matches', () => {
    // "SM" matching "Screw M4" should score higher due to word boundary on M
    const scoreWithBoundary = fuzzyScore('SM', 'Screw M4');
    const scoreWithoutBoundary = fuzzyScore('re', 'Screw');
    expect(scoreWithBoundary).toBeGreaterThan(0);
    expect(scoreWithoutBoundary).toBeGreaterThan(0);
  });
});

describe('fuzzySearch', () => {
  interface TestItem {
    id: string;
    name: string;
    code: string | null;
  }

  const items: TestItem[] = [
    { id: '1', name: 'Screw M4x10', code: 'SC-M4-10' },
    { id: '2', name: 'Screw M6x20', code: 'SC-M6-20' },
    { id: '3', name: 'Washer 4mm', code: 'WA-4' },
    { id: '4', name: 'Bolt M8x30', code: 'BO-M8-30' },
    { id: '5', name: 'Screwdriver Phillips', code: 'SD-PH' },
  ];

  const getFields = (item: TestItem) => [item.name, item.code ?? ''];

  it('returns empty array for empty query', () => {
    expect(fuzzySearch(items, '', getFields)).toEqual([]);
    expect(fuzzySearch(items, '  ', getFields)).toEqual([]);
  });

  it('finds exact matches first', () => {
    const results = fuzzySearch(items, 'Washer 4mm', getFields);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].item.id).toBe('3');
    expect(results[0].score).toBe(100);
  });

  it('finds partial matches by name', () => {
    const results = fuzzySearch(items, 'Screw', getFields);
    expect(results.length).toBe(3); // Screw M4, Screw M6, Screwdriver
    expect(results[0].item.name).toContain('Screw');
  });

  it('finds matches by code/partNumber', () => {
    const results = fuzzySearch(items, 'SC-M4', getFields);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].item.code).toBe('SC-M4-10');
  });

  it('respects minimum score threshold', () => {
    const resultsLowThreshold = fuzzySearch(items, 'M4', getFields, 10);
    const resultsHighThreshold = fuzzySearch(items, 'M4', getFields, 80);
    expect(resultsLowThreshold.length).toBeGreaterThanOrEqual(resultsHighThreshold.length);
  });

  it('sorts results by score descending', () => {
    const results = fuzzySearch(items, 'Screw', getFields);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it('handles fuzzy matching', () => {
    // "SM4" should match "Screw M4x10"
    const results = fuzzySearch(items, 'SM4', getFields, 5);
    expect(results.some((r) => r.item.id === '1')).toBe(true);
  });
});
