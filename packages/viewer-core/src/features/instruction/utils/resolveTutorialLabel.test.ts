import { describe, it, expect } from 'vitest';
import { resolveTutorialLabel, formatTutorialDisplay } from './resolveTutorialLabel';
import type { Step, Substep, SubstepTutorialRow } from '../types/enriched';

function makeRef(overrides: Partial<SubstepTutorialRow> = {}): SubstepTutorialRow {
  return {
    id: 'ref-1',
    versionId: 'v1',
    substepId: 'ss-1',
    targetType: 'step',
    targetId: 'step-1',
    sourceInstructionId: null,
    order: 0,
    sourceLanguage: null,
    kind: 'see',
    ...overrides,
  };
}

const steps: Record<string, Step> = {
  'step-1': {
    id: 'step-1', versionId: 'v1', instructionId: 'i1', assemblyId: null,
    stepNumber: 3, title: 'Drilling', description: null, substepIds: ['ss-1', 'ss-2'],
    repeatCount: 1, repeatLabel: null,
  },
  'step-2': {
    id: 'step-2', versionId: 'v1', instructionId: 'i1', assemblyId: null,
    stepNumber: 5, title: null, description: null, substepIds: [],
    repeatCount: 1, repeatLabel: null,
  },
};

const substeps: Record<string, Substep> = {
  'ss-1': {
    id: 'ss-1', versionId: 'v1', stepId: 'step-1', stepOrder: 2, creationOrder: 1,
    title: 'Insert screw', description: null, displayMode: 'normal',
    repeatCount: 1, repeatLabel: null,
    imageRowIds: [], videoSectionRowIds: [], partToolRowIds: [],
    noteRowIds: [], descriptionRowIds: [], tutorialRowIds: [],
  },
  'ss-2': {
    id: 'ss-2', versionId: 'v1', stepId: 'step-1', stepOrder: 7, creationOrder: 2,
    title: null, description: null, displayMode: 'normal',
    repeatCount: 1, repeatLabel: null,
    imageRowIds: [], videoSectionRowIds: [], partToolRowIds: [],
    noteRowIds: [], descriptionRowIds: [], tutorialRowIds: [],
  },
};

describe('resolveTutorialLabel', () => {
  it('returns step title when available', () => {
    const ref = makeRef({ targetType: 'step', targetId: 'step-1' });
    expect(resolveTutorialLabel(ref, steps, substeps)).toBe('Drilling');
  });

  it('returns "Step N" fallback when step has no title', () => {
    const ref = makeRef({ targetType: 'step', targetId: 'step-2' });
    expect(resolveTutorialLabel(ref, steps, substeps)).toBe('Step 5');
  });

  it('returns Step X.Y with title when substep has parent step', () => {
    const ref = makeRef({ targetType: 'substep', targetId: 'ss-1' });
    expect(resolveTutorialLabel(ref, steps, substeps)).toBe('Step 3.1 – Insert screw');
  });

  it('returns Step X.Y for substep without title', () => {
    const ref = makeRef({ targetType: 'substep', targetId: 'ss-2' });
    expect(resolveTutorialLabel(ref, steps, substeps)).toBe('Step 3.2');
  });

  it('falls back to "Substep N" when stepId is null', () => {
    const orphanSubsteps: Record<string, Substep> = {
      'ss-orphan': {
        id: 'ss-orphan', versionId: 'v1', stepId: null as unknown as string, stepOrder: 5, creationOrder: 1,
        title: null, description: null, displayMode: 'normal',
        repeatCount: 1, repeatLabel: null,
        imageRowIds: [], videoSectionRowIds: [], partToolRowIds: [],
        noteRowIds: [], descriptionRowIds: [], tutorialRowIds: [],
      },
    };
    const ref = makeRef({ targetType: 'substep', targetId: 'ss-orphan' });
    expect(resolveTutorialLabel(ref, steps, orphanSubsteps)).toBe('Substep 5');
  });

  it('handles missing/deleted step target', () => {
    const ref = makeRef({ targetType: 'step', targetId: 'deleted-id' });
    expect(resolveTutorialLabel(ref, steps, substeps)).toBe('Step [deleted]');
  });

  it('handles missing/deleted substep target', () => {
    const ref = makeRef({ targetType: 'substep', targetId: 'deleted-id' });
    expect(resolveTutorialLabel(ref, steps, substeps)).toBe('Substep [deleted]');
  });
});

describe('formatTutorialDisplay', () => {
  it('returns plain label (no repeat info on references)', () => {
    const ref = makeRef({ targetType: 'step', targetId: 'step-1' });
    expect(formatTutorialDisplay(ref, steps, substeps)).toBe('Drilling');
  });

  it('returns substep label', () => {
    const ref = makeRef({ targetType: 'substep', targetId: 'ss-2' });
    expect(formatTutorialDisplay(ref, steps, substeps)).toBe('Step 3.2');
  });
});
