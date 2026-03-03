/**
 * Match-terms based search for catalog entries.
 * Counts how many matchTerms appear as substrings in the input (bidirectional).
 * Higher match count + longer matches = higher score.
 */

export interface MatchableEntry {
  id: string;
  matchTerms?: string[];
}

export interface MatchResult<T> {
  item: T;
  score: number;
}

/**
 * Search entries by matchTerms against user input.
 * For each entry, counts how many of its matchTerms appear in the input
 * (case-insensitive, bidirectional substring check).
 * Score = matchCount * 10 + longestMatchLength.
 */
export function matchTermsSearch<T extends MatchableEntry>(
  entries: readonly T[],
  input: string,
): MatchResult<T>[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  const inputLower = trimmed.toLowerCase();
  const results: MatchResult<T>[] = [];

  for (const entry of entries) {
    if (!entry.matchTerms || entry.matchTerms.length === 0) continue;

    let matchCount = 0;
    let longestMatch = 0;

    for (const term of entry.matchTerms) {
      const termLower = term.toLowerCase();

      // Bidirectional substring: term in input OR input in term
      if (inputLower.includes(termLower) || termLower.includes(inputLower)) {
        matchCount++;
        longestMatch = Math.max(longestMatch, term.length);
      }
    }

    if (matchCount > 0) {
      results.push({ item: entry, score: matchCount * 10 + longestMatch });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
