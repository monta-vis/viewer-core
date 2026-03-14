import { describe, it, expect, vi } from 'vitest';
import { createProcessedResolver } from './createProcessedResolver';
import type { InstructionData } from '@/features/instruction';

vi.mock('@/lib/media', () => ({
  buildMediaUrl: (folder: string, path: string) => `mvis-media://${folder}/${path}`,
  MediaPaths: {
    frame: (id: string) => `media/frames/${id}/image`,
    frameBlurred: (id: string) => `media_blurred/frames/${id}/image`,
    substepVideo: (id: string) => `media/substeps/${id}/video`,
    substepVideoBlurred: (id: string) => `media_blurred/substeps/${id}/video`,
  },
  DEFAULT_FPS: 30,
  resolveFramePath: (id: string, master: boolean, vfa: boolean | null | undefined) =>
    master && vfa ? `media_blurred/frames/${id}/image` : `media/frames/${id}/image`,
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
        videoPath: 'video.mp4', sectionIds: ['sec1'], frameAreaIds: ['vfa1'],
      },
    },
    videoSections: {
      sec1: {
        id: 'sec1', versionId: 'v1', videoId: 'vid1', startFrame: 100, endFrame: 200,
        fps: null, localPath: null, viewportKeyframeIds: [], contentAspectRatio: 1.5,
      },
    },
    videoFrameAreas: {
      vfa1: {
        id: 'vfa1', versionId: 'v1', videoId: 'vid1', frameNumber: 42,
        x: 0.1, y: 0.2, width: 0.5, height: 0.6,
        type: 'SubstepImage', useBlurred: false,
      },
      vfa2: {
        id: 'vfa2', versionId: 'v1', videoId: 'vid1', frameNumber: 50,
        x: null, y: null, width: null, height: null,
        type: 'SubstepImage', useBlurred: true,
      },
    },
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
    partToolVideoFrameAreas: {
      ptvfa1: { partToolId: 'pt1', videoFrameAreaId: 'vfa1', isPreviewImage: true, order: 0 },
      ptvfa2: { partToolId: 'pt1', videoFrameAreaId: 'vfa2', isPreviewImage: false, order: 1 },
    },
    drawings: {},
    substepTutorials: {},
    safetyIcons: {},
    variants: {},
    variantExclusions: {},
    ...overrides,
  } as unknown as InstructionData;
}

