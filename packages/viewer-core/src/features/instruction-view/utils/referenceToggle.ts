import type { ReferenceTargetResult } from './resolveReferenceTargets';

export interface ActiveReference {
  sourceSubstepId: string;
  targetSubstepIds: string[];
  isSameStep: boolean;
}

/**
 * Pure toggle logic for reference clicks.
 * - Click same source → toggle OFF (null)
 * - Click different source → switch to new reference
 * - Empty targets → null
 */
export function computeReferenceToggle(
  current: ActiveReference | null,
  sourceSubstepId: string,
  resolvedTargets: ReferenceTargetResult,
): ActiveReference | null {
  if (resolvedTargets.substepIds.length === 0) return null;

  // Toggle OFF if clicking same source
  if (current?.sourceSubstepId === sourceSubstepId) return null;

  return {
    sourceSubstepId,
    targetSubstepIds: resolvedTargets.substepIds,
    isSameStep: resolvedTargets.isSameStep,
  };
}
