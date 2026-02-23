/**
 * Rich reference display formatter for reference badges.
 */
import type { Step, Substep, SubstepReferenceRow } from '../types/enriched';
import { resolveReferenceLabel } from './resolveReferenceLabel';

export interface RichReferenceDisplay {
  kind: 'see' | 'tutorial';
  label: string;
  targetId: string;
  targetType: 'step' | 'substep' | 'tutorial';
}

/**
 * Produce a structured display object for a reference.
 * Returns individual fields so the UI can render kind-specific icons and layouts.
 */
export function formatReferenceDisplayRich(
  ref: SubstepReferenceRow,
  steps: Record<string, Step>,
  substeps: Record<string, Substep>,
): RichReferenceDisplay {
  return {
    kind: ref.kind ?? 'see',
    label: ref.label || resolveReferenceLabel(ref, steps, substeps),
    targetId: ref.targetId,
    targetType: ref.targetType,
  };
}
