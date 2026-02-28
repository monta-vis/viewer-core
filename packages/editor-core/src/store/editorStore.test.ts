import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  videoFrameAreaToViewport,
  type InstructionData,
  type Step,
  type Substep,
  type VideoFrameAreaRow,
} from '@monta-vis/viewer-core';
import { useEditorStore } from './editorStore';

// Helper to create mock instruction data
function createMockInstructionData(): InstructionData {
  return {
    instructionId: 'inst-1',
    instructionName: 'Test Instruction',
    instructionDescription: null,
    instructionPreviewImageId: null,
    coverImageAreaId: null,
    currentVersionId: 'ver-1',
    liteSubstepLimit: 3,
    assemblies: {},
    steps: {
      'step-1': {
        id: 'step-1',
        versionId: 'ver-1',
        instructionId: 'inst-1',
        assemblyId: null,
        stepNumber: 1,
        title: 'Step 1',
        description: 'First step',
        substepIds: ['substep-1'],
        repeatCount: 1,
        repeatLabel: null,
      },
    },
    substeps: {
      'substep-1': {
        id: 'substep-1',
        versionId: 'ver-1',
        stepId: 'step-1',
        stepOrder: 1,
        creationOrder: 1,
        title: 'Substep 1',
        description: 'First substep',
        repeatCount: 1,
        repeatLabel: null,
        imageRowIds: [],
        videoSectionRowIds: [],
        partToolRowIds: [],
        noteRowIds: [],
        descriptionRowIds: [],
        tutorialRowIds: [],
      },
    },
    videos: {},
    videoSections: {},
    videoFrameAreas: {},
    partTools: {},
    notes: {},
    substepImages: {},
    substepPartTools: {},
    substepNotes: {},
    substepDescriptions: {},
    substepVideoSections: {},
    partToolVideoFrameAreas: {},
    viewportKeyframes: {},
    drawings: {},
    images: {},
    substepTutorials: {},
    safetyIcons: {},
  };
}

