import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid'),
}));

const mockSeekFrame = vi.fn();
let mockCurrentFrame = 0;

vi.mock('@monta-vis/viewer-core', () => ({
  useVideo: () => ({
    currentFrame: mockCurrentFrame,
    seekFrame: mockSeekFrame,
  }),
  rectToNormalized: (r: Record<string, number>) => r,
  normalizedToRect: (r: Record<string, number>) => r,
}));

const mockAddVideoFrameArea = vi.fn();
const mockUpdateVideoFrameArea = vi.fn();
const mockDeleteVideoFrameArea = vi.fn();
const mockAddSubstepImage = vi.fn();
const mockDeleteSubstepImage = vi.fn();
const mockAddPartToolVideoFrameArea = vi.fn();
const mockDeletePartToolVideoFrameArea = vi.fn();

interface MockVideoFrameArea {
  id: string;
  videoId: string;
  frameNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
}

interface MockData {
  videoFrameAreas: Record<string, MockVideoFrameArea>;
  substeps: Record<string, { id: string; imageRowIds: string[] }>;
  substepImages: Record<string, { id: string; videoFrameAreaId: string }>;
  partToolVideoFrameAreas: Record<string, { id: string; videoFrameAreaId: string; partToolId: string; order: number; isPreviewImage: boolean }>;
}

let mockData: MockData | null = null;

vi.mock('../store', () => ({
  useEditorStore: Object.assign(
    (selector?: (state: { data: MockData | null }) => unknown) => {
      if (selector) {
        return selector({ data: mockData });
      }
      return {
        addVideoFrameArea: mockAddVideoFrameArea,
        updateVideoFrameArea: mockUpdateVideoFrameArea,
        deleteVideoFrameArea: mockDeleteVideoFrameArea,
        addSubstepImage: mockAddSubstepImage,
        deleteSubstepImage: mockDeleteSubstepImage,
        addPartToolVideoFrameArea: mockAddPartToolVideoFrameArea,
        deletePartToolVideoFrameArea: mockDeletePartToolVideoFrameArea,
      };
    },
    {
      getState: () => ({ data: mockData }),
    }
  ),
}));

import { useVideoFrameAreaManager } from './useVideoFrameAreaManager';

const defaultRect = { x: 10, y: 20, width: 100, height: 50 };

function emptyData(): MockData {
  return {
    videoFrameAreas: {},
    substeps: {},
    substepImages: {},
    partToolVideoFrameAreas: {},
  };
}

