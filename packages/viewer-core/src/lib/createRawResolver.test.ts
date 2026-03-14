import { describe, it, expect, vi } from 'vitest';
import { createRawResolver } from './createRawResolver';
import type { InstructionData } from '@/features/instruction';
import type { FrameCacheProvider } from './mediaResolver';

vi.mock('@/features/instruction-view/utils/resolveRawFrameCapture', () => ({
  resolveRawFrameCapture: (
    area: { videoId?: string | null; frameNumber?: number | null; x?: number | null; y?: number | null; width?: number | null; height?: number | null } | null | undefined,
    videos: Record<string, { id: string; videoPath?: string | null; fps: number }>,
    folderName: string,
  ) => {
    if (!area?.videoId || area.frameNumber === null || area.frameNumber === undefined) return null;
    const video = videos[area.videoId];
    if (!video?.videoPath) return null;
    return {
      videoSrc: `mvis-media://${folderName}/${video.videoPath}`,
      videoId: video.id,
      fps: video.fps,
      frameNumber: area.frameNumber,
      cropArea: area.x !== null
        ? { x: area.x, y: area.y, width: area.width, height: area.height }
        : undefined,
    };
  },
  resolvePartToolFrameCapture: (
    partToolId: string,
    partToolVideoFrameAreas: Record<string, { partToolId: string; videoFrameAreaId: string; isPreviewImage: boolean; order: number }>,
    videoFrameAreas: Record<string, { videoId?: string | null; frameNumber?: number | null; x?: number | null; y?: number | null; width?: number | null; height?: number | null }>,
    videos: Record<string, { id: string; videoPath?: string | null; fps: number }>,
    folderName: string,
  ) => {
    const junctions = Object.values(partToolVideoFrameAreas).filter((j) => j.partToolId === partToolId);
    if (junctions.length === 0) return null;
    const sorted = [...junctions].sort((a, b) => {
      if (a.isPreviewImage !== b.isPreviewImage) return a.isPreviewImage ? -1 : 1;
      return a.order - b.order;
    });
    for (const junction of sorted) {
      const area = videoFrameAreas[junction.videoFrameAreaId];
      if (!area?.videoId || area.frameNumber === null || area.frameNumber === undefined) continue;
      const video = videos[area.videoId];
      if (!video?.videoPath) continue;
      return {
        videoSrc: `mvis-media://${folderName}/${video.videoPath}`,
        videoId: video.id,
        fps: video.fps,
        frameNumber: area.frameNumber,
        cropArea: area.x !== null ? { x: area.x, y: area.y, width: area.width, height: area.height } : undefined,
      };
    }
    return null;
  },
}));

vi.mock('@/features/instruction-view/utils/buildVideoEntry', () => ({
  buildVideoEntry: vi.fn(
    (substep: { id: string }, data: Record<string, unknown>, opts: { useRawVideo: boolean; folderName: string }) => {
      // minimal stub that returns a plausible video entry for sub1
      const videos = (data as { videos: Record<string, { fps: number; width: number; height: number }> }).videos;
      const videoSections = (data as { videoSections: Record<string, { id: string; videoId: string; startFrame: number; endFrame: number; viewportKeyframeIds: string[] }> }).videoSections;
      const viewportKeyframes = (data as { viewportKeyframes: Record<string, { frameNumber: number }> }).viewportKeyframes;
      const substepVideoSections = (data as { substepVideoSections: Record<string, { substepId: string; videoSectionId: string }> }).substepVideoSections;

      const svs = Object.values(substepVideoSections).find((s) => s.substepId === substep.id);
      if (!svs) return null;
      const section = videoSections[svs.videoSectionId];
      if (!section) return null;
      const video = videos[section.videoId];
      if (!video) return null;

      return {
        startFrame: section.startFrame,
        endFrame: section.endFrame,
        fps: video.fps,
        videoAspectRatio: video.width / video.height,
        viewportKeyframes: section.viewportKeyframeIds.map((kfId: string) => ({
          frameNumber: viewportKeyframes[kfId].frameNumber + section.startFrame,
        })),
      };
    },
  ),
}));