describe('useEditorStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => useEditorStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('initial state', () => {
    it('has null data initially', () => {
      const { result } = renderHook(() => useEditorStore());
      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('setData', () => {
    it('sets instruction data', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
      });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('clears changes when setting data', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
        result.current.updateStep('step-1', { title: 'Updated' });
      });

      expect(result.current.hasChanges()).toBe(true);

      act(() => {
        result.current.setData(mockData);
      });

      expect(result.current.hasChanges()).toBe(false);
    });
  });

  describe('setLoading', () => {
    it('sets loading state', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('setError', () => {
    it('sets error and clears loading', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setLoading(true);
        result.current.setError('Something went wrong');
      });

      expect(result.current.error).toBe('Something went wrong');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('reset', () => {
    it('resets store to initial state', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
        result.current.setLoading(true);
        result.current.setError('error');
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Steps CRUD', () => {
    it('addStep adds a new step', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
      });

      const newStep: Step = {
        id: 'step-2',
        versionId: 'ver-1',
        instructionId: 'inst-1',
        assemblyId: null,
        stepNumber: 2,
        title: 'Step 2',
        description: 'Second step',
        substepIds: [],
        repeatCount: 1,
        repeatLabel: null,
      };

      act(() => {
        result.current.addStep(newStep);
      });

      expect(result.current.data?.steps['step-2']).toEqual(newStep);
      expect(result.current.hasChanges()).toBe(true);
    });

    it('updateStep updates existing step', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
      });

      act(() => {
        result.current.updateStep('step-1', { title: 'Updated Title' });
      });

      expect(result.current.data?.steps['step-1'].title).toBe('Updated Title');
      expect(result.current.hasChanges()).toBe(true);
    });

    it('deleteStep removes step', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
      });

      act(() => {
        result.current.deleteStep('step-1');
      });

      expect(result.current.data?.steps['step-1']).toBeUndefined();
      expect(result.current.hasChanges()).toBe(true);
    });

    it('deleteStep unassigns its substeps', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
        result.current.deleteStep('step-1');
      });

      // substep-1 was assigned to step-1; after delete it should have stepId === null
      expect(result.current.data?.substeps['substep-1'].stepId).toBeNull();
      // substep-1 should be tracked as changed
      const { changed } = result.current.getChangedData();
      const changedSubsteps = changed.substeps as Array<{ id: string }> | undefined;
      expect(changedSubsteps?.some(s => s.id === 'substep-1')).toBe(true);
    });

    it('deleteStep unassigns multiple substeps', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();
      // Add two more substeps to step-1
      mockData.substeps['substep-2'] = {
        id: 'substep-2',
        versionId: 'ver-1',
        stepId: 'step-1',
        stepOrder: 2,
        creationOrder: 2,
        title: 'Substep 2',
        description: '',
        repeatCount: 1,
        repeatLabel: null,
        imageRowIds: [],
        videoSectionRowIds: [],
        partToolRowIds: [],
        noteRowIds: [],
        descriptionRowIds: [],
        tutorialRowIds: [],
      };
      mockData.substeps['substep-3'] = {
        id: 'substep-3',
        versionId: 'ver-1',
        stepId: 'step-1',
        stepOrder: 3,
        creationOrder: 3,
        title: 'Substep 3',
        description: '',
        repeatCount: 1,
        repeatLabel: null,
        imageRowIds: [],
        videoSectionRowIds: [],
        partToolRowIds: [],
        noteRowIds: [],
        descriptionRowIds: [],
        tutorialRowIds: [],
      };
      mockData.steps['step-1'].substepIds = ['substep-1', 'substep-2', 'substep-3'];

      act(() => {
        result.current.setData(mockData);
        result.current.deleteStep('step-1');
      });

      expect(result.current.data?.substeps['substep-1'].stepId).toBeNull();
      expect(result.current.data?.substeps['substep-2'].stepId).toBeNull();
      expect(result.current.data?.substeps['substep-3'].stepId).toBeNull();
    });

    it('deleteStep with empty substepIds still works', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();
      // step-1 has substepIds: ['substep-1'], override to empty
      mockData.steps['step-1'].substepIds = [];

      act(() => {
        result.current.setData(mockData);
        result.current.deleteStep('step-1');
      });

      expect(result.current.data?.steps['step-1']).toBeUndefined();
      expect(result.current.hasChanges()).toBe(true);
    });

    it('updateStep does nothing when data is null', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.updateStep('step-1', { title: 'Test' });
      });

      expect(result.current.hasChanges()).toBe(false);
    });
  });

  describe('Substeps CRUD', () => {
    it('addSubstep adds substep and updates step reference', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
      });

      const newSubstep: Substep = {
        id: 'substep-2',
        versionId: 'ver-1',
        stepId: 'step-1',
        stepOrder: 2,
        creationOrder: 2,
        title: 'Substep 2',
        description: 'Second substep',
        repeatCount: 1,
        repeatLabel: null,
        imageRowIds: [],
        videoSectionRowIds: [],
        partToolRowIds: [],
        noteRowIds: [],
        descriptionRowIds: [],
        tutorialRowIds: [],
      };

      act(() => {
        result.current.addSubstep(newSubstep);
      });

      expect(result.current.data?.substeps['substep-2']).toEqual(newSubstep);
      expect(result.current.data?.steps['step-1'].substepIds).toContain('substep-2');
    });

    it('deleteSubstep removes substep and updates step reference', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
      });

      act(() => {
        result.current.deleteSubstep('substep-1');
      });

      expect(result.current.data?.substeps['substep-1']).toBeUndefined();
      expect(result.current.data?.steps['step-1'].substepIds).not.toContain('substep-1');
    });
  });

  describe('Change tracking', () => {
    it('hasChanges returns false initially', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
      });

      expect(result.current.hasChanges()).toBe(false);
    });

    it('hasChanges returns true after modifications', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
        result.current.updateStep('step-1', { title: 'Modified' });
      });

      expect(result.current.hasChanges()).toBe(true);
    });

    it('getChangedData returns changed items', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
        result.current.updateStep('step-1', { title: 'Modified' });
      });

      const { changed, deleted } = result.current.getChangedData();

      expect(changed.steps).toHaveLength(1);
      expect((changed.steps![0] as Step).id).toBe('step-1');
      expect(deleted).toEqual({});
    });

    it('getChangedData includes repeat_count and repeat_label for substeps', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
        result.current.updateSubstep('substep-1', { repeatCount: 3, repeatLabel: 'left & right' });
      });

      const { changed } = result.current.getChangedData();
      expect(changed.substeps).toHaveLength(1);
      const substep = changed.substeps![0] as Record<string, unknown>;
      expect(substep.repeat_count).toBe(3);
      expect(substep.repeat_label).toBe('left & right');
    });

    it('getChangedData returns deleted items', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
        result.current.deleteStep('step-1');
      });

      const { changed, deleted } = result.current.getChangedData();

      expect(deleted.steps_ids).toContain('step-1');
      expect(changed.steps).toBeUndefined();
    });

    it('clearChanges resets change tracking', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
        result.current.updateStep('step-1', { title: 'Modified' });
      });

      expect(result.current.hasChanges()).toBe(true);

      act(() => {
        result.current.clearChanges();
      });

      expect(result.current.hasChanges()).toBe(false);
    });
  });

  describe('VideoFrameAreas CRUD', () => {
    it('addVideoFrameArea adds area', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
      });

      const newArea = {
        id: 'area-1',
        versionId: 'ver-1',
        videoId: 'video-1',
        frameNumber: 100,
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        type: 'SubstepImage' as const,
      };

      act(() => {
        result.current.addVideoFrameArea(newArea);
      });

      expect(result.current.data?.videoFrameAreas['area-1']).toEqual(newArea);
    });

    it('updateVideoFrameArea updates area', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();
      mockData.videoFrameAreas = {
        'area-1': {
          id: 'area-1',
          versionId: 'ver-1',
          videoId: 'video-1',
          frameNumber: 100,
            x: 0,
          y: 0,
          width: 100,
          height: 100,
          type: 'SubstepImage',
        },
      };

      act(() => {
        result.current.setData(mockData);
      });

      act(() => {
        result.current.updateVideoFrameArea('area-1', { width: 200 });
      });

      expect(result.current.data?.videoFrameAreas['area-1'].width).toBe(200);
    });
  });

  describe('PartTools CRUD', () => {
    it('adds and tracks part tool changes', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
      });

      const newPartTool = {
        id: 'pt-1',
        versionId: 'ver-1',
        instructionId: 'inst-1',
        name: 'Screw',
        type: 'Part' as const,
        partNumber: 'P001',
        amount: 10,
        description: 'Small screw',
      };

      act(() => {
        result.current.addPartTool(newPartTool);
      });

      expect(result.current.data?.partTools['pt-1']).toEqual(newPartTool);
      expect(result.current.hasChanges()).toBe(true);
    });
  });

  describe('Notes CRUD', () => {
    it('adds and deletes notes', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
      });

      const newNote = {
        id: 'note-1',
        versionId: 'ver-1',
        instructionId: 'inst-1',
        text: 'Important note',
        level: 'Info' as const,
        safetyIconId: null,
      };

      act(() => {
        result.current.addNote(newNote);
      });

      expect(result.current.data?.notes['note-1']).toEqual(newNote);

      act(() => {
        result.current.deleteNote('note-1');
      });

      expect(result.current.data?.notes['note-1']).toBeUndefined();
    });
  });
});

