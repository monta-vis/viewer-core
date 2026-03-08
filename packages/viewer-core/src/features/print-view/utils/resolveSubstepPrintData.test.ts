import { describe, it, expect } from 'vitest';
import { resolveSubstepPrintData } from './resolveSubstepPrintData';
import type { InstructionData } from '@/features/instruction';

function makeData(overrides: Partial<InstructionData> = {}): InstructionData {
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
    substeps: {
      's1': {
        id: 's1', versionId: 'v1', stepId: 'step1', stepOrder: 0, creationOrder: 0,
        title: null, description: null, displayMode: 'normal', repeatCount: 1, repeatLabel: null,
        imageRowIds: ['img-1'], videoSectionRowIds: [], partToolRowIds: ['spt-1'],
        noteRowIds: ['sn-1'], descriptionRowIds: ['sd-1', 'sd-2'], tutorialRowIds: [],
      },
    },
    videos: {},
    videoSections: {},
    videoFrameAreas: {},
    viewportKeyframes: {},
    partTools: {
      'pt-1': {
        id: 'pt-1', versionId: 'v1', instructionId: 'inst-1', previewImageId: null,
        name: 'Screw', label: 'A', type: 'Part', partNumber: '12345',
        amount: 4, description: null, unit: 'pcs', material: 'steel', dimension: 'M6',
      },
    },
    notes: {
      'n-1': {
        id: 'n-1', versionId: 'v1', instructionId: 'inst-1',
        text: 'Be careful', safetyIconCategory: 'Warnzeichen', safetyIconId: 'W001.png',
      },
    },
    substepImages: {
      'img-1': { id: 'img-1', versionId: 'v1', videoFrameAreaId: 'vfa-1', substepId: 's1', order: 0 },
    },
    substepPartTools: {
      'spt-1': { id: 'spt-1', versionId: 'v1', substepId: 's1', partToolId: 'pt-1', amount: 2, order: 0 },
    },
    substepNotes: {
      'sn-1': { id: 'sn-1', versionId: 'v1', substepId: 's1', noteId: 'n-1', order: 0 },
    },
    substepDescriptions: {
      'sd-1': { id: 'sd-1', versionId: 'v1', substepId: 's1', text: 'Second step', order: 1 },
      'sd-2': { id: 'sd-2', versionId: 'v1', substepId: 's1', text: 'First step', order: 0 },
    },
    substepVideoSections: {},
    partToolVideoFrameAreas: {},
    drawings: {
      'd-1': {
        id: 'd-1', versionId: 'v1', substepImageId: 'img-1', substepId: 's1',
        startFrame: null, endFrame: null, type: 'arrow', color: 'red',
        strokeWidth: 2, x1: 0.1, y1: 0.2, x2: 0.3, y2: 0.4,
        x: null, y: null, content: null, fontSize: null, points: null, order: 0,
      },
    },
    substepTutorials: {},
    safetyIcons: {},
    ...overrides,
  } as InstructionData;
}

describe('resolveSubstepPrintData', () => {
  it('resolves image URL from first substep image', () => {
    const data = makeData();
    const result = resolveSubstepPrintData(data, 's1', 'my-folder');
    expect(result.imageUrl).toBe('mvis-media://my-folder/media/frames/vfa-1/image');
  });

  it('returns null imageUrl when substep has no images', () => {
    const data = makeData({
      substeps: {
        's1': {
          id: 's1', versionId: 'v1', stepId: 'step1', stepOrder: 0, creationOrder: 0,
          title: null, description: null, displayMode: 'normal', repeatCount: 1, repeatLabel: null,
          imageRowIds: [], videoSectionRowIds: [], partToolRowIds: [],
          noteRowIds: [], descriptionRowIds: [], tutorialRowIds: [],
        },
      },
    });
    const result = resolveSubstepPrintData(data, 's1', 'folder');
    expect(result.imageUrl).toBeNull();
  });

  it('sorts descriptions by order', () => {
    const data = makeData();
    const result = resolveSubstepPrintData(data, 's1', 'folder');
    expect(result.descriptions).toEqual(['First step', 'Second step']);
  });

  it('resolves notes with category and text', () => {
    const data = makeData();
    const result = resolveSubstepPrintData(data, 's1', 'folder');
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0].text).toBe('Be careful');
    expect(result.notes[0].safetyIconCategory).toBe('Warnzeichen');
  });

  it('resolves part tools with amounts', () => {
    const data = makeData();
    const result = resolveSubstepPrintData(data, 's1', 'folder');
    expect(result.partTools).toHaveLength(1);
    expect(result.partTools[0].name).toBe('Screw');
    expect(result.partTools[0].amount).toBe(2);
  });

  it('resolves image drawings for the first substep image', () => {
    const data = makeData();
    const result = resolveSubstepPrintData(data, 's1', 'folder');
    expect(result.imageDrawings).toHaveLength(1);
    expect(result.imageDrawings[0].id).toBe('d-1');
  });
});
