import type { InstructionData, Substep } from '@/features/instruction';
import { sortSubstepsByVideoFrame, buildSortData } from '@/features/instruction';

/**
 * Returns substeps with `stepId === null` (unassigned), sorted by video order + frame.
 */
export function getUnassignedSubsteps(data: InstructionData): Substep[] {
  return sortSubstepsByVideoFrame(
    Object.values(data.substeps).filter((s) => s.stepId === null),
    buildSortData(data),
  );
}