describe('videoFrameAreaToViewport', () => {
  it('reads x, y, width, height directly (pass-through)', () => {
    const area: VideoFrameAreaRow = {
      id: 'area-1',
      versionId: 'ver-1',
      videoId: 'video-1',
      frameNumber: 100,
      x: 10,
      y: 20,
      width: 100,
      height: 100,
      type: 'SubstepImage',
    };

    const result = videoFrameAreaToViewport(area);

    expect(result).toEqual({
      x: 10,
      y: 20,
      width: 100,
      height: 100,
    });
  });

  it('returns null for null input', () => {
    expect(videoFrameAreaToViewport(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(videoFrameAreaToViewport(undefined)).toBeNull();
  });

  it('returns null if x is null', () => {
    const area: VideoFrameAreaRow = {
      id: 'area-1',
      versionId: 'ver-1',
      videoId: 'video-1',
      frameNumber: 100,
      x: null,
      y: 20,
      width: 100,
      height: 100,
      type: 'SubstepImage',
    };

    expect(videoFrameAreaToViewport(area)).toBeNull();
  });

  it('returns null if y is null', () => {
    const area: VideoFrameAreaRow = {
      id: 'area-1',
      versionId: 'ver-1',
      videoId: 'video-1',
      frameNumber: 100,
      x: 10,
      y: null,
      width: 100,
      height: 100,
      type: 'SubstepImage',
    };

    expect(videoFrameAreaToViewport(area)).toBeNull();
  });

  it('returns null if width is null', () => {
    const area: VideoFrameAreaRow = {
      id: 'area-1',
      versionId: 'ver-1',
      videoId: 'video-1',
      frameNumber: 100,
      x: 10,
      y: 20,
      width: null,
      height: 100,
      type: 'SubstepImage',
    };

    expect(videoFrameAreaToViewport(area)).toBeNull();
  });

  it('returns null if height is null', () => {
    const area: VideoFrameAreaRow = {
      id: 'area-1',
      versionId: 'ver-1',
      videoId: 'video-1',
      frameNumber: 100,
      x: 10,
      y: 20,
      width: 100,
      height: null,
      type: 'SubstepImage',
    };

    expect(videoFrameAreaToViewport(area)).toBeNull();
  });
});

// ============================================
// Extended tests for simpleStore
// ============================================

describe('useEditorStore - Extended Tests', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useEditorStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('Instruction updates', () => {
    it('updateInstructionName updates the instruction name', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
        result.current.updateInstructionName('New Name');
      });

      expect(result.current.data?.instructionName).toBe('New Name');
      expect(result.current.hasChanges()).toBe(true);
    });

    it('updateInstructionName does nothing when data is null', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.updateInstructionName('New Name');
      });

      expect(result.current.hasChanges()).toBe(false);
    });

    it('updateInstructionDescription updates the description', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
        result.current.updateInstructionDescription('New Description');
      });

      expect(result.current.data?.instructionDescription).toBe('New Description');
      expect(result.current.hasChanges()).toBe(true);
    });

    it('updateInstructionPreviewImageId updates the preview image', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
        result.current.updateInstructionPreviewImageId('img-123');
      });

      expect(result.current.data?.instructionPreviewImageId).toBe('img-123');
      expect(result.current.hasChanges()).toBe(true);
    });
  });

  describe('Assembly CRUD', () => {
    it('addAssembly adds a new assembly', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
      });

      const newAssembly = {
        id: 'asm-1',
        versionId: 'ver-1',
        instructionId: 'inst-1',
        title: 'Assembly 1',
        description: 'First assembly',
        order: 1,
        previewImageId: null,
        stepIds: [],
      };

      act(() => {
        result.current.addAssembly(newAssembly);
      });

      expect(result.current.data?.assemblies['asm-1']).toEqual(newAssembly);
      expect(result.current.hasChanges()).toBe(true);
    });

    it('updateAssembly updates an existing assembly', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();
      mockData.assemblies = {
        'asm-1': {
          id: 'asm-1',
          versionId: 'ver-1',
          instructionId: 'inst-1',
          title: 'Assembly 1',
          description: null,
          order: 1,
          previewImageId: null,
          stepIds: [],
        },
      };

      act(() => {
        result.current.setData(mockData);
        result.current.updateAssembly('asm-1', { title: 'Updated Assembly' });
      });

      expect(result.current.data?.assemblies['asm-1'].title).toBe('Updated Assembly');
    });

    it('updateAssembly does nothing for non-existent assembly', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
        result.current.updateAssembly('non-existent', { title: 'Test' });
      });

      expect(result.current.hasChanges()).toBe(false);
    });

    it('deleteAssembly removes assembly and unassigns steps', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();
      mockData.assemblies = {
        'asm-1': {
          id: 'asm-1',
          versionId: 'ver-1',
          instructionId: 'inst-1',
          title: 'Assembly 1',
          description: null,
          order: 1,
          previewImageId: null,
          stepIds: ['step-1'],
        },
      };
      mockData.steps['step-1'].assemblyId = 'asm-1';

      act(() => {
        result.current.setData(mockData);
        result.current.deleteAssembly('asm-1');
      });

      expect(result.current.data?.assemblies['asm-1']).toBeUndefined();
      expect(result.current.data?.steps['step-1'].assemblyId).toBeNull();
    });
  });

  describe('Assignment actions', () => {
    it('assignStepToAssembly assigns step to assembly', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();
      mockData.assemblies = {
        'asm-1': {
          id: 'asm-1',
          versionId: 'ver-1',
          instructionId: 'inst-1',
          title: 'Assembly 1',
          description: null,
          order: 1,
          previewImageId: null,
          stepIds: [],
        },
      };

      act(() => {
        result.current.setData(mockData);
        result.current.assignStepToAssembly('step-1', 'asm-1');
      });

      expect(result.current.data?.steps['step-1'].assemblyId).toBe('asm-1');
      expect(result.current.data?.assemblies['asm-1'].stepIds).toContain('step-1');
    });

    it('assignStepToAssembly removes step from old assembly', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();
      mockData.assemblies = {
        'asm-1': {
          id: 'asm-1',
          versionId: 'ver-1',
          instructionId: 'inst-1',
          title: 'Assembly 1',
          description: null,
          order: 1,
          previewImageId: null,
          stepIds: ['step-1'],
        },
        'asm-2': {
          id: 'asm-2',
          versionId: 'ver-1',
          instructionId: 'inst-1',
          title: 'Assembly 2',
          description: null,
          order: 2,
          previewImageId: null,
          stepIds: [],
        },
      };
      mockData.steps['step-1'].assemblyId = 'asm-1';

      act(() => {
        result.current.setData(mockData);
        result.current.assignStepToAssembly('step-1', 'asm-2');
      });

      expect(result.current.data?.assemblies['asm-1'].stepIds).not.toContain('step-1');
      expect(result.current.data?.assemblies['asm-2'].stepIds).toContain('step-1');
    });

    it('assignSubstepToStep moves substep to new step', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();
      mockData.steps['step-2'] = {
        id: 'step-2',
        versionId: 'ver-1',
        instructionId: 'inst-1',
        assemblyId: null,
        stepNumber: 2,
        title: 'Step 2',
        description: '',
        substepIds: [],
        repeatCount: 1,
        repeatLabel: null,
      };

      act(() => {
        result.current.setData(mockData);
        result.current.assignSubstepToStep('substep-1', 'step-2');
      });

      expect(result.current.data?.substeps['substep-1'].stepId).toBe('step-2');
      expect(result.current.data?.steps['step-1'].substepIds).not.toContain('substep-1');
      expect(result.current.data?.steps['step-2'].substepIds).toContain('substep-1');
    });

    it('assignSubstepToStep handles null stepId', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
        result.current.assignSubstepToStep('substep-1', null);
      });

      expect(result.current.data?.substeps['substep-1'].stepId).toBeNull();
      expect(result.current.data?.steps['step-1'].substepIds).not.toContain('substep-1');
    });
  });

  describe('VideoSections CRUD', () => {
    it('addVideoSection adds section and updates video reference', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();
      mockData.videos = {
        'video-1': {
          id: 'video-1',
          instructionId: 'inst-1',
          orderId: 'order-1',
          userId: 'user-1',
          videoPath: '/test.mp4',
          fps: 30,
          order: 1,
          proxyStatus: 'Pending',
          width: 1920,
          height: 1080,
          sectionIds: [],
          frameAreaIds: [],
          viewportKeyframeIds: [],
        },
      };

      act(() => {
        result.current.setData(mockData);
      });

      const newSection = {
        id: 'section-1',
        versionId: 'ver-1',
        videoId: 'video-1',
        startFrame: 0,
        endFrame: 100,
        localPath: null,
      };

      act(() => {
        result.current.addVideoSection(newSection);
      });

      expect(result.current.data?.videoSections['section-1']).toEqual(newSection);
      expect(result.current.data?.videos['video-1'].sectionIds).toContain('section-1');
    });

    it('deleteVideoSection removes section and cleans up references', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();
      mockData.videos = {
        'video-1': {
          id: 'video-1',
          instructionId: 'inst-1',
          orderId: 'order-1',
          userId: 'user-1',
          videoPath: '/test.mp4',
          fps: 30,
          order: 1,
          proxyStatus: 'Pending',
          width: 1920,
          height: 1080,
          sectionIds: ['section-1'],
          frameAreaIds: [],
          viewportKeyframeIds: [],
        },
      };
      mockData.videoSections = {
        'section-1': {
          id: 'section-1',
          versionId: 'ver-1',
          videoId: 'video-1',
          startFrame: 0,
          endFrame: 100,
          localPath: null,
        },
      };

      act(() => {
        result.current.setData(mockData);
        result.current.deleteVideoSection('section-1');
      });

      expect(result.current.data?.videoSections['section-1']).toBeUndefined();
      expect(result.current.data?.videos['video-1'].sectionIds).not.toContain('section-1');
    });

    it('splitVideoSection splits section at frame', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();
      mockData.videos = {
        'video-1': {
          id: 'video-1',
          instructionId: 'inst-1',
          orderId: 'order-1',
          userId: 'user-1',
          videoPath: '/test.mp4',
          fps: 30,
          order: 1,
          proxyStatus: 'Pending',
          width: 1920,
          height: 1080,
          sectionIds: ['section-1'],
          frameAreaIds: [],
          viewportKeyframeIds: [],
        },
      };
      mockData.videoSections = {
        'section-1': {
          id: 'section-1',
          versionId: 'ver-1',
          videoId: 'video-1',
          startFrame: 0,
          endFrame: 100,
          localPath: null,
        },
      };

      act(() => {
        result.current.setData(mockData);
      });

      let newSectionId: string | null = null;
      act(() => {
        newSectionId = result.current.splitVideoSection('section-1', 50);
      });

      expect(newSectionId).not.toBeNull();
      expect(result.current.data?.videoSections['section-1'].endFrame).toBe(49);
      expect(result.current.data?.videoSections[newSectionId!].startFrame).toBe(51);
      expect(result.current.data?.videoSections[newSectionId!].endFrame).toBe(100);
    });

    it('splitVideoSection returns null for invalid split frame', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();
      mockData.videoSections = {
        'section-1': {
          id: 'section-1',
          versionId: 'ver-1',
          videoId: 'video-1',
          startFrame: 0,
          endFrame: 100,
          localPath: null,
        },
      };

      act(() => {
        result.current.setData(mockData);
      });

      let newSectionId: string | null = null;
      act(() => {
        // Try to split at edge (should fail)
        newSectionId = result.current.splitVideoSection('section-1', 0);
      });

      expect(newSectionId).toBeNull();
    });
  });

  describe('SubstepElements CRUD', () => {
    it('addSubstepImage adds image and updates substep reference', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
      });

      const newImage = {
        id: 'img-row-1',
        versionId: 'ver-1',
        substepId: 'substep-1',
        videoFrameAreaId: 'area-1',
        order: 0,
      };

      act(() => {
        result.current.addSubstepImage(newImage);
      });

      expect(result.current.data?.substepImages['img-row-1']).toEqual(newImage);
      expect(result.current.data?.substeps['substep-1'].imageRowIds).toContain('img-row-1');
    });

    it('deleteSubstepImage removes image and updates substep reference', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();
      mockData.substepImages = {
        'img-row-1': {
          id: 'img-row-1',
          versionId: 'ver-1',
          substepId: 'substep-1',
          videoFrameAreaId: 'area-1',
          order: 0,
        },
      };
      mockData.substeps['substep-1'].imageRowIds = ['img-row-1'];

      act(() => {
        result.current.setData(mockData);
        result.current.deleteSubstepImage('img-row-1');
      });

      expect(result.current.data?.substepImages['img-row-1']).toBeUndefined();
      expect(result.current.data?.substeps['substep-1'].imageRowIds).not.toContain('img-row-1');
    });

    it('addSubstepDescription adds description and updates substep reference', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
      });

      const newDesc = {
        id: 'desc-1',
        versionId: 'ver-1',
        substepId: 'substep-1',
        text: 'Test description',
        order: 0,
      };

      act(() => {
        result.current.addSubstepDescription(newDesc);
      });

      expect(result.current.data?.substepDescriptions['desc-1']).toEqual(newDesc);
      expect(result.current.data?.substeps['substep-1'].descriptionRowIds).toContain('desc-1');
    });

    it('addSubstepPartTool adds part/tool and updates substep reference', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
      });

      const newRow = {
        id: 'spt-1',
        versionId: 'ver-1',
        substepId: 'substep-1',
        partToolId: 'pt-1',
        amount: 2,
        order: 0,
      };

      act(() => {
        result.current.addSubstepPartTool(newRow);
      });

      expect(result.current.data?.substepPartTools['spt-1']).toEqual(newRow);
      expect(result.current.data?.substeps['substep-1'].partToolRowIds).toContain('spt-1');
    });

    it('addSubstepNote adds note and updates substep reference', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
      });

      const newRow = {
        id: 'sn-1',
        versionId: 'ver-1',
        substepId: 'substep-1',
        noteId: 'note-1',
        order: 0,
      };

      act(() => {
        result.current.addSubstepNote(newRow);
      });

      expect(result.current.data?.substepNotes['sn-1']).toEqual(newRow);
      expect(result.current.data?.substeps['substep-1'].noteRowIds).toContain('sn-1');
    });

    it('addSubstepVideoSection adds video section and updates substep reference', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
      });

      const newRow = {
        id: 'svs-1',
        versionId: 'ver-1',
        substepId: 'substep-1',
        videoSectionId: 'section-1',
        order: 0,
      };

      act(() => {
        result.current.addSubstepVideoSection(newRow);
      });

      expect(result.current.data?.substepVideoSections['svs-1']).toEqual(newRow);
      expect(result.current.data?.substeps['substep-1'].videoSectionRowIds).toContain('svs-1');
    });
  });

  describe('ViewportKeyframes CRUD', () => {
    it('addViewportKeyframe adds keyframe and updates video reference', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();
      mockData.videos = {
        'video-1': {
          id: 'video-1',
          instructionId: 'inst-1',
          orderId: 'order-1',
          userId: 'user-1',
          videoPath: '/test.mp4',
          fps: 30,
          order: 1,
          proxyStatus: 'Pending',
          width: 1920,
          height: 1080,
          sectionIds: [],
          frameAreaIds: [],
          viewportKeyframeIds: [],
        },
      };

      act(() => {
        result.current.setData(mockData);
      });

      const newKeyframe = {
        id: 'kf-1',
        videoId: 'video-1',
        versionId: 'ver-1',
        frameNumber: 0,
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
      };

      act(() => {
        result.current.addViewportKeyframe(newKeyframe);
      });

      expect(result.current.data?.viewportKeyframes['kf-1']).toEqual(newKeyframe);
      expect(result.current.data?.videos['video-1'].viewportKeyframeIds).toContain('kf-1');
    });

    it('deleteViewportKeyframe removes keyframe but not frame 0', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();
      mockData.videos = {
        'video-1': {
          id: 'video-1',
          instructionId: 'inst-1',
          orderId: 'order-1',
          userId: 'user-1',
          videoPath: '/test.mp4',
          fps: 30,
          order: 1,
          proxyStatus: 'Pending',
          width: 1920,
          height: 1080,
          sectionIds: [],
          frameAreaIds: [],
          viewportKeyframeIds: ['kf-0', 'kf-50'],
        },
      };
      mockData.viewportKeyframes = {
        'kf-0': {
          id: 'kf-0',
          videoId: 'video-1',
          versionId: 'ver-1',
          frameNumber: 0,
          x: 0,
          y: 0,
          width: 1920,
          height: 1080,
        },
        'kf-50': {
          id: 'kf-50',
          videoId: 'video-1',
          versionId: 'ver-1',
          frameNumber: 50,
          x: 100,
          y: 100,
          width: 800,
          height: 600,
        },
      };

      act(() => {
        result.current.setData(mockData);
      });

      // Try to delete frame 0 keyframe (should not work)
      act(() => {
        result.current.deleteViewportKeyframe('kf-0');
      });
      expect(result.current.data?.viewportKeyframes['kf-0']).toBeDefined();

      // Delete frame 50 keyframe (should work)
      act(() => {
        result.current.deleteViewportKeyframe('kf-50');
      });
      expect(result.current.data?.viewportKeyframes['kf-50']).toBeUndefined();
      expect(result.current.data?.videos['video-1'].viewportKeyframeIds).not.toContain('kf-50');
    });
  });

  describe('Drawings CRUD', () => {
    it('addDrawing adds a drawing', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
      });

      const newDrawing = {
        id: 'draw-1',
        versionId: 'ver-1',
        substepImageId: 'img-row-1',
        substepId: 'substep-1',
        startFrame: 0,
        endFrame: 100,
        type: 'Rectangle' as const,
        color: '#FF0000',
        strokeWidth: 2,
        x1: 10,
        y1: 10,
        x2: 100,
        y2: 100,
        x: null,
        y: null,
        content: null,
        fontSize: null,
        points: null,
        order: 0,
      };

      act(() => {
        result.current.addDrawing(newDrawing);
      });

      expect(result.current.data?.drawings['draw-1']).toEqual(newDrawing);
    });

    it('deleteDrawing removes drawing', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();
      mockData.drawings = {
        'draw-1': {
          id: 'draw-1',
          versionId: 'ver-1',
          substepImageId: 'img-row-1',
          substepId: 'substep-1',
          startFrame: 0,
          endFrame: 100,
          type: 'Rectangle',
          color: '#FF0000',
          strokeWidth: 2,
          x1: 10,
          y1: 10,
          x2: 100,
          y2: 100,
          x: null,
          y: null,
          content: null,
          fontSize: null,
          points: null,
          order: 0,
        },
      };

      act(() => {
        result.current.setData(mockData);
        result.current.deleteDrawing('draw-1');
      });

      expect(result.current.data?.drawings['draw-1']).toBeUndefined();
    });
  });

  describe('PartToolVideoFrameAreas CRUD', () => {
    it('addPartToolVideoFrameArea adds row', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
      });

      const newRow = {
        id: 'ptvfa-1',
        versionId: 'ver-1',
        partToolId: 'pt-1',
        videoFrameAreaId: 'area-1',
        order: 0,
        isPreviewImage: false,
      };

      act(() => {
        result.current.addPartToolVideoFrameArea(newRow);
      });

      expect(result.current.data?.partToolVideoFrameAreas['ptvfa-1']).toEqual(newRow);
    });

    it('deletePartToolVideoFrameArea removes row', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();
      mockData.partToolVideoFrameAreas = {
        'ptvfa-1': {
          id: 'ptvfa-1',
          versionId: 'ver-1',
          partToolId: 'pt-1',
          videoFrameAreaId: 'area-1',
          order: 0,
          isPreviewImage: false,
        },
      };

      act(() => {
        result.current.setData(mockData);
        result.current.deletePartToolVideoFrameArea('ptvfa-1');
      });

      expect(result.current.data?.partToolVideoFrameAreas['ptvfa-1']).toBeUndefined();
    });
  });

  describe('Event recording', () => {
    it('setEventRecordCallback sets the callback', () => {
      const { result } = renderHook(() => useEditorStore());
      const callback = vi.fn();

      act(() => {
        result.current.setEventRecordCallback(callback);
      });

      expect(result.current.onEventRecord).toBe(callback);
    });

    it('addStep calls event record callback', () => {
      const { result } = renderHook(() => useEditorStore());
      const callback = vi.fn();
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
        result.current.setEventRecordCallback(callback);
      });

      const newStep: Step = {
        id: 'step-2',
        versionId: 'ver-1',
        instructionId: 'inst-1',
        assemblyId: null,
        stepNumber: 2,
        title: 'Step 2',
        description: '',
        substepIds: [],
        repeatCount: 1,
        repeatLabel: null,
      };

      act(() => {
        result.current.addStep(newStep);
      });

      expect(callback).toHaveBeenCalledWith(
        'step',
        'step-2',
        'create',
        expect.objectContaining({ id: 'step-2' })
      );
    });

    it('deleteStep calls event record callback', () => {
      const { result } = renderHook(() => useEditorStore());
      const callback = vi.fn();
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
        result.current.setEventRecordCallback(callback);
        result.current.deleteStep('step-1');
      });

      expect(callback).toHaveBeenCalledWith(
        'step',
        'step-1',
        'delete',
        expect.objectContaining({ id: 'step-1' })
      );
    });
  });

  describe('Progressive step loading', () => {
    it('setStepLoadingState sets loading state', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setStepLoadingState({
          totalSteps: 10,
          loadedCount: 0,
          isLoadingMore: false,
          allLoaded: false,
        });
      });

      expect(result.current.stepLoadingState).toEqual({
        totalSteps: 10,
        loadedCount: 0,
        isLoadingMore: false,
        allLoaded: false,
      });
    });

    it('appendSteps appends step data to store', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
        result.current.setStepLoadingState({
          totalSteps: 5,
          loadedCount: 1,
          isLoadingMore: true,
          allLoaded: false,
        });
      });

      const chunk = {
        steps: [
          {
            id: 'step-2',
            versionId: 'ver-1',
            instructionId: 'inst-1',
            assemblyId: null,
            stepNumber: 2,
            title: 'Step 2',
            description: '',
            substepIds: [],
            repeatCount: 1,
            repeatLabel: null,
          },
        ],
        substeps: [],
        substepImages: [],
        substepPartTools: [],
        substepNotes: [],
        substepDescriptions: [],
        substepVideoSections: [],
        drawings: [],
        hasMore: false,
      };

      act(() => {
        result.current.appendSteps(chunk);
      });

      expect(result.current.data?.steps['step-2']).toBeDefined();
      expect(result.current.stepLoadingState?.loadedCount).toBe(2);
      expect(result.current.stepLoadingState?.allLoaded).toBe(true);
    });
  });

  describe('getChangedData instruction changes', () => {
    it('includes instruction changes in getChangedData', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
        result.current.updateInstructionName('Updated Name');
      });

      const { changed } = result.current.getChangedData();

      expect(changed.instruction).toBeDefined();
      expect(changed.instruction).toHaveLength(1);
      expect((changed.instruction![0] as { name: string }).name).toBe('Updated Name');
    });
  });

  describe('deleteSubstep cascade', () => {
    it('deleteSubstep cascades deletion to all linked elements', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      // Set up linked elements
      mockData.substepImages = {
        'img-1': {
          id: 'img-1',
          versionId: 'ver-1',
          substepId: 'substep-1',
          videoFrameAreaId: 'area-1',
          order: 0,
        },
      };
      mockData.substepDescriptions = {
        'desc-1': {
          id: 'desc-1',
          versionId: 'ver-1',
          substepId: 'substep-1',
          text: 'Test',
          order: 0,
        },
      };
      mockData.substeps['substep-1'].imageRowIds = ['img-1'];
      mockData.substeps['substep-1'].descriptionRowIds = ['desc-1'];

      act(() => {
        result.current.setData(mockData);
        result.current.deleteSubstep('substep-1');
      });

      expect(result.current.data?.substepImages['img-1']).toBeUndefined();
      expect(result.current.data?.substepDescriptions['desc-1']).toBeUndefined();
    });
  });

  describe('reorderSubstepElement', () => {
    it('reorders image elements', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();
      mockData.substepImages = {
        'img-1': { id: 'img-1', versionId: 'ver-1', substepId: 'substep-1', videoFrameAreaId: 'a1', order: 0 },
        'img-2': { id: 'img-2', versionId: 'ver-1', substepId: 'substep-1', videoFrameAreaId: 'a2', order: 1 },
        'img-3': { id: 'img-3', versionId: 'ver-1', substepId: 'substep-1', videoFrameAreaId: 'a3', order: 2 },
      };
      mockData.substeps['substep-1'].imageRowIds = ['img-1', 'img-2', 'img-3'];

      act(() => {
        result.current.setData(mockData);
        result.current.reorderSubstepElement('img-1', 2, 'image');
      });

      // img-1 should now be at index 2
      expect(result.current.data?.substepImages['img-2'].order).toBe(0);
      expect(result.current.data?.substepImages['img-3'].order).toBe(1);
      expect(result.current.data?.substepImages['img-1'].order).toBe(2);
    });

    it('reorders description elements', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();
      mockData.substepDescriptions = {
        'desc-1': { id: 'desc-1', versionId: 'ver-1', substepId: 'substep-1', text: 'A', order: 0 },
        'desc-2': { id: 'desc-2', versionId: 'ver-1', substepId: 'substep-1', text: 'B', order: 1 },
      };
      mockData.substeps['substep-1'].descriptionRowIds = ['desc-1', 'desc-2'];

      act(() => {
        result.current.setData(mockData);
        result.current.reorderSubstepElement('desc-2', 0, 'description');
      });

      expect(result.current.data?.substepDescriptions['desc-2'].order).toBe(0);
      expect(result.current.data?.substepDescriptions['desc-1'].order).toBe(1);
    });

    it('does nothing for same index', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();
      mockData.substepImages = {
        'img-1': { id: 'img-1', versionId: 'ver-1', substepId: 'substep-1', videoFrameAreaId: 'a1', order: 0 },
      };
      mockData.substeps['substep-1'].imageRowIds = ['img-1'];

      act(() => {
        result.current.setData(mockData);
      });

      act(() => {
        result.current.clearChanges();
        result.current.reorderSubstepElement('img-1', 0, 'image');
      });

      expect(result.current.hasChanges()).toBe(false);
    });

    it('does nothing when data is null', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.reorderSubstepElement('img-1', 1, 'image');
      });

      expect(result.current.hasChanges()).toBe(false);
    });

    it('does nothing for unknown element type', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
        result.current.reorderSubstepElement('test', 1, 'unknown' as 'image');
      });

      expect(result.current.hasChanges()).toBe(false);
    });
  });

  describe('Update operations', () => {
    it('updateSubstepImage updates image row', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();
      mockData.substepImages = {
        'img-1': { id: 'img-1', versionId: 'ver-1', substepId: 'substep-1', videoFrameAreaId: 'a1', order: 0 },
      };

      act(() => {
        result.current.setData(mockData);
        result.current.updateSubstepImage('img-1', { order: 5 });
      });

      expect(result.current.data?.substepImages['img-1'].order).toBe(5);
    });

    it('updateSubstepDescription updates description', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();
      mockData.substepDescriptions = {
        'desc-1': { id: 'desc-1', versionId: 'ver-1', substepId: 'substep-1', text: 'A', order: 0 },
      };

      act(() => {
        result.current.setData(mockData);
        result.current.updateSubstepDescription('desc-1', { text: 'Updated text' });
      });

      expect(result.current.data?.substepDescriptions['desc-1'].text).toBe('Updated text');
    });

    it('deleteSubstepDescription removes from substep', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();
      mockData.substepDescriptions = {
        'desc-1': { id: 'desc-1', versionId: 'ver-1', substepId: 'substep-1', text: 'A', order: 0 },
      };
      mockData.substeps['substep-1'].descriptionRowIds = ['desc-1'];

      act(() => {
        result.current.setData(mockData);
        result.current.deleteSubstepDescription('desc-1');
      });

      expect(result.current.data?.substepDescriptions['desc-1']).toBeUndefined();
      expect(result.current.data?.substeps['substep-1'].descriptionRowIds).not.toContain('desc-1');
    });

    it('updateSubstepPartTool updates part/tool row', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();
      mockData.substepPartTools = {
        'spt-1': { id: 'spt-1', versionId: 'ver-1', substepId: 'substep-1', partToolId: 'pt-1', amount: 1, order: 0 },
      };

      act(() => {
        result.current.setData(mockData);
        result.current.updateSubstepPartTool('spt-1', { amount: 5 });
      });

      expect(result.current.data?.substepPartTools['spt-1'].amount).toBe(5);
    });

    it('deleteSubstepPartTool removes from substep', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();
      mockData.substepPartTools = {
        'spt-1': { id: 'spt-1', versionId: 'ver-1', substepId: 'substep-1', partToolId: 'pt-1', amount: 1, order: 0 },
      };
      mockData.substeps['substep-1'].partToolRowIds = ['spt-1'];

      act(() => {
        result.current.setData(mockData);
        result.current.deleteSubstepPartTool('spt-1');
      });

      expect(result.current.data?.substepPartTools['spt-1']).toBeUndefined();
    });

    it('updateSubstepNote updates note row', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();
      mockData.substepNotes = {
        'sn-1': { id: 'sn-1', versionId: 'ver-1', substepId: 'substep-1', noteId: 'n-1', order: 0 },
      };

      act(() => {
        result.current.setData(mockData);
        result.current.updateSubstepNote('sn-1', { order: 3 });
      });

      expect(result.current.data?.substepNotes['sn-1'].order).toBe(3);
    });

    it('deleteSubstepNote removes from substep', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();
      mockData.substepNotes = {
        'sn-1': { id: 'sn-1', versionId: 'ver-1', substepId: 'substep-1', noteId: 'n-1', order: 0 },
      };
      mockData.substeps['substep-1'].noteRowIds = ['sn-1'];

      act(() => {
        result.current.setData(mockData);
        result.current.deleteSubstepNote('sn-1');
      });

      expect(result.current.data?.substepNotes['sn-1']).toBeUndefined();
    });

    it('updateSubstepVideoSection updates video section row', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();
      mockData.substepVideoSections = {
        'svs-1': { id: 'svs-1', versionId: 'ver-1', substepId: 'substep-1', videoSectionId: 'vs-1', order: 0 },
      };

      act(() => {
        result.current.setData(mockData);
        result.current.updateSubstepVideoSection('svs-1', { order: 2 });
      });

      expect(result.current.data?.substepVideoSections['svs-1'].order).toBe(2);
    });

    it('deleteSubstepVideoSection removes from substep', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();
      mockData.substepVideoSections = {
        'svs-1': { id: 'svs-1', versionId: 'ver-1', substepId: 'substep-1', videoSectionId: 'vs-1', order: 0 },
      };
      mockData.substeps['substep-1'].videoSectionRowIds = ['svs-1'];

      act(() => {
        result.current.setData(mockData);
        result.current.deleteSubstepVideoSection('svs-1');
      });

      expect(result.current.data?.substepVideoSections['svs-1']).toBeUndefined();
    });

    it('updateVideoSection updates section', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();
      mockData.videoSections = {
        'vs-1': { id: 'vs-1', versionId: 'ver-1', videoId: 'v-1', startFrame: 0, endFrame: 100, localPath: null },
      };

      act(() => {
        result.current.setData(mockData);
        result.current.updateVideoSection('vs-1', { endFrame: 200 });
      });

      expect(result.current.data?.videoSections['vs-1'].endFrame).toBe(200);
    });

    it('updateNote updates note', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();
      mockData.notes = {
        'n-1': { id: 'n-1', versionId: 'ver-1', text: 'Old', level: 'Info' },
      };

      act(() => {
        result.current.setData(mockData);
        result.current.updateNote('n-1', { text: 'New text' });
      });

      expect(result.current.data?.notes['n-1'].text).toBe('New text');
    });

    it('updatePartTool updates part/tool', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();
      mockData.partTools = {
        'pt-1': { id: 'pt-1', versionId: 'ver-1', instructionId: 'i-1', name: 'Screw', type: 'Part', partNumber: 'P1', amount: 10, description: '' },
      };

      act(() => {
        result.current.setData(mockData);
        result.current.updatePartTool('pt-1', { amount: 20 });
      });

      expect(result.current.data?.partTools['pt-1'].amount).toBe(20);
    });

    it('deletePartTool removes part/tool', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();
      mockData.partTools = {
        'pt-1': { id: 'pt-1', versionId: 'ver-1', instructionId: 'i-1', name: 'Screw', type: 'Part', partNumber: 'P1', amount: 10, description: '' },
      };

      act(() => {
        result.current.setData(mockData);
        result.current.deletePartTool('pt-1');
      });

      expect(result.current.data?.partTools['pt-1']).toBeUndefined();
    });

    it('updateDrawing updates drawing', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();
      mockData.drawings = {
        'd-1': {
          id: 'd-1', versionId: 'ver-1', substepImageId: 'si-1', substepId: 's-1',
          startFrame: 0, endFrame: 100, type: 'Rectangle', color: '#FF0000', strokeWidth: 2,
          x1: 0, y1: 0, x2: 100, y2: 100, x: null, y: null, content: null, fontSize: null, points: null, order: 0
        },
      };

      act(() => {
        result.current.setData(mockData);
        result.current.updateDrawing('d-1', { color: '#00FF00' });
      });

      expect(result.current.data?.drawings['d-1'].color).toBe('#00FF00');
    });

    it('updateViewportKeyframe updates keyframe', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();
      mockData.viewportKeyframes = {
        'kf-1': { id: 'kf-1', videoId: 'v-1', versionId: 'ver-1', frameNumber: 0, x: 0, y: 0, width: 1, height: 1 },
      };

      act(() => {
        result.current.setData(mockData);
        result.current.updateViewportKeyframe('kf-1', { x: 0.5 });
      });

      expect(result.current.data?.viewportKeyframes['kf-1'].x).toBe(0.5);
    });

    it('updatePartToolVideoFrameArea updates row', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();
      mockData.partToolVideoFrameAreas = {
        'ptvfa-1': { id: 'ptvfa-1', versionId: 'ver-1', partToolId: 'pt-1', videoFrameAreaId: 'vfa-1', order: 0, isPreviewImage: false },
      };

      act(() => {
        result.current.setData(mockData);
        result.current.updatePartToolVideoFrameArea('ptvfa-1', { isPreviewImage: true });
      });

      expect(result.current.data?.partToolVideoFrameAreas['ptvfa-1'].isPreviewImage).toBe(true);
    });

    it('deleteVideoFrameArea removes area', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();
      mockData.videoFrameAreas = {
        'vfa-1': { id: 'vfa-1', versionId: 'ver-1', videoId: 'v-1', frameNumber: 0, x: 0, y: 0, width: 100, height: 100, type: 'SubstepImage' },
      };

      act(() => {
        result.current.setData(mockData);
        result.current.deleteVideoFrameArea('vfa-1');
      });

      expect(result.current.data?.videoFrameAreas['vfa-1']).toBeUndefined();
    });
  });

  describe('getChangedData snake_case conversion', () => {
    it('converts camelCase keys to snake_case', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
        result.current.addVideoSection({
          id: 'vs-1',
          versionId: 'ver-1',
          videoId: 'video-1',
          startFrame: 0,
          endFrame: 100,
          localPath: null,
        });
      });

      const { changed } = result.current.getChangedData();

      expect(changed.video_sections).toBeDefined();
      const section = changed.video_sections![0] as Record<string, unknown>;
      expect(section.version_id).toBe('ver-1');
      expect(section.video_id).toBe('video-1');
      expect(section.start_frame).toBe(0);
      expect(section.end_frame).toBe(100);
    });

    it('includes deleted IDs in snake_case format', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();
      mockData.videoSections = {
        'vs-1': { id: 'vs-1', versionId: 'ver-1', videoId: 'v-1', startFrame: 0, endFrame: 100, localPath: null },
      };
      mockData.videos = {
        'v-1': { id: 'v-1', instructionId: 'i-1', orderId: 'o-1', userId: 'u-1', videoPath: '/test.mp4', fps: 30, order: 1, proxyStatus: 'Pending', width: 1920, height: 1080, sectionIds: ['vs-1'], frameAreaIds: [], viewportKeyframeIds: [] },
      };

      act(() => {
        result.current.setData(mockData);
        result.current.deleteVideoSection('vs-1');
      });

      const { deleted } = result.current.getChangedData();

      expect(deleted.video_sections_ids).toContain('vs-1');
    });

    it('returns empty objects when data is null', () => {
      const { result } = renderHook(() => useEditorStore());

      const { changed, deleted } = result.current.getChangedData();

      expect(changed).toEqual({});
      expect(deleted).toEqual({});
    });
  });

  describe('restoreData', () => {
    it('restoreData with same data reference results in no changes', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
      });

      // restoreData uses reference equality (Immer structural sharing),
      // so restoring the same object reference should show no changes
      const currentData = result.current.data!;
      act(() => {
        result.current.restoreData(currentData);
      });

      expect(result.current.hasChanges()).toBe(false);
    });

    it('restoreData with modified entity marks only that entity changed', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
      });

      // Modify step title and restore
      const modified = structuredClone(result.current.data!);
      modified.steps['step-1'].title = 'Changed Title';

      act(() => {
        result.current.restoreData(modified);
      });

      expect(result.current.hasChanges()).toBe(true);
      expect(result.current.data?.steps['step-1'].title).toBe('Changed Title');
    });

    it('restoreData detects deleted entities', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
      });

      // Remove step from data
      const modified = structuredClone(result.current.data!);
      delete modified.steps['step-1'];

      act(() => {
        result.current.restoreData(modified);
      });

      expect(result.current.hasChanges()).toBe(true);
      expect(result.current.data?.steps['step-1']).toBeUndefined();
    });

    it('restoreData detects new entities', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
      });

      // Add a new step
      const modified = structuredClone(result.current.data!);
      modified.steps['step-new'] = {
        id: 'step-new',
        versionId: 'ver-1',
        instructionId: 'inst-1',
        assemblyId: null,
        stepNumber: 2,
        title: 'New Step',
        description: null,
        substepIds: [],
        repeatCount: 1,
        repeatLabel: null,
      };

      act(() => {
        result.current.restoreData(modified);
      });

      expect(result.current.hasChanges()).toBe(true);
      expect(result.current.data?.steps['step-new']).toBeDefined();
    });

    it('restoreData detects instruction-level changes', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
      });

      const modified = structuredClone(result.current.data!);
      modified.instructionName = 'New Name';

      act(() => {
        result.current.restoreData(modified);
      });

      expect(result.current.hasChanges()).toBe(true);
      expect(result.current.instructionChanged).toBe(true);
    });

    it('clearChanges updates lastSavedData baseline', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockData = createMockInstructionData();

      act(() => {
        result.current.setData(mockData);
        // Make a change
        result.current.updateStep('step-1', { title: 'Modified' });
      });

      // Clear changes (simulates a save)
      act(() => {
        result.current.clearChanges();
      });

      // Now restoreData with the original data — should show changes
      // because the baseline moved to 'Modified'
      act(() => {
        result.current.restoreData(structuredClone(mockData));
      });

      expect(result.current.hasChanges()).toBe(true);
    });

    it('restoreData with no lastSavedData marks everything changed', () => {
      const { result } = renderHook(() => useEditorStore());

      // Reset to truly clean state (no lastSavedData)
      act(() => {
        result.current.reset();
      });

      const mockData = createMockInstructionData();

      // Manually set data field without calling setData (which sets lastSavedData)
      // Use restoreData directly — it should see no lastSavedData
      act(() => {
        result.current.restoreData(mockData);
      });

      expect(result.current.hasChanges()).toBe(true);
    });
  });

});
