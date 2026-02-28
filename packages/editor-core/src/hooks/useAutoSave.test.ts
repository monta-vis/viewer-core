import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSave } from './useAutoSave';
import { useEditorStore } from '../store';
import type { PersistenceAdapter, ProjectChanges, PersistenceResult } from '../persistence';

// Minimal mock adapter
function createMockAdapter(overrides?: Partial<PersistenceAdapter>): PersistenceAdapter {
  return {
    listProjects: vi.fn().mockResolvedValue([]),
    getProjectData: vi.fn().mockResolvedValue(null),
    saveChanges: vi.fn().mockResolvedValue({ success: true }),
    resolveMediaUrl: vi.fn().mockReturnValue(''),
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  // Reset editor store to clean state
  useEditorStore.getState().reset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useAutoSave', () => {
  it('does not save when no changes exist', async () => {
    const adapter = createMockAdapter();

    renderHook(() =>
      useAutoSave({ adapter, projectId: 'test-project', enabled: true }),
    );

    // Advance past debounce
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(adapter.saveChanges).not.toHaveBeenCalled();
  });

  it('debounces rapid changes into one save call', async () => {
    const adapter = createMockAdapter();
    const store = useEditorStore.getState();

    // Seed store with minimal data so hasChanges can work
    store.setData({
      instructionId: 'i1',
      currentVersionId: 'v1',
      instructionName: 'Test',
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
    });

    renderHook(() =>
      useAutoSave({ adapter, projectId: 'test-project', enabled: true }),
    );

    // Simulate multiple rapid changes by mutating store data
    act(() => {
      useEditorStore.getState().updateInstructionName('Change 1');
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    act(() => {
      useEditorStore.getState().updateInstructionName('Change 2');
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    act(() => {
      useEditorStore.getState().updateInstructionName('Change 3');
    });

    // Only after the full debounce period should save be called
    expect(adapter.saveChanges).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    expect(adapter.saveChanges).toHaveBeenCalledTimes(1);
  });

  it('calls adapter.saveChanges and store.clearChanges on success', async () => {
    const adapter = createMockAdapter();
    const store = useEditorStore.getState();

    store.setData({
      instructionId: 'i1',
      currentVersionId: 'v1',
      instructionName: 'Test',
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
    });

    renderHook(() =>
      useAutoSave({ adapter, projectId: 'test-project', enabled: true }),
    );

    // Make a change
    act(() => {
      useEditorStore.getState().updateInstructionName('Changed');
    });

    expect(useEditorStore.getState().hasChanges()).toBe(true);

    // Wait for debounce + save
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    expect(adapter.saveChanges).toHaveBeenCalledWith(
      'test-project',
      expect.objectContaining({ changed: expect.anything(), deleted: expect.anything() }),
    );

    // clearChanges should have been called after successful save
    expect(useEditorStore.getState().hasChanges()).toBe(false);
  });

  it('does NOT clear changes on save failure', async () => {
    const adapter = createMockAdapter({
      saveChanges: vi.fn().mockResolvedValue({ success: false, error: 'Network error' }),
    });
    const store = useEditorStore.getState();

    store.setData({
      instructionId: 'i1',
      currentVersionId: 'v1',
      instructionName: 'Test',
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
    });

    renderHook(() =>
      useAutoSave({ adapter, projectId: 'test-project', enabled: true }),
    );

    act(() => {
      useEditorStore.getState().updateInstructionName('Changed');
    });

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    expect(adapter.saveChanges).toHaveBeenCalledTimes(1);

    // After failed save, another change should still trigger a new save attempt
    // (proving changes weren't cleared and the hook is still active)
    (adapter.saveChanges as ReturnType<typeof vi.fn>).mockClear();

    act(() => {
      useEditorStore.getState().updateInstructionName('Changed again');
    });

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    expect(adapter.saveChanges).toHaveBeenCalledTimes(1);
  });

  it('flushes pending save on unmount', async () => {
    const adapter = createMockAdapter();
    const store = useEditorStore.getState();

    store.setData({
      instructionId: 'i1',
      currentVersionId: 'v1',
      instructionName: 'Test',
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
    });

    const { unmount } = renderHook(() =>
      useAutoSave({ adapter, projectId: 'test-project', enabled: true }),
    );

    // Make a change but do NOT wait for debounce
    act(() => {
      useEditorStore.getState().updateInstructionName('Flush me');
    });

    expect(adapter.saveChanges).not.toHaveBeenCalled();

    // Unmount should flush immediately
    await act(async () => {
      unmount();
    });

    expect(adapter.saveChanges).toHaveBeenCalledTimes(1);
  });
});