describe('createProcessedResolver', () => {
  it('has mode "processed"', () => {
    const resolver = createProcessedResolver({ data: makeData(), folderName: 'proj' });
    expect(resolver.mode).toBe('processed');
  });

  describe('resolveImage', () => {
    it('returns { kind: "url" } with correct media path for valid area', () => {
      const resolver = createProcessedResolver({ data: makeData(), folderName: 'proj' });
      const result = resolver.resolveImage('vfa1');
      expect(result).toEqual({
        kind: 'url',
        url: 'mvis-media://proj/media/frames/vfa1/image',
      });
    });

    it('returns blurred URL when master + VFA blur flags are on', () => {
      const data = makeData({ useBlurred: true });
      // vfa2 has useBlurred: true
      const resolver = createProcessedResolver({ data, folderName: 'proj' });
      const result = resolver.resolveImage('vfa2');
      expect(result).toEqual({
        kind: 'url',
        url: 'mvis-media://proj/media_blurred/frames/vfa2/image',
      });
    });

    it('returns normal URL when master is off even if VFA blur is on', () => {
      const data = makeData({ useBlurred: false });
      const resolver = createProcessedResolver({ data, folderName: 'proj' });
      const result = resolver.resolveImage('vfa2'); // vfa2 has useBlurred: true
      expect(result).toEqual({
        kind: 'url',
        url: 'mvis-media://proj/media/frames/vfa2/image',
      });
    });

    it('returns null for missing area', () => {
      const resolver = createProcessedResolver({ data: makeData(), folderName: 'proj' });
      expect(resolver.resolveImage('nonexistent')).toBeNull();
    });

    it('uses localPath fallback when no folderName', () => {
      const data = makeData({
        videoFrameAreas: {
          vfa1: {
            id: 'vfa1', versionId: 'v1', videoId: 'vid1', frameNumber: 42,
            x: null, y: null, width: null, height: null,
            type: 'SubstepImage', localPath: '/images/frame1.png',
          },
        },
      } as Partial<InstructionData>);
      const resolver = createProcessedResolver({ data });
      const result = resolver.resolveImage('vfa1');
      expect(result).toEqual({ kind: 'url', url: '/images/frame1.png' });
    });

    it('returns null when no folderName and no localPath', () => {
      const data = makeData({
        videoFrameAreas: {
          vfa1: {
            id: 'vfa1', versionId: 'v1', videoId: 'vid1', frameNumber: 42,
            x: null, y: null, width: null, height: null,
            type: 'SubstepImage', localPath: null,
          },
        },
      } as Partial<InstructionData>);
      const resolver = createProcessedResolver({ data });
      expect(resolver.resolveImage('vfa1')).toBeNull();
    });
  });

  describe('resolvePartToolImage', () => {
    it('returns first sorted URL (preview first)', () => {
      const resolver = createProcessedResolver({ data: makeData(), folderName: 'proj' });
      const result = resolver.resolvePartToolImage('pt1');
      expect(result).toEqual({
        kind: 'url',
        url: 'mvis-media://proj/media/frames/vfa1/image',
      });
    });

    it('returns null for unknown partTool', () => {
      const resolver = createProcessedResolver({ data: makeData(), folderName: 'proj' });
      expect(resolver.resolvePartToolImage('unknown')).toBeNull();
    });
  });

  describe('resolveAllPartToolImages', () => {
    it('returns sorted URLs as ResolvedImage[]', () => {
      const resolver = createProcessedResolver({ data: makeData(), folderName: 'proj' });
      const result = resolver.resolveAllPartToolImages('pt1');
      expect(result).toHaveLength(2);
      // Preview first (vfa1), then by order (vfa2)
      expect(result[0]).toEqual({ kind: 'url', url: 'mvis-media://proj/media/frames/vfa1/image' });
      expect(result[1]).toEqual({ kind: 'url', url: 'mvis-media://proj/media/frames/vfa2/image' });
    });

    it('in mweb mode returns only VFAs with localPath and warns for missing ones', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const data = makeData({
        videoFrameAreas: {
          vfa1: {
            id: 'vfa1', versionId: 'v1', videoId: 'vid1', frameNumber: 42,
            x: null, y: null, width: null, height: null,
            type: 'SubstepImage', localPath: './images/frame1.png',
          },
          vfa2: {
            id: 'vfa2', versionId: 'v1', videoId: 'vid1', frameNumber: 50,
            x: null, y: null, width: null, height: null,
            type: 'SubstepImage', localPath: null,
          },
        },
      } as Partial<InstructionData>);

      // No folderName = mweb/cloud mode
      const resolver = createProcessedResolver({ data });
      const result = resolver.resolveAllPartToolImages('pt1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ kind: 'url', url: './images/frame1.png' });
      expect(warnSpy).toHaveBeenCalledWith(
        '[resolveAllPartToolImageUrls] VFA missing localPath in cloud mode:',
        'vfa2',
      );

      warnSpy.mockRestore();
    });
  });

  describe('resolveVideo', () => {
    it('returns processed video entry (startFrame: 0, merged sections)', () => {
      const resolver = createProcessedResolver({ data: makeData(), folderName: 'proj' });
      const result = resolver.resolveVideo('sub1');
      expect(result).not.toBeNull();
      expect(result!.startFrame).toBe(0);
      expect(result!.endFrame).toBe(100); // 200 - 100
      expect(result!.fps).toBe(25);
      expect(result!.viewportKeyframes).toEqual([]);
      expect(result!.videoSrc).toContain('mvis-media://proj/');
    });

    it('returns null for unknown substep', () => {
      const resolver = createProcessedResolver({ data: makeData(), folderName: 'proj' });
      expect(resolver.resolveVideo('nonexistent')).toBeNull();
    });
  });
});
