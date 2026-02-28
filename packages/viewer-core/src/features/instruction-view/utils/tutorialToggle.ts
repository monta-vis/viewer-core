import type { TutorialTargetResult } from './resolveTutorialTargets';

export interface ActiveTutorial {
  sourceSubstepId: string;
  targetSubstepIds: string[];
  isSameStep: boolean;
}

/**
 * Pure toggle logic for tutorial clicks.
 * - Click same source → toggle OFF (null)
 * - Click different source → switch to new reference
 * - Empty targets → null
 */
export function computeTutorialToggle(
  current: ActiveTutorial | null,
  sourceSubstepId: string,
  resolvedTargets: TutorialTargetResult,
): ActiveTutorial | null {
  if (resolvedTargets.substepIds.length === 0) return null;

  // Toggle OFF if clicking same source
  if (current?.sourceSubstepId === sourceSubstepId) return null;

  return {
    sourceSubstepId,
    targetSubstepIds: resolvedTargets.substepIds,
    isSameStep: resolvedTargets.isSameStep,
  };
}
