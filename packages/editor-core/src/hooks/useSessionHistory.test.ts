import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSessionHistory } from './useSessionHistory';
import { useEditorStore } from '../store';
import type { InstructionData } from '@monta-vis/viewer-core';

/** Minimal InstructionData factory for testing */
function makeData(name: string): InstructionData {
  return {
    instructionId: 'i1',
    currentVersionId: 'v1',
    instructionName: name,
    instructionDescription: null,
    instructionPreviewImageId: null,
    coverImageAreaId: null,
    articleNumber: null,
    estimatedDuration: null,
    sourceLanguage: 'en',
    assemblies: {},
    steps: {},
    substeps: {},
    substepImages: {},
    substepPartTools: {},
    substepNotes: {},
    substepDescriptions: {},
    substepTutorials: {},
    substepVideoSections: {},
    videoFrameAreas: {},
    videoSections: {},
    viewportKeyframes: {},
    videos: {},
    partTools: {},
    notes: {},
    partToolVideoFrameAreas: {},
    drawings: {},
  };
}

beforeEach(() => {
  useEditorStore.getState().reset();
});

describe('useSessionHistory', () => {
  it('captures initial snapshot on init', () => {
    useEditorStore.getState().setData(makeData('Initial'));

    const { result } = renderHook(() => useSessionHistory());

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('pushes snapshot after captureSnapshot call', () => {
    useEditorStore.getState().setData(makeData('Before'));

    const { result } = renderHook(() => useSessionHistory());

    act(() => {
      useEditorStore.getState().updateInstructionName('After');
      result.current.captureSnapshot();
    });

    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('undo() restores previous state via store.restoreData', () => {
    useEditorStore.getState().setData(makeData('Original'));

    const { result } = renderHook(() => useSessionHistory());

    act(() => {
      useEditorStore.getState().updateInstructionName('Edited');
      result.current.captureSnapshot();
    });

    expect(useEditorStore.getState().data?.instructionName).toBe('Edited');

    act(() => {
      result.current.undo();
    });

    expect(useEditorStore.getState().data?.instructionName).toBe('Original');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it('redo() restores next state', () => {
    useEditorStore.getState().setData(makeData('Original'));

    const { result } = renderHook(() => useSessionHistory());

    act(() => {
      useEditorStore.getState().updateInstructionName('Edited');
      result.current.captureSnapshot();
    });

    act(() => {
      result.current.undo();
    });

    expect(useEditorStore.getState().data?.instructionName).toBe('Original');

    act(() => {
      result.current.redo();
    });

    expect(useEditorStore.getState().data?.instructionName).toBe('Edited');
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('canUndo/canRedo track state correctly through multiple operations', () => {
    useEditorStore.getState().setData(makeData('V0'));

    const { result } = renderHook(() => useSessionHistory());

    // Make 3 edits
    act(() => {
      useEditorStore.getState().updateInstructionName('V1');
      result.current.captureSnapshot();
    });
    act(() => {
      useEditorStore.getState().updateInstructionName('V2');
      result.current.captureSnapshot();
    });
    act(() => {
      useEditorStore.getState().updateInstructionName('V3');
      result.current.captureSnapshot();
    });

    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);

    // Undo twice
    act(() => { result.current.undo(); });
    expect(useEditorStore.getState().data?.instructionName).toBe('V2');
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(true);

    act(() => { result.current.undo(); });
    expect(useEditorStore.getState().data?.instructionName).toBe('V1');
    expect(result.current.canRedo).toBe(true);

    // Redo once
    act(() => { result.current.redo(); });
    expect(useEditorStore.getState().data?.instructionName).toBe('V2');

    // New edit after undo should clear future
    act(() => {
      useEditorStore.getState().updateInstructionName('V2b');
      result.current.captureSnapshot();
    });
    expect(result.current.canRedo).toBe(false);
    expect(result.current.canUndo).toBe(true);
  });

  it('reset() clears all history', () => {
    useEditorStore.getState().setData(makeData('Before'));

    const { result } = renderHook(() => useSessionHistory());

    act(() => {
      useEditorStore.getState().updateInstructionName('After');
      result.current.captureSnapshot();
    });

    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.reset();
    });

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });
});
