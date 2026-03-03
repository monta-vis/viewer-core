import { describe, it, expect } from 'vitest';
import { filterSuggestions } from './filterSuggestions';
import type { TextInputSuggestion } from './TextInputModal';

const suggestions: TextInputSuggestion[] = [
  { id: 'pt-1', label: 'Steel Bolt', sublabel: 'BLT-001', searchTerms: 'fastener hex' },
  { id: 'pt-2', label: 'Aluminum Nut', sublabel: 'NUT-002' },
  { id: 'pt-3', label: 'Copper Washer' },
];

describe('filterSuggestions', () => {
  it('returns all suggestions when query is empty', () => {
    const result = filterSuggestions(suggestions, '');
    expect(result).toHaveLength(3);
    expect(result.map((s) => s.id)).toEqual(['pt-1', 'pt-2', 'pt-3']);
  });

  it('matches by label (case-insensitive)', () => {
    const result = filterSuggestions(suggestions, 'steel');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('pt-1');
  });

  it('matches by sublabel', () => {
    const result = filterSuggestions(suggestions, 'NUT-002');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('pt-2');
  });

  it('matches by searchTerms', () => {
    const result = filterSuggestions(suggestions, 'hex');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('pt-1');
  });

  it('is case-insensitive across all fields', () => {
    expect(filterSuggestions(suggestions, 'COPPER')).toHaveLength(1);
    expect(filterSuggestions(suggestions, 'blt-001')).toHaveLength(1);
    expect(filterSuggestions(suggestions, 'FASTENER')).toHaveLength(1);
  });

  it('returns empty array when nothing matches', () => {
    expect(filterSuggestions(suggestions, 'xyznonexistent')).toHaveLength(0);
  });

  it('returns a new array (not the original reference)', () => {
    const result = filterSuggestions(suggestions, '');
    expect(result).not.toBe(suggestions);
    expect(result).toEqual(suggestions);
  });
});
