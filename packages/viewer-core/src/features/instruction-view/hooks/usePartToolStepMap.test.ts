import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePartToolStepMap } from './usePartToolStepMap';
import type { InstructionData } from '@/features/instruction';

// Mock ViewerDataContext
let mockData: InstructionData | null = null;
vi.mock('../context', () => ({
  useViewerData: () => mockData,
}));

afterEach(() => {
  mockData = null;
});

/** Minimal InstructionData for testing */
function makeData(overrides: Partial<InstructionData> = {}): InstructionData {
  return {
    instructionId: 'i1',
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
  } as InstructionData;
}

describe('usePartToolStepMap', () => {
  it('returns empty map when data is null', () => {
    mockData = null;
    const { result } = renderHook(() => usePartToolStepMap());
    expect(result.current.size).toBe(0);
  });

  it('returns empty map when there are no steps', () => {
    mockData = makeData();
    const { result } = renderHook(() => usePartToolStepMap());
    expect(result.current.size).toBe(0);
  });

  it('maps partToolId to correct step IDs', () => {
    mockData = makeData({
      steps: {
        step1: {
          id: 'step1', versionId: 'v1', instructionId: 'i1', assemblyId: null,
          stepNumber: 1, title: null, description: null, createdAt: '', updatedAt: '',
          substepIds: ['sub1'],
        },
      },
      substeps: {
        sub1: {
          id: 'sub1', versionId: 'v1', stepId: 'step1', stepOrder: 1, creationOrder: 1,
          title: null, description: null, displayMode: 'normal', repeatCount: 1,
          imageRowIds: [], videoSectionRowIds: [], partToolRowIds: ['spt1'],
          noteRowIds: [], descriptionRowIds: [], tutorialRowIds: [],
          createdAt: '', updatedAt: '',
        },
      },
      substepPartTools: {
        spt1: {
          id: 'spt1', versionId: 'v1', substepId: 'sub1', partToolId: 'pt1', amount: 1, order: 1,
        },
      },
      partTools: {
        pt1: {
          id: 'pt1', versionId: 'v1', instructionId: 'i1', previewImageId: null,
          name: 'Bolt', label: null, type: 'Part', partNumber: null,
          amount: 1, description: null, unit: null, material: null, dimension: null, iconId: null,
        },
      },
    });

    const { result } = renderHook(() => usePartToolStepMap());
    expect(result.current.size).toBe(1);
    expect(result.current.get('pt1')).toEqual(new Set(['step1']));
  });

  it('collects all step IDs when a partTool appears in multiple steps', () => {
    mockData = makeData({
      steps: {
        step1: {
          id: 'step1', versionId: 'v1', instructionId: 'i1', assemblyId: null,
          stepNumber: 1, title: null, description: null, createdAt: '', updatedAt: '',
          substepIds: ['sub1'],
        },
        step2: {
          id: 'step2', versionId: 'v1', instructionId: 'i1', assemblyId: null,
          stepNumber: 2, title: null, description: null, createdAt: '', updatedAt: '',
          substepIds: ['sub2'],
        },
      },
      substeps: {
        sub1: {
          id: 'sub1', versionId: 'v1', stepId: 'step1', stepOrder: 1, creationOrder: 1,
          title: null, description: null, displayMode: 'normal', repeatCount: 1,
          imageRowIds: [], videoSectionRowIds: [], partToolRowIds: ['spt1'],
          noteRowIds: [], descriptionRowIds: [], tutorialRowIds: [],
          createdAt: '', updatedAt: '',
        },
        sub2: {
          id: 'sub2', versionId: 'v1', stepId: 'step2', stepOrder: 1, creationOrder: 1,
          title: null, description: null, displayMode: 'normal', repeatCount: 1,
          imageRowIds: [], videoSectionRowIds: [], partToolRowIds: ['spt2'],
          noteRowIds: [], descriptionRowIds: [], tutorialRowIds: [],
          createdAt: '', updatedAt: '',
        },
      },
      substepPartTools: {
        spt1: {
          id: 'spt1', versionId: 'v1', substepId: 'sub1', partToolId: 'pt1', amount: 1, order: 1,
        },
        spt2: {
          id: 'spt2', versionId: 'v1', substepId: 'sub2', partToolId: 'pt1', amount: 2, order: 1,
        },
      },
      partTools: {
        pt1: {
          id: 'pt1', versionId: 'v1', instructionId: 'i1', previewImageId: null,
          name: 'Bolt', label: null, type: 'Part', partNumber: null,
          amount: 1, description: null, unit: null, material: null, dimension: null, iconId: null,
        },
      },
    });

    const { result } = renderHook(() => usePartToolStepMap());
    expect(result.current.get('pt1')).toEqual(new Set(['step1', 'step2']));
  });
});
