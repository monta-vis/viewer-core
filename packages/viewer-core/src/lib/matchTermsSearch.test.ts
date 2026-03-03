import { describe, it, expect } from 'vitest';
import { matchTermsSearch, type MatchableEntry } from './matchTermsSearch';

// Test catalog entries
const entries: MatchableEntry[] = [
  { id: 'din912', matchTerms: ['DIN 912', 'DIN912', 'Innensechskant', 'Innensechskantschraube', 'Socket Head Cap Screw', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M8', 'M10', 'M12', 'M16', 'M20'] },
  { id: 'din933', matchTerms: ['DIN 933', 'DIN933', 'Sechskantschraube', 'Hex Bolt', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M8', 'M10', 'M12', 'M16', 'M20'] },
  { id: 'din934', matchTerms: ['DIN 934', 'DIN934', 'Sechskantmutter', 'Hex Nut', 'Mutter', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M8', 'M10', 'M12', 'M16', 'M20'] },
  { id: 'hex-key', matchTerms: ['Innensechskantschlüssel', 'Inbus', 'hex key', 'Allen'] },
  { id: 'torx', matchTerms: ['Torx', 'T10', 'T15', 'T20', 'T25', 'T30', 'T40', 'T50'] },
  { id: 'rubber-mallet', matchTerms: ['Gummihammer', 'Rubber Mallet', 'rubber', 'mallet'] },
  { id: 'no-terms', matchTerms: undefined as unknown as string[] },
];

describe('matchTermsSearch', () => {
  it('returns empty array for empty input', () => {
    expect(matchTermsSearch(entries, '')).toEqual([]);
    expect(matchTermsSearch(entries, '   ')).toEqual([]);
  });

  it('"DIN 912" selects DIN912 entry', () => {
    const results = matchTermsSearch(entries, 'DIN 912');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].item.id).toBe('din912');
  });

  it('"M4" matches multiple screw entries', () => {
    const results = matchTermsSearch(entries, 'M4');
    const ids = results.map(r => r.item.id);
    expect(ids).toContain('din912');
    expect(ids).toContain('din933');
    expect(ids).toContain('din934');
  });

  it('"M4 Innensechskant" — DIN912 wins over DIN933', () => {
    const results = matchTermsSearch(entries, 'M4 Innensechskant');
    expect(results[0].item.id).toBe('din912');
  });

  it('"M4 Sechskantschraube" — DIN933 wins', () => {
    const results = matchTermsSearch(entries, 'M4 Sechskantschraube');
    expect(results[0].item.id).toBe('din933');
  });

  it('case-insensitive matching', () => {
    const results = matchTermsSearch(entries, 'innensechskant');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].item.id).toBe('din912');
  });

  it('entries without matchTerms are skipped', () => {
    const results = matchTermsSearch(entries, 'anything');
    const ids = results.map(r => r.item.id);
    expect(ids).not.toContain('no-terms');
  });

  it('more terms matched = higher score', () => {
    const results = matchTermsSearch(entries, 'M4 Innensechskant');
    const din912 = results.find(r => r.item.id === 'din912')!;
    const din933 = results.find(r => r.item.id === 'din933')!;
    expect(din912.score).toBeGreaterThan(din933.score);
  });

  it('"Inbus" matches hex-key (term is substring check)', () => {
    const results = matchTermsSearch(entries, 'Inbus');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].item.id).toBe('hex-key');
  });

  it('"M4 Mutter" selects nut entry (din934)', () => {
    const results = matchTermsSearch(entries, 'M4 Mutter');
    expect(results[0].item.id).toBe('din934');
  });

  it('unknown input returns empty result', () => {
    const results = matchTermsSearch(entries, 'xyzzy foobar');
    expect(results).toEqual([]);
  });
});