vi.mock('@/lib/media', () => ({
  buildMediaUrl: (folder: string, path: string) => `mvis-media://${folder}/${path}`,
  MediaPaths: {
    frame: (id: string) => `media/frames/${id}/image`,
    frameBlurred: (id: string) => `media_blurred/frames/${id}/image`,
    substepVideo: (id: string) => `media/substeps/${id}/video`,
    substepVideoBlurred: (id: string) => `media_blurred/substeps/${id}/video`,
  },
  DEFAULT_FPS: 30,
  resolveFramePath: (vfaId: string, masterBlurred: boolean, vfaUseBlurred: boolean | null | undefined) =>
    masterBlurred && vfaUseBlurred ? `media_blurred/frames/${vfaId}/image` : `media/frames/${vfaId}/image`,
  resolveSubstepVideoPath: (id: string, master: boolean, substep: boolean | null | undefined) =>
    master && substep ? `media_blurred/substeps/${id}/video` : `media/substeps/${id}/video`,
}));

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
    substeps: {
      sub1: {
        id: 'sub1', versionId: 'v1', instructionId: 'i1', stepId: 's1',
        substepNumber: 1, title: 'Sub 1', videoFrameNumber: null,
        repeatCount: 1, repeatLabel: null, displayMode: 'default',
        imageRowIds: [], videoSectionRowIds: ['svs1'], partToolRowIds: [],
        noteRowIds: [], descriptionRowIds: [], tutorialRowIds: [],
      },
    },
    videos: {
      vid1: {
        id: 'vid1', versionId: 'v1', fps: 25, width: 1920, height: 1080,
        videoPath: 'C:/videos/source.mp4', sectionIds: ['sec1'], frameAreaIds: ['vfa1'],
      },
    },
    videoSections: {
      sec1: {
        id: 'sec1', versionId: 'v1', videoId: 'vid1', startFrame: 100, endFrame: 200,
        fps: null, localPath: '/local/sec1.mp4', viewportKeyframeIds: ['kf1'],
        contentAspectRatio: null,
      },
    },
    videoFrameAreas: {
      vfa1: {
        id: 'vfa1', versionId: 'v1', videoId: 'vid1', frameNumber: 42,
        x: 0.1, y: 0.2, width: 0.5, height: 0.6,
        type: 'SubstepImage', useBlurred: false,
      },
      vfa_no_video: {
        id: 'vfa_no_video', versionId: 'v1', videoId: null, frameNumber: 10,
        x: null, y: null, width: null, height: null,
        type: 'SubstepImage',
      },
      vfa_safety_icon: {
        id: 'vfa_safety_icon', versionId: 'v1', videoId: null, frameNumber: 0,
        x: null, y: null, width: null, height: null,
        type: 'SafetyIcon',
      },
    },
    viewportKeyframes: {
      kf1: {
        id: 'kf1', versionId: 'v1', videoSectionId: 'sec1',
        frameNumber: 10, x: 0, y: 0, width: 1, height: 1,
      },
    },
    partTools: {},
    notes: {},
    substepImages: {},
    substepPartTools: {},
    substepNotes: {},
    substepDescriptions: {},
    substepVideoSections: {
      svs1: { id: 'svs1', versionId: 'v1', substepId: 'sub1', videoSectionId: 'sec1', order: 0 },
    },
    partToolVideoFrameAreas: {
      ptvfa1: { partToolId: 'pt1', videoFrameAreaId: 'vfa1', isPreviewImage: true, order: 0 },
    },
    drawings: {},
    substepTutorials: {},
    safetyIcons: {},
    variants: {},
    variantExclusions: {},
    ...overrides,
  } as unknown as InstructionData;
}

const defaultResolveSourceVideoUrl = (video: { videoPath?: string | null }, fallback: string) =>
  video.videoPath ? `mvis-media://proj/${video.videoPath}` : fallback;

