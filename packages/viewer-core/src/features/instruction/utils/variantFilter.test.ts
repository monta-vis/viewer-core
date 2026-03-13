import { describe, it, expect } from 'vitest';
import { getVariantExcludedIds } from './variantFilter';
import type { InstructionData } from '../types/data';

/** Minimal InstructionData with only the fields needed by variantFilter */
function createTestData(overrides: Partial<InstructionData> = {}): InstructionData {
  return {
    instructionId: 'inst-1',
    instructionName: 'Test',
    instructionDescription: null,
    instructionPreviewImageId: null,
    coverImageAreaId: null,
    articleNumber: null,
    estimatedDuration: null,
    sourceLanguage: 'en',
    useBlurred: false,
    currentVersionId: 'v1',
    liteSubstepLimit: null,
    assemblies: {},
    steps: {},
    substeps: {},
    videos: {},
    videoSections: {},
    videoFrameAreas: {},
    viewportKeyframes: {},
    partTools: {},
    notes: {},
    substepImages: {},
    substepPartTools: {},
    substepNotes: {},
    substepDescriptions: {},
    substepVideoSections: {},
    partToolVideoFrameAreas: {},
    drawings: {},
    substepTutorials: {},
    safetyIcons: {},
    variants: {},
    variantExclusions: {},
    ...overrides,
  };
}

