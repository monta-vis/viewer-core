import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useViewerData } from '@monta-vis/viewer-core';
import type { InstructionData } from '@monta-vis/viewer-core';
import { EditorProvider } from './EditorProvider';
import { useEditorStore } from './store';
import { usePersistence } from './persistence';
import type { PersistenceAdapter } from './persistence';

function createMockAdapter(): PersistenceAdapter {
  return {
    listProjects: vi.fn().mockResolvedValue([]),
    getProjectData: vi.fn().mockResolvedValue({}),
    saveChanges: vi.fn().mockResolvedValue({ success: true }),
    resolveMediaUrl: vi.fn().mockReturnValue(''),
  };
}

function createMockData(): InstructionData {
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
    currentVersionId: 'ver-1',
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
    substepReferences: {},
    safetyIcons: {},
  };
}

describe('EditorProvider', () => {
  it('provides persistence adapter to children', () => {
    const adapter = createMockAdapter();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <EditorProvider adapter={adapter}>{children}</EditorProvider>
    );

    const { result } = renderHook(() => usePersistence(), { wrapper });
    expect(result.current).toBe(adapter);
  });

  it('syncs editor store data to ViewerDataProvider', () => {
    const adapter = createMockAdapter();
    const mockData = createMockData();

    // Set data in the store before rendering
    act(() => {
      useEditorStore.getState().setData(mockData);
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <EditorProvider adapter={adapter}>{children}</EditorProvider>
    );

    const { result } = renderHook(() => useViewerData(), { wrapper });
    expect(result.current).toEqual(mockData);

    // Clean up store
    act(() => {
      useEditorStore.getState().reset();
    });
  });

  it('provides null data when store is empty', () => {
    const adapter = createMockAdapter();

    // Ensure store is reset
    act(() => {
      useEditorStore.getState().reset();
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <EditorProvider adapter={adapter}>{children}</EditorProvider>
    );

    const { result } = renderHook(() => useViewerData(), { wrapper });
    expect(result.current).toBeNull();
  });
});
