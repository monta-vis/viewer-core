import type { Step, Substep, SubstepReferenceRow } from '../types/enriched';

export function resolveReferenceLabel(
  ref: SubstepReferenceRow,
  steps: Record<string, Step>,
  substeps: Record<string, Substep>,
): string {
  if (ref.targetType === 'step') {
    const step = steps[ref.targetId];
    if (!step) return 'Step [deleted]';
    return step.title || `Step ${step.stepNumber}`;
  }

  // substep target
  const substep = substeps[ref.targetId];
  if (!substep) return 'Substep [deleted]';

  // Build Step X.Y notation if parent step exists
  const parentStep = substep.stepId ? steps[substep.stepId] : null;
  if (parentStep) {
    // Find 1-based position within step's substeps sorted by stepOrder
    const siblingSubsteps = parentStep.substepIds
      .map(id => substeps[id])
      .filter(Boolean)
      .sort((a, b) => a.stepOrder - b.stepOrder);
    const position = siblingSubsteps.findIndex(s => s.id === substep.id) + 1;
    const label = `Step ${parentStep.stepNumber}.${position}`;
    return substep.title ? `${label} – ${substep.title}` : label;
  }

  return substep.title || `Substep ${substep.stepOrder}`;
}

/**
 * Simple string formatter for reference display.
 * References are now pure navigation links — no repeat info.
 */
export function formatReferenceDisplay(
  ref: SubstepReferenceRow,
  steps: Record<string, Step>,
  substeps: Record<string, Substep>,
): string {
  return resolveReferenceLabel(ref, steps, substeps);
}
