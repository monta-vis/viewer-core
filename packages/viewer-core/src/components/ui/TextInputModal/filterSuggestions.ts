import { fuzzySearch } from '../../../lib/fuzzySearch';
import type { TextInputSuggestion } from './TextInputModal';

/** Fuzzy filter across label, sublabel, and searchTerms. Returns all on empty query. */
export function filterSuggestions(
  suggestions: readonly TextInputSuggestion[],
  query: string,
): TextInputSuggestion[] {
  const q = query.trim();
  if (!q) return [...suggestions];
  return fuzzySearch(
    suggestions,
    q,
    (s) => [s.label, s.sublabel, s.searchTerms].filter(Boolean) as string[],
  ).map((m) => m.item);
}
