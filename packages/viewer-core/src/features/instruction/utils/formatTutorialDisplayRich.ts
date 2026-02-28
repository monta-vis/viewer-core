/**
 * Rich tutorial display formatter for tutorial badges.
 */
import type { Step, Substep, SubstepTutorialRow } from '../types/enriched';
import { resolveTutorialLabel } from './resolveTutorialLabel';

export interface RichTutorialDisplay {
  kind: 'see' | 'tutorial';
  label: string;
  targetId: string;
  targetType: 'step' | 'substep' | 'tutorial';
}

/**
 * Produce a structured display object for a tutorial.
 * Returns individual fields so the UI can render kind-specific icons and layouts.
 */
export function formatTutorialDisplayRich(
  ref: SubstepTutorialRow,
  steps: Record<string, Step>,
  substeps: Record<string, Substep>,
): RichTutorialDisplay {
  return {
    kind: ref.kind ?? 'see',
    label: ref.label || resolveTutorialLabel(ref, steps, substeps),
    targetId: ref.targetId,
    targetType: ref.targetType,
  };
}
