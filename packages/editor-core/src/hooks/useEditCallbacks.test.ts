import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { isValidElement, type ReactElement } from 'react';
import type { PersistenceAdapter, NormalizedCrop, StepPreviewUploadResult } from '../persistence/types';

const mockDeleteSubstepDescription = vi.fn();
const mockDeleteSubstepNote = vi.fn();
const mockDeleteNote = vi.fn();
const mockDeleteSubstep = vi.fn();
const mockDeleteSubstepImage = vi.fn();
const mockDeleteSubstepTutorial = vi.fn();
const mockDeleteSubstepPartTool = vi.fn();
const mockAddAssembly = vi.fn();
const mockDeleteAssembly = vi.fn();
const mockUpdateAssembly = vi.fn();
const mockAssignStepToAssembly = vi.fn();
const mockUpdateStep = vi.fn();
const mockAddVideoFrameArea = vi.fn();
const mockDeletePartTool = vi.fn();
const mockDeleteStep = vi.fn();

let mockData: Record<string, Record<string, Record<string, unknown>>> | null = null;

vi.mock('../store', () => ({
  useEditorStore: Object.assign(
    () => ({}),
    {
      getState: () => ({
        data: mockData,
        deleteSubstepDescription: mockDeleteSubstepDescription,
        deleteSubstepNote: mockDeleteSubstepNote,
        deleteNote: mockDeleteNote,
        deleteSubstep: mockDeleteSubstep,
        deleteSubstepImage: mockDeleteSubstepImage,
        deleteSubstepTutorial: mockDeleteSubstepTutorial,
        deleteSubstepPartTool: mockDeleteSubstepPartTool,
        addAssembly: mockAddAssembly,
        deleteAssembly: mockDeleteAssembly,
        updateAssembly: mockUpdateAssembly,
        assignStepToAssembly: mockAssignStepToAssembly,
        updateStep: mockUpdateStep,
        addVideoFrameArea: mockAddVideoFrameArea,
        deletePartTool: mockDeletePartTool,
        deleteStep: mockDeleteStep,
      }),
    }
  ),
}));

import { useEditCallbacks } from './useEditCallbacks';

beforeEach(() => {
  vi.clearAllMocks();
  mockData = null;
});

