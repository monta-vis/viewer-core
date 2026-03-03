import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

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
    expect(second.onMoveStepToAssembly).toBe(first.onMoveStepToAssembly);
  });
});