describe('useVideoFrameAreaManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentFrame = 0;
    mockData = emptyData();
  });

  it('returns empty areas when no data', () => {
    mockData = null;

    const { result } = renderHook(() =>
      useVideoFrameAreaManager({
        videoId: 'vid-1',
        versionId: 'ver-1',
        selectedSubstepId: null,
      }),
    );

    expect(result.current.areasForCurrentFrame).toEqual([]);
  });

  it('returns null from createImageArea when no selectedSubstepId', () => {
    const { result } = renderHook(() =>
      useVideoFrameAreaManager({
        videoId: 'vid-1',
        versionId: 'ver-1',
        selectedSubstepId: null,
      }),
    );

    let outcome: unknown = undefined;
    act(() => {
      outcome = result.current.createImageArea(defaultRect);
    });

    expect(outcome).toBeNull();
    expect(mockAddVideoFrameArea).not.toHaveBeenCalled();
  });

  it('returns null from createImageArea when no videoId', () => {
    const { result } = renderHook(() =>
      useVideoFrameAreaManager({
        videoId: null,
        versionId: 'ver-1',
        selectedSubstepId: 'sub-1',
      }),
    );

    let outcome: unknown = undefined;
    act(() => {
      outcome = result.current.createImageArea(defaultRect);
    });

    expect(outcome).toBeNull();
    expect(mockAddVideoFrameArea).not.toHaveBeenCalled();
  });

  it('createImageArea creates area + SubstepImage junction', () => {
    mockData = {
      ...emptyData(),
      substeps: {
        'sub-1': { id: 'sub-1', imageRowIds: ['img-1'] },
      },
    };

    const { result } = renderHook(() =>
      useVideoFrameAreaManager({
        videoId: 'vid-1',
        versionId: 'ver-1',
        selectedSubstepId: 'sub-1',
      }),
    );

    let outcome: unknown = undefined;
    act(() => {
      outcome = result.current.createImageArea(defaultRect);
    });

    expect(outcome).toEqual({ areaId: 'mock-uuid', junctionId: 'mock-uuid' });
    expect(mockAddVideoFrameArea).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'mock-uuid',
        videoId: 'vid-1',
        type: 'SubstepImage',
      }),
    );
    expect(mockAddSubstepImage).toHaveBeenCalledWith(
      expect.objectContaining({
        videoFrameAreaId: 'mock-uuid',
        substepId: 'sub-1',
        order: 1,
      }),
    );
  });

  it('createPartToolScanArea creates area + PartToolVideoFrameArea junction', () => {
    const { result } = renderHook(() =>
      useVideoFrameAreaManager({
        videoId: 'vid-1',
        versionId: 'ver-1',
        selectedSubstepId: null,
      }),
    );

    let outcome: unknown = undefined;
    act(() => {
      outcome = result.current.createPartToolScanArea(defaultRect, 'pt-1');
    });

    expect(outcome).toEqual({ areaId: 'mock-uuid' });
    expect(mockAddVideoFrameArea).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'mock-uuid',
        videoId: 'vid-1',
        type: 'PartToolScan',
      }),
    );
    expect(mockAddPartToolVideoFrameArea).toHaveBeenCalledWith(
      expect.objectContaining({
        videoFrameAreaId: 'mock-uuid',
        partToolId: 'pt-1',
        order: 0,
        isPreviewImage: true,
      }),
    );
  });

  it('createPartToolAreaOnly creates area without junction', () => {
    const { result } = renderHook(() =>
      useVideoFrameAreaManager({
        videoId: 'vid-1',
        versionId: 'ver-1',
        selectedSubstepId: null,
      }),
    );

    let outcome: unknown = undefined;
    act(() => {
      outcome = result.current.createPartToolAreaOnly(defaultRect);
    });

    expect(outcome).toEqual({ areaId: 'mock-uuid' });
    expect(mockAddVideoFrameArea).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'mock-uuid',
        videoId: 'vid-1',
        type: 'PartToolScan',
      }),
    );
    expect(mockAddSubstepImage).not.toHaveBeenCalled();
    expect(mockAddPartToolVideoFrameArea).not.toHaveBeenCalled();
  });

  it('deleteArea cascades to SubstepImage junction', () => {
    mockData = {
      ...emptyData(),
      videoFrameAreas: {
        'area-1': {
          id: 'area-1',
          videoId: 'vid-1',
          frameNumber: 0,
          x: 10,
          y: 20,
          width: 100,
          height: 50,
          type: 'SubstepImage',
        },
      },
      substepImages: {
        'si-1': { id: 'si-1', videoFrameAreaId: 'area-1' },
      },
    };

    const { result } = renderHook(() =>
      useVideoFrameAreaManager({
        videoId: 'vid-1',
        versionId: 'ver-1',
        selectedSubstepId: null,
      }),
    );

    act(() => {
      result.current.deleteArea('area-1');
    });

    expect(mockDeleteSubstepImage).toHaveBeenCalledWith('si-1');
    expect(mockDeleteVideoFrameArea).toHaveBeenCalledWith('area-1');
  });

  it('deleteArea cascades to PartToolVideoFrameArea junction', () => {
    mockData = {
      ...emptyData(),
      videoFrameAreas: {
        'area-2': {
          id: 'area-2',
          videoId: 'vid-1',
          frameNumber: 0,
          x: 10,
          y: 20,
          width: 100,
          height: 50,
          type: 'PartToolScan',
        },
      },
      partToolVideoFrameAreas: {
        'ptva-1': {
          id: 'ptva-1',
          videoFrameAreaId: 'area-2',
          partToolId: 'pt-1',
          order: 0,
          isPreviewImage: true,
        },
      },
    };

    const { result } = renderHook(() =>
      useVideoFrameAreaManager({
        videoId: 'vid-1',
        versionId: 'ver-1',
        selectedSubstepId: null,
      }),
    );

    act(() => {
      result.current.deleteArea('area-2');
    });

    expect(mockDeletePartToolVideoFrameArea).toHaveBeenCalledWith('ptva-1');
    expect(mockDeleteVideoFrameArea).toHaveBeenCalledWith('area-2');
  });

  it('updateArea normalizes and calls updateVideoFrameArea', () => {
    const { result } = renderHook(() =>
      useVideoFrameAreaManager({
        videoId: 'vid-1',
        versionId: 'ver-1',
        selectedSubstepId: null,
      }),
    );

    act(() => {
      result.current.updateArea('area-1', defaultRect);
    });

    expect(mockUpdateVideoFrameArea).toHaveBeenCalledWith('area-1', {
      x: 10,
      y: 20,
      width: 100,
      height: 50,
    });
  });

  it('jumpToAreaFrame calls seekFrame with area frame number', () => {
    mockData = {
      ...emptyData(),
      videoFrameAreas: {
        'area-1': {
          id: 'area-1',
          videoId: 'vid-1',
          frameNumber: 42,
          x: 10,
          y: 20,
          width: 100,
          height: 50,
          type: 'SubstepImage',
        },
      },
    };

    const { result } = renderHook(() =>
      useVideoFrameAreaManager({
        videoId: 'vid-1',
        versionId: 'ver-1',
        selectedSubstepId: null,
      }),
    );

    act(() => {
      result.current.jumpToAreaFrame('area-1');
    });

    expect(mockSeekFrame).toHaveBeenCalledWith(42);
    expect(result.current.selectedAreaId).toBe('area-1');
  });
});