describe('useEditCallbacks', () => {
  it('onDeleteDescription delegates to store.deleteSubstepDescription', () => {
    const { result } = renderHook(() => useEditCallbacks());
    result.current.onDeleteDescription!('desc-1');
    expect(mockDeleteSubstepDescription).toHaveBeenCalledWith('desc-1');
  });

  it('onDeleteNote calls both deleteSubstepNote and deleteNote', () => {
    mockData = {
      substepNotes: {
        'sn-1': { noteId: 'note-42' },
      },
    };
    const { result } = renderHook(() => useEditCallbacks());
    result.current.onDeleteNote!('sn-1');
    expect(mockDeleteSubstepNote).toHaveBeenCalledWith('sn-1');
    expect(mockDeleteNote).toHaveBeenCalledWith('note-42');
  });

  it('onDeleteNote is no-op when substepNote not found', () => {
    mockData = { substepNotes: {} };
    const { result } = renderHook(() => useEditCallbacks());
    result.current.onDeleteNote!('nonexistent');
    expect(mockDeleteSubstepNote).not.toHaveBeenCalled();
    expect(mockDeleteNote).not.toHaveBeenCalled();
  });

  it('onDeleteSubstep delegates to store.deleteSubstep', () => {
    const { result } = renderHook(() => useEditCallbacks());
    result.current.onDeleteSubstep!('sub-1');
    expect(mockDeleteSubstep).toHaveBeenCalledWith('sub-1');
  });

  it('onDeleteImage deletes all image rows for the substep', () => {
    mockData = {
      substeps: {
        'sub-1': { imageRowIds: ['img-1', 'img-2', 'img-3'] },
      },
    };
    const { result } = renderHook(() => useEditCallbacks());
    result.current.onDeleteImage!('sub-1');
    expect(mockDeleteSubstepImage).toHaveBeenCalledTimes(3);
    expect(mockDeleteSubstepImage).toHaveBeenCalledWith('img-1');
    expect(mockDeleteSubstepImage).toHaveBeenCalledWith('img-2');
    expect(mockDeleteSubstepImage).toHaveBeenCalledWith('img-3');
  });

  it('onDeleteImage is no-op when substep not found', () => {
    mockData = { substeps: {} };
    const { result } = renderHook(() => useEditCallbacks());
    result.current.onDeleteImage!('nonexistent');
    expect(mockDeleteSubstepImage).not.toHaveBeenCalled();
  });

  it('onDeleteTutorial deletes the tutorial at the given index', () => {
    mockData = {
      substeps: {
        'sub-1': { tutorialRowIds: ['ref-a', 'ref-b', 'ref-c'] },
      },
    };
    const { result } = renderHook(() => useEditCallbacks());
    result.current.onDeleteTutorial!(1, 'sub-1');
    expect(mockDeleteSubstepTutorial).toHaveBeenCalledWith('ref-b');
  });

  it('onDeleteTutorial is no-op when substep not found', () => {
    mockData = { substeps: {} };
    const { result } = renderHook(() => useEditCallbacks());
    result.current.onDeleteTutorial!(0, 'nonexistent');
    expect(mockDeleteSubstepTutorial).not.toHaveBeenCalled();
  });

  it('onDeletePartTool deletes all substepPartTool rows matching that partToolId', () => {
    mockData = {
      substepPartTools: {
        'spt-1': { id: 'spt-1', partToolId: 'pt-x' },
        'spt-2': { id: 'spt-2', partToolId: 'pt-y' },
        'spt-3': { id: 'spt-3', partToolId: 'pt-x' },
      },
    };
    const { result } = renderHook(() => useEditCallbacks());
    result.current.onDeletePartTool!('pt-x');
    expect(mockDeleteSubstepPartTool).toHaveBeenCalledTimes(2);
    expect(mockDeleteSubstepPartTool).toHaveBeenCalledWith('spt-1');
    expect(mockDeleteSubstepPartTool).toHaveBeenCalledWith('spt-3');
  });

  it('onAddAssembly calls store.addAssembly with correct shape', () => {
    mockData = {
      currentVersionId: 'v1',
      instructionId: 'i1',
      assemblies: { 'asm-1': { order: 3 } },
    } as unknown as Record<string, Record<string, Record<string, unknown>>>;
    const { result } = renderHook(() => useEditCallbacks());
    result.current.onAddAssembly!();
    expect(mockAddAssembly).toHaveBeenCalledTimes(1);
    const arg = mockAddAssembly.mock.calls[0][0];
    expect(arg).toHaveProperty('id');
    expect(arg).toHaveProperty('order', 4);
    expect(arg).toHaveProperty('title', null);
    expect(arg).toHaveProperty('stepIds');
    expect(arg.stepIds).toEqual([]);
  });

  it('onAddAssembly uses order=1 when no assemblies exist', () => {
    mockData = {
      currentVersionId: 'v1',
      instructionId: 'i1',
      assemblies: {},
    } as unknown as Record<string, Record<string, Record<string, unknown>>>;
    const { result } = renderHook(() => useEditCallbacks());
    result.current.onAddAssembly!();
    const arg = mockAddAssembly.mock.calls[0][0];
    expect(arg.order).toBe(1);
  });

  it('onDeleteAssembly calls store.deleteAssembly', () => {
    const { result } = renderHook(() => useEditCallbacks());
    result.current.onDeleteAssembly!('asm-1');
    expect(mockDeleteAssembly).toHaveBeenCalledWith('asm-1');
  });

  it('onRenameAssembly calls store.updateAssembly', () => {
    const { result } = renderHook(() => useEditCallbacks());
    result.current.onRenameAssembly!('asm-1', 'New Name');
    expect(mockUpdateAssembly).toHaveBeenCalledWith('asm-1', { title: 'New Name' });
  });

  it('onRenameAssembly with empty string sets title to null', () => {
    const { result } = renderHook(() => useEditCallbacks());
    result.current.onRenameAssembly!('asm-1', '');
    expect(mockUpdateAssembly).toHaveBeenCalledWith('asm-1', { title: null });
  });

  it('onMoveStepToAssembly calls store.assignStepToAssembly', () => {
    const { result } = renderHook(() => useEditCallbacks());
    result.current.onMoveStepToAssembly!('s1', 'asm-2');
    expect(mockAssignStepToAssembly).toHaveBeenCalledWith('s1', 'asm-2');
  });

  it('onRenameStep calls store.updateStep with title', () => {
    const { result } = renderHook(() => useEditCallbacks());
    result.current.onRenameStep!('step-1', 'New Title');
    expect(mockUpdateStep).toHaveBeenCalledWith('step-1', { title: 'New Title' });
  });

  it('onRenameStep with empty string sets title to null', () => {
    const { result } = renderHook(() => useEditCallbacks());
    result.current.onRenameStep!('step-1', '');
    expect(mockUpdateStep).toHaveBeenCalledWith('step-1', { title: null });
  });

  it('onMoveStepToAssembly with null unassigns step', () => {
    const { result } = renderHook(() => useEditCallbacks());
    result.current.onMoveStepToAssembly!('s1', null);
    expect(mockAssignStepToAssembly).toHaveBeenCalledWith('s1', null);
  });

  it('all callbacks are referentially stable across renders', () => {
    const { result, rerender } = renderHook(() => useEditCallbacks());
    const first = result.current;
    rerender();
    const second = result.current;

    expect(second.onDeleteDescription).toBe(first.onDeleteDescription);
    expect(second.onDeleteNote).toBe(first.onDeleteNote);
    expect(second.onDeleteSubstep).toBe(first.onDeleteSubstep);
    expect(second.onDeleteImage).toBe(first.onDeleteImage);
    expect(second.onDeleteTutorial).toBe(first.onDeleteTutorial);
    expect(second.onDeletePartTool).toBe(first.onDeletePartTool);
    expect(second.onAddAssembly).toBe(first.onAddAssembly);
    expect(second.onDeleteAssembly).toBe(first.onDeleteAssembly);
    expect(second.onRenameAssembly).toBe(first.onRenameAssembly);
    expect(second.onRenameStep).toBe(first.onRenameStep);
    expect(second.onMoveStepToAssembly).toBe(first.onMoveStepToAssembly);
  });

  describe('renderPreviewUpload', () => {
    function createMockPersistence(overrides?: Partial<PersistenceAdapter>): PersistenceAdapter {
      return {
        listProjects: vi.fn(),
        getProjectData: vi.fn(),
        saveChanges: vi.fn(),
        resolveMediaUrl: vi.fn((pid, rel) => `http://test/${pid}/${rel}`),
        ...overrides,
      } as PersistenceAdapter;
    }

    it('is undefined when no persistence is provided', () => {
      const { result } = renderHook(() => useEditCallbacks());
      expect(result.current.renderPreviewUpload).toBeUndefined();
    });

    it('is undefined when no projectId is provided', () => {
      const persistence = createMockPersistence({
        uploadStepPreviewImage: vi.fn(),
      });
      const { result } = renderHook(() => useEditCallbacks({ persistence }));
      expect(result.current.renderPreviewUpload).toBeUndefined();
    });

    it('is undefined when adapter has no uploadStepPreviewImage', () => {
      const persistence = createMockPersistence();
      const { result } = renderHook(() => useEditCallbacks({ persistence, projectId: 'proj-1' }));
      expect(result.current.renderPreviewUpload).toBeUndefined();
    });

    it('returns a ReactNode when persistence + projectId + adapter method are available', () => {
      const persistence = createMockPersistence({
        uploadStepPreviewImage: vi.fn(),
      });
      const { result } = renderHook(() => useEditCallbacks({ persistence, projectId: 'proj-1' }));
      expect(result.current.renderPreviewUpload).toBeDefined();
      const node = result.current.renderPreviewUpload!('step-1');
      expect(isValidElement(node)).toBe(true);
    });

    it('calls persistence.uploadStepPreviewImage and updates store on upload', async () => {
      mockData = {
        currentVersionId: 'v1',
      } as unknown as typeof mockData;

      const uploadResult: StepPreviewUploadResult = { success: true, vfaId: 'vfa-new' };
      const mockUpload = vi.fn().mockResolvedValue(uploadResult);
      const persistence = createMockPersistence({
        uploadStepPreviewImage: mockUpload,
        resolveMediaUrl: vi.fn(() => 'http://test/proj-1/media/frames/vfa-new/image'),
      });

      const resolveImageSource = (file: File) => ({ type: 'file' as const, file });
      const { result } = renderHook(() => useEditCallbacks({ persistence, projectId: 'proj-1', resolveImageSource }));

      // Extract the onUpload callback from the rendered element
      const node = result.current.renderPreviewUpload!('step-1');
      expect(isValidElement(node)).toBe(true);
      const element = node as ReactElement<{ onUpload: (file: File, crop: NormalizedCrop) => void }>;
      const onUpload = element.props.onUpload;

      const file = new File(['test'], 'test.png', { type: 'image/png' });
      const crop = { x: 0, y: 0, width: 1, height: 1 };
      onUpload(file, crop);

      await vi.waitFor(() => {
        expect(mockUpload).toHaveBeenCalledWith('proj-1', 'step-1', { type: 'file', file }, crop);
      });

      await vi.waitFor(() => {
        expect(mockUpdateStep).toHaveBeenCalledWith('step-1', { videoFrameAreaId: 'vfa-new' });
      });

      expect(mockAddVideoFrameArea).toHaveBeenCalledWith(expect.objectContaining({
        id: 'vfa-new',
        versionId: 'v1',
        type: 'PreviewImage',
        localPath: 'http://test/proj-1/media/frames/vfa-new/image',
      }));
    });
  });

  describe('renderAssemblyPreviewUpload', () => {
    function createMockPersistence(overrides?: Partial<PersistenceAdapter>): PersistenceAdapter {
      return {
        listProjects: vi.fn(),
        getProjectData: vi.fn(),
        saveChanges: vi.fn(),
        resolveMediaUrl: vi.fn((pid, rel) => `http://test/${pid}/${rel}`),
        ...overrides,
      } as PersistenceAdapter;
    }

    it('is undefined when no persistence is provided', () => {
      const { result } = renderHook(() => useEditCallbacks());
      expect(result.current.renderAssemblyPreviewUpload).toBeUndefined();
    });

    it('is undefined when adapter has no uploadAssemblyPreviewImage', () => {
      const persistence = createMockPersistence();
      const { result } = renderHook(() => useEditCallbacks({ persistence, projectId: 'proj-1' }));
      expect(result.current.renderAssemblyPreviewUpload).toBeUndefined();
    });

    it('returns a ReactNode when persistence + projectId + adapter method are available', () => {
      const persistence = createMockPersistence({
        uploadAssemblyPreviewImage: vi.fn(),
      });
      const { result } = renderHook(() => useEditCallbacks({ persistence, projectId: 'proj-1' }));
      expect(result.current.renderAssemblyPreviewUpload).toBeDefined();
      const node = result.current.renderAssemblyPreviewUpload!('asm-1');
      expect(isValidElement(node)).toBe(true);
    });

    it('calls persistence.uploadAssemblyPreviewImage and updates store on upload', async () => {
      mockData = {
        currentVersionId: 'v1',
      } as unknown as typeof mockData;

      const uploadResult: StepPreviewUploadResult = { success: true, vfaId: 'vfa-asm' };
      const mockUpload = vi.fn().mockResolvedValue(uploadResult);
      const persistence = createMockPersistence({
        uploadAssemblyPreviewImage: mockUpload,
        resolveMediaUrl: vi.fn(() => 'http://test/proj-1/media/frames/vfa-asm/image'),
      });

      const resolveImageSource = (file: File) => ({ type: 'file' as const, file });
      const { result } = renderHook(() => useEditCallbacks({ persistence, projectId: 'proj-1', resolveImageSource }));

      const node = result.current.renderAssemblyPreviewUpload!('asm-1');
      expect(isValidElement(node)).toBe(true);
      const element = node as ReactElement<{ onUpload: (file: File, crop: NormalizedCrop) => void }>;
      const onUpload = element.props.onUpload;

      const file = new File(['test'], 'test.png', { type: 'image/png' });
      const crop = { x: 0, y: 0, width: 1, height: 1 };
      onUpload(file, crop);

      await vi.waitFor(() => {
        expect(mockUpload).toHaveBeenCalledWith('proj-1', 'asm-1', { type: 'file', file }, crop);
      });

      await vi.waitFor(() => {
        expect(mockUpdateAssembly).toHaveBeenCalledWith('asm-1', { videoFrameAreaId: 'vfa-asm' });
      });

      expect(mockAddVideoFrameArea).toHaveBeenCalledWith(expect.objectContaining({
        id: 'vfa-asm',
        versionId: 'v1',
        type: 'PreviewImage',
        localPath: 'http://test/proj-1/media/frames/vfa-asm/image',
      }));
    });
  });
});