describe('getVariantExcludedIds', () => {
  it('returns empty sets when variantId is null', () => {
    const data = createTestData({
      variants: {
        'v1': { id: 'v1', versionId: '', instructionId: 'inst-1', title: 'Basic', description: null, order: 0, videoFrameAreaId: null },
      },
      variantExclusions: {
        'ex1': { id: 'ex1', versionId: '', variantId: 'v1', entityType: 'assembly', entityId: 'a1' },
      },
    });

    const result = getVariantExcludedIds(data, null);
    expect(result.excludedAssemblyIds.size).toBe(0);
    expect(result.excludedStepIds.size).toBe(0);
    expect(result.excludedSubstepIds.size).toBe(0);
  });

  it('cascades assembly exclusion to its steps and substeps', () => {
    const data = createTestData({
      assemblies: {
        'a1': { id: 'a1', versionId: '', instructionId: 'inst-1', title: 'Assembly 1', description: null, order: 0, videoFrameAreaId: null, stepIds: ['s1', 's2'] },
      },
      steps: {
        's1': { id: 's1', versionId: '', instructionId: 'inst-1', assemblyId: 'a1', stepNumber: 1, title: 'Step 1', description: null, repeatCount: 1, repeatLabel: null, videoFrameAreaId: null, substepIds: ['ss1'] },
        's2': { id: 's2', versionId: '', instructionId: 'inst-1', assemblyId: 'a1', stepNumber: 2, title: 'Step 2', description: null, repeatCount: 1, repeatLabel: null, videoFrameAreaId: null, substepIds: ['ss2', 'ss3'] },
        's3': { id: 's3', versionId: '', instructionId: 'inst-1', assemblyId: null, stepNumber: 3, title: 'Step 3', description: null, repeatCount: 1, repeatLabel: null, videoFrameAreaId: null, substepIds: ['ss4'] },
      },
      substeps: {
        'ss1': { id: 'ss1', versionId: '', stepId: 's1', stepOrder: 1, creationOrder: 1, title: null, description: null, displayMode: 'normal', repeatCount: 1, repeatLabel: null, repeatVideoFrameAreaId: null, imageRowIds: [], videoSectionRowIds: [], partToolRowIds: [], noteRowIds: [], descriptionRowIds: [], tutorialRowIds: [] },
        'ss2': { id: 'ss2', versionId: '', stepId: 's2', stepOrder: 1, creationOrder: 2, title: null, description: null, displayMode: 'normal', repeatCount: 1, repeatLabel: null, repeatVideoFrameAreaId: null, imageRowIds: [], videoSectionRowIds: [], partToolRowIds: [], noteRowIds: [], descriptionRowIds: [], tutorialRowIds: [] },
        'ss3': { id: 'ss3', versionId: '', stepId: 's2', stepOrder: 2, creationOrder: 3, title: null, description: null, displayMode: 'normal', repeatCount: 1, repeatLabel: null, repeatVideoFrameAreaId: null, imageRowIds: [], videoSectionRowIds: [], partToolRowIds: [], noteRowIds: [], descriptionRowIds: [], tutorialRowIds: [] },
        'ss4': { id: 'ss4', versionId: '', stepId: 's3', stepOrder: 1, creationOrder: 4, title: null, description: null, displayMode: 'normal', repeatCount: 1, repeatLabel: null, repeatVideoFrameAreaId: null, imageRowIds: [], videoSectionRowIds: [], partToolRowIds: [], noteRowIds: [], descriptionRowIds: [], tutorialRowIds: [] },
      },
      variants: {
        'var1': { id: 'var1', versionId: '', instructionId: 'inst-1', title: 'Basic', description: null, order: 0, videoFrameAreaId: null },
      },
      variantExclusions: {
        'ex1': { id: 'ex1', versionId: '', variantId: 'var1', entityType: 'assembly', entityId: 'a1' },
      },
    });

    const result = getVariantExcludedIds(data, 'var1');
    expect(result.excludedAssemblyIds).toEqual(new Set(['a1']));
    expect(result.excludedStepIds).toEqual(new Set(['s1', 's2']));
    expect(result.excludedSubstepIds).toEqual(new Set(['ss1', 'ss2', 'ss3']));
  });

  it('cascades step exclusion to its substeps', () => {
    const data = createTestData({
      steps: {
        's1': { id: 's1', versionId: '', instructionId: 'inst-1', assemblyId: null, stepNumber: 1, title: 'Step 1', description: null, repeatCount: 1, repeatLabel: null, videoFrameAreaId: null, substepIds: ['ss1', 'ss2'] },
      },
      substeps: {
        'ss1': { id: 'ss1', versionId: '', stepId: 's1', stepOrder: 1, creationOrder: 1, title: null, description: null, displayMode: 'normal', repeatCount: 1, repeatLabel: null, repeatVideoFrameAreaId: null, imageRowIds: [], videoSectionRowIds: [], partToolRowIds: [], noteRowIds: [], descriptionRowIds: [], tutorialRowIds: [] },
        'ss2': { id: 'ss2', versionId: '', stepId: 's1', stepOrder: 2, creationOrder: 2, title: null, description: null, displayMode: 'normal', repeatCount: 1, repeatLabel: null, repeatVideoFrameAreaId: null, imageRowIds: [], videoSectionRowIds: [], partToolRowIds: [], noteRowIds: [], descriptionRowIds: [], tutorialRowIds: [] },
      },
      variants: {
        'var1': { id: 'var1', versionId: '', instructionId: 'inst-1', title: 'Basic', description: null, order: 0, videoFrameAreaId: null },
      },
      variantExclusions: {
        'ex1': { id: 'ex1', versionId: '', variantId: 'var1', entityType: 'step', entityId: 's1' },
      },
    });

    const result = getVariantExcludedIds(data, 'var1');
    expect(result.excludedAssemblyIds.size).toBe(0);
    expect(result.excludedStepIds).toEqual(new Set(['s1']));
    expect(result.excludedSubstepIds).toEqual(new Set(['ss1', 'ss2']));
  });

  it('does not cascade substep exclusion upward', () => {
    const data = createTestData({
      steps: {
        's1': { id: 's1', versionId: '', instructionId: 'inst-1', assemblyId: null, stepNumber: 1, title: 'Step 1', description: null, repeatCount: 1, repeatLabel: null, videoFrameAreaId: null, substepIds: ['ss1', 'ss2'] },
      },
      substeps: {
        'ss1': { id: 'ss1', versionId: '', stepId: 's1', stepOrder: 1, creationOrder: 1, title: null, description: null, displayMode: 'normal', repeatCount: 1, repeatLabel: null, repeatVideoFrameAreaId: null, imageRowIds: [], videoSectionRowIds: [], partToolRowIds: [], noteRowIds: [], descriptionRowIds: [], tutorialRowIds: [] },
        'ss2': { id: 'ss2', versionId: '', stepId: 's1', stepOrder: 2, creationOrder: 2, title: null, description: null, displayMode: 'normal', repeatCount: 1, repeatLabel: null, repeatVideoFrameAreaId: null, imageRowIds: [], videoSectionRowIds: [], partToolRowIds: [], noteRowIds: [], descriptionRowIds: [], tutorialRowIds: [] },
      },
      variants: {
        'var1': { id: 'var1', versionId: '', instructionId: 'inst-1', title: 'Basic', description: null, order: 0, videoFrameAreaId: null },
      },
      variantExclusions: {
        'ex1': { id: 'ex1', versionId: '', variantId: 'var1', entityType: 'substep', entityId: 'ss1' },
      },
    });

    const result = getVariantExcludedIds(data, 'var1');
    expect(result.excludedAssemblyIds.size).toBe(0);
    expect(result.excludedStepIds.size).toBe(0);
    expect(result.excludedSubstepIds).toEqual(new Set(['ss1']));
  });

  it('combines mixed exclusions correctly', () => {
    const data = createTestData({
      assemblies: {
        'a1': { id: 'a1', versionId: '', instructionId: 'inst-1', title: 'Assembly 1', description: null, order: 0, videoFrameAreaId: null, stepIds: ['s1'] },
      },
      steps: {
        's1': { id: 's1', versionId: '', instructionId: 'inst-1', assemblyId: 'a1', stepNumber: 1, title: 'Step 1', description: null, repeatCount: 1, repeatLabel: null, videoFrameAreaId: null, substepIds: ['ss1'] },
        's2': { id: 's2', versionId: '', instructionId: 'inst-1', assemblyId: null, stepNumber: 2, title: 'Step 2', description: null, repeatCount: 1, repeatLabel: null, videoFrameAreaId: null, substepIds: ['ss2', 'ss3'] },
      },
      substeps: {
        'ss1': { id: 'ss1', versionId: '', stepId: 's1', stepOrder: 1, creationOrder: 1, title: null, description: null, displayMode: 'normal', repeatCount: 1, repeatLabel: null, repeatVideoFrameAreaId: null, imageRowIds: [], videoSectionRowIds: [], partToolRowIds: [], noteRowIds: [], descriptionRowIds: [], tutorialRowIds: [] },
        'ss2': { id: 'ss2', versionId: '', stepId: 's2', stepOrder: 1, creationOrder: 2, title: null, description: null, displayMode: 'normal', repeatCount: 1, repeatLabel: null, repeatVideoFrameAreaId: null, imageRowIds: [], videoSectionRowIds: [], partToolRowIds: [], noteRowIds: [], descriptionRowIds: [], tutorialRowIds: [] },
        'ss3': { id: 'ss3', versionId: '', stepId: 's2', stepOrder: 2, creationOrder: 3, title: null, description: null, displayMode: 'normal', repeatCount: 1, repeatLabel: null, repeatVideoFrameAreaId: null, imageRowIds: [], videoSectionRowIds: [], partToolRowIds: [], noteRowIds: [], descriptionRowIds: [], tutorialRowIds: [] },
      },
      variants: {
        'var1': { id: 'var1', versionId: '', instructionId: 'inst-1', title: 'Mixed', description: null, order: 0, videoFrameAreaId: null },
      },
      variantExclusions: {
        'ex1': { id: 'ex1', versionId: '', variantId: 'var1', entityType: 'assembly', entityId: 'a1' },
        'ex2': { id: 'ex2', versionId: '', variantId: 'var1', entityType: 'substep', entityId: 'ss3' },
      },
    });

    const result = getVariantExcludedIds(data, 'var1');
    // Assembly exclusion cascades to s1 → ss1
    expect(result.excludedAssemblyIds).toEqual(new Set(['a1']));
    expect(result.excludedStepIds).toEqual(new Set(['s1']));
    // ss1 from assembly cascade + ss3 from direct substep exclusion
    expect(result.excludedSubstepIds).toEqual(new Set(['ss1', 'ss3']));
  });

  it('returns empty sets for a non-existent variant ID', () => {
    const data = createTestData({
      variantExclusions: {
        'ex1': { id: 'ex1', versionId: '', variantId: 'var1', entityType: 'step', entityId: 's1' },
      },
    });

    const result = getVariantExcludedIds(data, 'non-existent');
    expect(result.excludedAssemblyIds.size).toBe(0);
    expect(result.excludedStepIds.size).toBe(0);
    expect(result.excludedSubstepIds.size).toBe(0);
  });
});
