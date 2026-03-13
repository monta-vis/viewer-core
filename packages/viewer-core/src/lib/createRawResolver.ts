/**
 * Factory for raw-mode MediaResolver.
 *
 * Uses source videos and live frame capture (editor mode).
 * Delegates to existing utility functions — no logic is reinvented here.
 */

import type { InstructionData } from '@/features/instruction';
import { resolveRawFrameCapture, resolvePartToolFrameCapture } from '@/features/instruction-view/utils/resolveRawFrameCapture';
import { buildVideoEntry } from '@/features/instruction-view/utils/buildVideoEntry';
import type { MediaResolver, ResolvedImage, FrameCacheProvider, FrameCacheKey } from './mediaResolver';
import { sortPartToolJunctions } from './mediaResolver';

export interface RawResolverConfig {
  folderName: string;
  data: InstructionData;
  resolveSourceVideoUrl: (video: { videoPath?: string | null }, fallback: string) => string;
  frameCache?: FrameCacheProvider;
}

export function createRawResolver(config: RawResolverConfig): MediaResolver {
  const { folderName, data, resolveSourceVideoUrl, frameCache } = config;

  const resolver: MediaResolver = {
    mode: 'raw',
    folderName,

    resolveImage(areaId: string): ResolvedImage | null {
      const area = data.videoFrameAreas[areaId];
      if (!area) {
        console.warn('[createRawResolver] resolveImage: no VideoFrameArea found for', areaId);
        return null;
      }

      const captureData = resolveRawFrameCapture(area, data.videos, folderName);
      if (!captureData) {
        console.warn('[createRawResolver] resolveImage: no frame capture data for area', areaId);
        return null;
      }

      // Check cache first
      if (frameCache) {
        const cacheKey: FrameCacheKey = {
          videoId: captureData.videoId,
          frameNumber: captureData.frameNumber,
          cropArea: captureData.cropArea,
        };
        const cached = frameCache.get(cacheKey);
        if (cached) {
          return { kind: 'url', url: cached };
        }
      }

      return { kind: 'frameCapture', data: captureData };
    },

    resolveAllPartToolImages(partToolId: string): ResolvedImage[] {
      const junctions = Object.values(data.partToolVideoFrameAreas)
        .filter((j) => j.partToolId === partToolId);

      if (junctions.length === 0) return [];

      const sorted = sortPartToolJunctions(junctions);

      const results: ResolvedImage[] = [];
      for (const junction of sorted) {
        const image = resolver.resolveImage(junction.videoFrameAreaId);
        if (image) results.push(image);
      }
      return results;
    },

    resolvePartToolImage(partToolId: string): ResolvedImage | null {
      // With cache, resolve all to pick the best cached result
      if (frameCache) {
        const all = resolver.resolveAllPartToolImages(partToolId);
        return all[0] ?? null;
      }

      // Without cache, use the optimized single-result function
      const captureData = resolvePartToolFrameCapture(
        partToolId,
        data.partToolVideoFrameAreas,
        data.videoFrameAreas,
        data.videos,
        folderName,
      );
      if (!captureData) return null;
      return { kind: 'frameCapture', data: captureData };
    },

    resolveVideo(substepId: string) {
      const substep = data.substeps[substepId];
      if (!substep) {
        console.warn('[createRawResolver] resolveVideo: no substep found for', substepId);
        return null;
      }

      return buildVideoEntry(substep, data, {
        useRawVideo: true,
        folderName,
        resolveSourceVideoUrl,
      });
    },
  };

  return resolver;
}
