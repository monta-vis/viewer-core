import type { InstructionData } from '../types/data';

export interface VariantExcludedIds {
  excludedAssemblyIds: Set<string>;
  excludedStepIds: Set<string>;
  excludedSubstepIds: Set<string>;
}

const EMPTY_RESULT: Readonly<VariantExcludedIds> = Object.freeze({
  excludedAssemblyIds: Object.freeze(new Set<string>()),
  excludedStepIds: Object.freeze(new Set<string>()),
  excludedSubstepIds: Object.freeze(new Set<string>()),
});

/**
 * Resolve all excluded entity IDs for a given variant.
 *
 * Cascade rules (resolved at read time, not stored):
 * - Excluding an assembly → excludes all its steps and their substeps
 * - Excluding a step → excludes all its substeps
 * - Excluding a substep → only that substep (no upward cascade)
 *
 * Returns empty sets when variantId is null (= "show everything").
 */
export function getVariantExcludedIds(
  data: InstructionData,
  variantId: string | null,
): VariantExcludedIds {
  if (variantId === null) return EMPTY_RESULT;

  const excludedAssemblyIds = new Set<string>();
  const excludedStepIds = new Set<string>();
  const excludedSubstepIds = new Set<string>();

  // Collect direct exclusions for the given variant
  for (const exclusion of Object.values(data.variantExclusions)) {
    if (exclusion.variantId !== variantId) continue;

    switch (exclusion.entityType) {
      case 'assembly':
        excludedAssemblyIds.add(exclusion.entityId);
        break;
      case 'step':
        excludedStepIds.add(exclusion.entityId);
        break;
      case 'substep':
        excludedSubstepIds.add(exclusion.entityId);
        break;
    }
  }

  // Cascade: assembly → steps → substeps
  for (const assemblyId of excludedAssemblyIds) {
    const assembly = data.assemblies[assemblyId];
    if (!assembly) continue;
    for (const stepId of assembly.stepIds) {
      excludedStepIds.add(stepId);
    }
  }

  // Cascade: step → substeps
  for (const stepId of excludedStepIds) {
    const step = data.steps[stepId];
    if (!step) continue;
    for (const substepId of step.substepIds) {
      excludedSubstepIds.add(substepId);
    }
  }

  return { excludedAssemblyIds, excludedStepIds, excludedSubstepIds };
}
