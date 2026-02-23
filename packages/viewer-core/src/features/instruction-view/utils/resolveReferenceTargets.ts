import type { Step, SubstepRow } from '@/features/instruction';

export interface ReferenceTargetResult {
  substepIds: string[];
  isSameStep: boolean;
}

/**
 * Resolve reference targets: determine which substeps are targeted and
 * whether they belong to the currently viewed step.
 */
export function resolveReferenceTargets(
  targetType: 'step' | 'substep' | 'tutorial',
  targetId: string,
  selectedStepId: string | null,
  steps: Record<string, Step>,
  substeps: Record<string, SubstepRow>,
): ReferenceTargetResult {
  if (targetType === 'step') {
    const targetStep = steps[targetId];
    if (!targetStep) return { substepIds: [], isSameStep: false };
    return {
      substepIds: targetStep.substepIds,
      isSameStep: targetId === selectedStepId,
    };
  }

  // targetType === 'substep'
  const targetSubstep = substeps[targetId];
  if (!targetSubstep) return { substepIds: [], isSameStep: false };
  return {
    substepIds: [targetId],
    isSameStep: targetSubstep.stepId === selectedStepId,
  };
}
