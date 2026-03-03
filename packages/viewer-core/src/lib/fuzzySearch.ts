/**
 * Lightweight fuzzy search utility
 * Uses a combination of substring matching and character distance scoring
 */

/** Pre-compiled word boundary regex (avoids re-creation inside hot loop) */
const WORD_BOUNDARY_RE = /[\s\-_.]/;

interface FuzzyMatch<T> {
  item: T;
  score: number;
}

/**
 * Calculate fuzzy match score between query and target string
 * Higher score = better match
 * Returns 0 if no match
 */
export function fuzzyScore(query: string, target: string): number {
  if (!query || !target) return 0;

  const queryLower = query.toLowerCase();
  const targetLower = target.toLowerCase();

  // Exact match gets highest score
  if (targetLower === queryLower) return 100;

  // Starts with query gets high score
  if (targetLower.startsWith(queryLower)) return 90;

  // Contains query as substring
  if (targetLower.includes(queryLower)) return 70;

  // Character-by-character fuzzy matching
  let score = 0;
  let queryIndex = 0;
  let consecutiveBonus = 0;
  let lastMatchIndex = -2;

  for (let i = 0; i < targetLower.length && queryIndex < queryLower.length; i++) {
    if (targetLower[i] === queryLower[queryIndex]) {
      // Base score for match
      score += 10;

      // Bonus for consecutive matches
      if (i === lastMatchIndex + 1) {
        consecutiveBonus += 5;
        score += consecutiveBonus;
      } else {
        consecutiveBonus = 0;
      }

      // Bonus for matching at word boundaries
      if (i === 0 || WORD_BOUNDARY_RE.test(target[i - 1])) {
        score += 15;
      }

      lastMatchIndex = i;
      queryIndex++;
    }
  }

  // All query characters must be found
  if (queryIndex < queryLower.length) return 0;

  // Normalize score (0-60 range for fuzzy matches)
  const maxPossibleScore = queryLower.length * 30;
  return Math.min(60, Math.round((score / maxPossibleScore) * 60));
}

/**
 * Search items with fuzzy matching
 * @param items - Array of items to search
 * @param query - Search query
 * @param getSearchFields - Function to extract searchable strings from an item
 * @param minScore - Minimum score threshold (default: 10)
 * @returns Sorted array of matching items with scores
 */
export function fuzzySearch<T>(
  items: readonly T[],
  query: string,
  getSearchFields: (item: T) => string[],
  minScore: number = 10,
): FuzzyMatch<T>[] {
  if (!query.trim()) return [];

  const results: FuzzyMatch<T>[] = [];

  for (const item of items) {
    const fields = getSearchFields(item);
    let bestScore = 0;

    for (const field of fields) {
      if (field) {
        const s = fuzzyScore(query, field);
        bestScore = Math.max(bestScore, s);
      }
    }

    if (bestScore >= minScore) {
      results.push({ item, score: bestScore });
    }
  }

  // Sort by score descending
  return results.sort((a, b) => b.score - a.score);
}