describe('createRawResolver', () => {
  it('has mode "raw"', () => {
    const resolver = createRawResolver({
      folderName: 'proj',
      data: makeData(),
      resolveSourceVideoUrl: defaultResolveSourceVideoUrl,
    });
    expect(resolver.mode).toBe('raw');
  });

  describe('resolveImage', () => {
    it('returns { kind: "frameCapture" } with correct capture data', () => {
      const resolver = createRawResolver({
        folderName: 'proj',
        data: makeData(),
        resolveSourceVideoUrl: defaultResolveSourceVideoUrl,
      });
      const result = resolver.resolveImage('vfa1');
      expect(result).toEqual({
        kind: 'frameCapture',
        data: {
          videoSrc: 'mvis-media://proj/C:/videos/source.mp4',
          videoId: 'vid1',
          fps: 25,
          frameNumber: 42,
          cropArea: { x: 0.1, y: 0.2, width: 0.5, height: 0.6 },
        },
      });
    });

    it('returns { kind: "url" } when cache hits', () => {
      const cache: FrameCacheProvider = {
        get: vi.fn().mockReturnValue('data:image/jpeg;base64,cached'),
        set: vi.fn(),
      };
      const resolver = createRawResolver({
        folderName: 'proj',
        data: makeData(),
        resolveSourceVideoUrl: defaultResolveSourceVideoUrl,
        frameCache: cache,
      });
      const result = resolver.resolveImage('vfa1');
      expect(result).toEqual({
        kind: 'url',
        url: 'data:image/jpeg;base64,cached',
      });
      expect(cache.get).toHaveBeenCalledWith({
        videoId: 'vid1',
        frameNumber: 42,
        cropArea: { x: 0.1, y: 0.2, width: 0.5, height: 0.6 },
      });
    });

    it('returns { kind: "frameCapture" } when cache misses', () => {
      const cache: FrameCacheProvider = {
        get: vi.fn().mockReturnValue(null),
        set: vi.fn(),
      };
      const resolver = createRawResolver({
        folderName: 'proj',
        data: makeData(),
        resolveSourceVideoUrl: defaultResolveSourceVideoUrl,
        frameCache: cache,
      });
      const result = resolver.resolveImage('vfa1');
      expect(result?.kind).toBe('frameCapture');
    });

    it('returns { kind: "url" } for SafetyIcon VFA (videoId is null)', () => {
      const resolver = createRawResolver({
        folderName: 'proj',
        data: makeData(),
        resolveSourceVideoUrl: defaultResolveSourceVideoUrl,
      });
      const result = resolver.resolveImage('vfa_safety_icon');
      expect(result).toEqual({
        kind: 'url',
        url: 'mvis-media://proj/media/frames/vfa_safety_icon/image',
      });
    });

    it('returns { kind: "url" } for area without videoId (processed fallback)', () => {
      const resolver = createRawResolver({
        folderName: 'proj',
        data: makeData(),
        resolveSourceVideoUrl: defaultResolveSourceVideoUrl,
      });
      expect(resolver.resolveImage('vfa_no_video')).toEqual({
        kind: 'url',
        url: 'mvis-media://proj/media/frames/vfa_no_video/image',
      });
    });

    it('uses blurred path for processed fallback', () => {
      const resolver = createRawResolver({
        folderName: 'proj',
        data: makeData({
          useBlurred: true,
          videoFrameAreas: {
            vfa_blurred: {
              id: 'vfa_blurred', versionId: 'v1', videoId: null, frameNumber: 10,
              x: null, y: null, width: null, height: null,
              type: 'SubstepImage', useBlurred: true,
            },
          },
        }),
        resolveSourceVideoUrl: defaultResolveSourceVideoUrl,
      });
      expect(resolver.resolveImage('vfa_blurred')).toEqual({
        kind: 'url',
        url: 'mvis-media://proj/media_blurred/frames/vfa_blurred/image',
      });
    });

    it('falls back to processed path when video record is missing', () => {
      const resolver = createRawResolver({
        folderName: 'proj',
        data: makeData({
          videoFrameAreas: {
            vfa_missing_video: {
              id: 'vfa_missing_video', versionId: 'v1', videoId: 'nonexistent', frameNumber: 10,
              x: null, y: null, width: null, height: null,
              type: 'SubstepImage', useBlurred: false,
            },
          },
        }),
        resolveSourceVideoUrl: defaultResolveSourceVideoUrl,
      });
      expect(resolver.resolveImage('vfa_missing_video')).toEqual({
        kind: 'url',
        url: 'mvis-media://proj/media/frames/vfa_missing_video/image',
      });
    });

    it('returns null for nonexistent area', () => {
      const resolver = createRawResolver({
        folderName: 'proj',
        data: makeData(),
        resolveSourceVideoUrl: defaultResolveSourceVideoUrl,
      });
      expect(resolver.resolveImage('nonexistent')).toBeNull();
    });
  });

  describe('resolvePartToolImage', () => {
    it('returns frame capture for best matching area', () => {
      const resolver = createRawResolver({
        folderName: 'proj',
        data: makeData(),
        resolveSourceVideoUrl: defaultResolveSourceVideoUrl,
      });
      const result = resolver.resolvePartToolImage('pt1');
      expect(result?.kind).toBe('frameCapture');
      if (result?.kind === 'frameCapture') {
        expect(result.data.frameNumber).toBe(42);
      }
    });

    it('returns null for unknown partTool', () => {
      const resolver = createRawResolver({
        folderName: 'proj',
        data: makeData(),
        resolveSourceVideoUrl: defaultResolveSourceVideoUrl,
      });
      expect(resolver.resolvePartToolImage('unknown')).toBeNull();
    });
  });

  describe('resolveVideo', () => {
    it('returns raw video entry with viewport keyframes', () => {
      const resolver = createRawResolver({
        folderName: 'proj',
        data: makeData(),
        resolveSourceVideoUrl: defaultResolveSourceVideoUrl,
      });
      const result = resolver.resolveVideo('sub1');
      expect(result).not.toBeNull();
      expect(result!.startFrame).toBe(100);
      expect(result!.endFrame).toBe(200);
      expect(result!.fps).toBe(25);
      expect(result!.viewportKeyframes).toHaveLength(1);
      expect(result!.viewportKeyframes[0].frameNumber).toBe(110); // 10 + 100 (section start)
      expect(result!.videoAspectRatio).toBeCloseTo(1920 / 1080);
    });

    it('returns null for unknown substep', () => {
      const resolver = createRawResolver({
        folderName: 'proj',
        data: makeData(),
        resolveSourceVideoUrl: defaultResolveSourceVideoUrl,
      });
      expect(resolver.resolveVideo('nonexistent')).toBeNull();
    });
  });
});
