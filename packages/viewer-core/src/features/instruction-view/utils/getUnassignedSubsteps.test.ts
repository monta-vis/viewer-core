import { describe, it, expect } from 'vitest';
import { getUnassignedSubsteps } from './getUnassignedSubsteps';
import type { InstructionData } from '@/features/instruction';

function makeSubstep(id: string, stepId: string | null, creationOrder: number) {
  return {
    id,
    versionId: 'v1',
    stepId,
    stepOrder: 0,
    creationOrder,
    title: null,
    description: null,
    repeatCount: 1,
    repeatLabel: null,
    imageRowIds: [],
    videoSectionRowIds: [],
    partToolRowIds: [],
    noteRowIds: [],
    descriptionRowIds: [],
    tutorialRowIds: [],
  };
}

describe('getUnassignedSubsteps', () => {
  it('returns substeps with stepId === null, sorted by creationOrder', () => {
    const data = {
      substeps: {
        s1: makeSubstep('s1', null, 3),
        s2: makeSubstep('s2', 'step-1', 0),
        s3: makeSubstep('s3', null, 1),
        s4: makeSubstep('s4', null, 2),
      },
    } as unknown as InstructionData;

    const result = getUnassignedSubsteps(data);
    expect(result.map((s) => s.id)).toEqual(['s3', 's4', 's1']);
  });

  it('returns empty array when no unassigned substeps exist', () => {
    const data = {
      substeps: {
        s1: makeSubstep('s1', 'step-1', 0),
        s2: makeSubstep('s2', 'step-2', 1),
      },
    } as unknown as InstructionData;

    expect(getUnassignedSubsteps(data)).toEqual([]);
  });
});
