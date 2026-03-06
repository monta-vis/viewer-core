import { describe, it, expect, vi } from 'vitest';
import { buildVideoEntry, buildStandaloneVideoEntry } from './buildVideoEntry';
import type { InstructionData, Substep } from '@/features/instruction';

vi.mock('@/lib/media', () => ({
  buildMediaUrl: (folder: string, path: string) => `mvis-media://${folder}/${path}`,
  MediaPaths: { substepVideo: (id: string) => `media/substeps/${id}/video` },
  DEFAULT_FPS: 30,
}));

function makeSubstep(overrides: Partial<Substep> = {}): Substep {
  return {
    id: 'sub1',
    versionId: 'v1',
    instructionId: 'i1',
    stepId: 's1',
    substepNumber: 1,
    title: 'Sub 1',
    videoFrameNumber: null,
    repeatCount: 1,
    repeatLabel: null,
    displayMode: 'default',
    imageRowIds: [],
    videoSectionRowIds: ['svs1'],
    partToolRowIds: [],
    noteRowIds: [],
    descriptionRowIds: [],
    tutorialRowIds: [],
    ...overrides,
  } as Substep;
}

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
    videos: {
      vid1: {
        id: 'vid1', versionId: 'v1', fps: 25, width: 1920, height: 1080,
        videoPath: 'video.mp4', sectionIds: ['sec1'], frameAreaIds: [],
      },
    },
    videoSections: {
      sec1: {
        id: 'sec1', versionId: 'v1', videoId: 'vid1', startFrame: 100, endFrame: 200,
        fps: null, localPath: '/local/sec1.mp4', viewportKeyframeIds: [],
        contentAspectRatio: 1.5,
      },
    },
    videoFrameAreas: {},
    viewportKeyframes: {},
    partTools: {},
    notes: {},
    substepImages: {},
    substepPartTools: {},
    substepNotes: {},
    substepDescriptions: {},
    substepVideoSections: {
      svs1: { id: 'svs1', versionId: 'v1', substepId: 'sub1', videoSectionId: 'sec1', order: 0 },
    },
    partToolVideoFrameAreas: {},
    drawings: {},
    substepTutorials: {},
    safetyIcons: {},
    ...overrides,
  } as unknown as InstructionData;
}

const defaultOptions = {
  useRawVideo: false,
  folderName: 'my-project',
  resolveSourceVideoUrl: (_v: { videoPath?: string | null }, fallback: string) => fallback,
};

describe('buildVideoEntry', () => {
  it('returns entry for processed mode substep', () => {
    const substep = makeSubstep();
    const data = makeData();
    const result = buildVideoEntry(substep, data, defaultOptions);
    expect(result).not.toBeNull();
    expect(result!.videoSrc).toBe('mvis-media://my-project/media/substeps/sub1/video');
    expect(result!.startFrame).toBe(0);
    expect(result!.endFrame).toBe(100); // 200 - 100
    expect(result!.fps).toBe(25);
    expect(result!.viewportKeyframes).toEqual([]);
    expect(result!.videoAspectRatio).toBe(1);
    expect(result!.contentAspectRatio).toBe(1.5);
  });

  it('returns entry for raw-video mode substep', () => {
    const substep = makeSubstep();
    const data = makeData();
    const result = buildVideoEntry(substep, data, {
      useRawVideo: true,
      folderName: 'proj',
      resolveSourceVideoUrl: () => 'mvis-media://proj/video.mp4',
    });
    expect(result).not.toBeNull();
    expect(result!.videoSrc).toBe('mvis-media://proj/video.mp4');
    expect(result!.startFrame).toBe(100);
    expect(result!.endFrame).toBe(200);
    expect(result!.fps).toBe(25);
    expect(result!.videoAspectRatio).toBeCloseTo(1920 / 1080);
  });

  it('returns null for substep without video', () => {
    const substep = makeSubstep({ videoSectionRowIds: [] });
    const data = makeData();
    const result = buildVideoEntry(substep, data, defaultOptions);
    expect(result).toBeNull();
  });

  it('returns entry for standalone uploaded video', () => {
    const substep = makeSubstep();
    const data = makeData({
      videos: {},
      videoSections: {
        sec1: {
          id: 'sec1', versionId: 'v1', videoId: null, startFrame: 0, endFrame: 60,
          fps: 30, localPath: null, viewportKeyframeIds: [],
          contentAspectRatio: null,
        },
      },
    } as Partial<InstructionData>);
    const result = buildVideoEntry(substep, data, defaultOptions);
    expect(result).not.toBeNull();
    expect(result!.videoSrc).toBe('mvis-media://my-project/media/substeps/sub1/video');
    expect(result!.endFrame).toBe(60);
    expect(result!.fps).toBe(30);
  });

  it('handles multi-section substeps in raw mode', () => {
    const substep = makeSubstep({ videoSectionRowIds: ['svs1', 'svs2'] });
    const data = makeData({
      videoSections: {
        sec1: {
          id: 'sec1', versionId: 'v1', videoId: 'vid1', startFrame: 100, endFrame: 200,
          fps: null, localPath: '/local/sec1.mp4', viewportKeyframeIds: [],
        },
        sec2: {
          id: 'sec2', versionId: 'v1', videoId: 'vid1', startFrame: 300, endFrame: 400,
          fps: null, localPath: '/local/sec2.mp4', viewportKeyframeIds: [],
        },
      },
      substepVideoSections: {
        svs1: { id: 'svs1', versionId: 'v1', substepId: 'sub1', videoSectionId: 'sec1', order: 0 },
        svs2: { id: 'svs2', versionId: 'v1', substepId: 'sub1', videoSectionId: 'sec2', order: 1 },
      },
    } as Partial<InstructionData>);
    const result = buildVideoEntry(substep, data, {
      useRawVideo: true,
      folderName: 'proj',
      resolveSourceVideoUrl: () => 'mvis-media://proj/video.mp4',
    });
    expect(result).not.toBeNull();
    expect(result!.sections).toEqual([
      { startFrame: 100, endFrame: 200 },
      { startFrame: 300, endFrame: 400 },
    ]);
    expect(result!.startFrame).toBe(100);
    expect(result!.endFrame).toBe(400);
  });
});

describe('buildStandaloneVideoEntry', () => {
  it('builds entry with folder name', () => {
    const result = buildStandaloneVideoEntry('sub1', { fps: 24, startFrame: 0, endFrame: 120, contentAspectRatio: 1.77 }, 'folder');
    expect(result.videoSrc).toBe('mvis-media://folder/media/substeps/sub1/video');
    expect(result.fps).toBe(24);
    expect(result.endFrame).toBe(120);
    expect(result.contentAspectRatio).toBe(1.77);
  });

  it('uses DEFAULT_FPS when fps is null', () => {
    const result = buildStandaloneVideoEntry('sub1', { fps: null, startFrame: 0, endFrame: 60 }, 'folder');
    expect(result.fps).toBe(30); // mocked DEFAULT_FPS
  });

  it('uses relative URL when no folder name', () => {
    const result = buildStandaloneVideoEntry('sub1', { fps: 24, startFrame: 0, endFrame: 60 }, undefined);
    expect(result.videoSrc).toBe('./media/substeps/sub1/video');
  });
});
