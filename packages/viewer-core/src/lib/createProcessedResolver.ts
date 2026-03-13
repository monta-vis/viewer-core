/**
 * Factory for processed-mode MediaResolver.
 *
 * Uses pre-rendered images and merged substep videos (viewer/cloud mode).
 * Delegates to existing utility functions — no logic is reinvented here.
 */

import type { InstructionData } from '@/features/instruction';
import { buildMediaUrl, resolveFramePath } from '@/lib/media';
import { resolveAllPartToolImageUrls } from '@/features/instruction-view/utils/resolveAllPartToolImageUrls';
import { buildVideoEntry } from '@/features/instruction-view/utils/buildVideoEntry';
import type { MediaResolver, ResolvedImage } from './mediaResolver';

export interface ProcessedResolverConfig {
  data: InstructionData;
  folderName?: string;
  useBlurred?: boolean;
}

export function createProcessedResolver(config: ProcessedResolverConfig): MediaResolver {
  const { data, folderName, useBlurred: useBlurredOverride } = config;
  const masterBlurred = useBlurredOverride ?? data.useBlurred;

  const resolver: MediaResolver = {
    mode: 'processed',
    folderName,

    resolveImage(areaId: string): ResolvedImage | null {
      const area = data.videoFrameAreas[areaId];
      if (!area) {
        console.warn('[createProcessedResolver] resolveImage: no VideoFrameArea found for', areaId);
        return null;
      }

      if (folderName) {
        const mediaPath = resolveFramePath(areaId, masterBlurred, area.useBlurred);
        return { kind: 'url', url: buildMediaUrl(folderName, mediaPath) };
      }

      // Fallback for mweb/snapshot: use localPath
      if (area.localPath) {
        return { kind: 'url', url: area.localPath };
      }
      return null;
    },

    resolveAllPartToolImages(partToolId: string): ResolvedImage[] {
      const urls = resolveAllPartToolImageUrls(
        partToolId,
        folderName,
        data.partToolVideoFrameAreas,
        masterBlurred,
        data.videoFrameAreas,
      );
      return urls.map((url) => ({ kind: 'url' as const, url }));
    },

    resolvePartToolImage(partToolId: string): ResolvedImage | null {
      const all = resolver.resolveAllPartToolImages(partToolId);
      return all[0] ?? null;
    },

    resolveVideo(substepId: string) {
      const substep = data.substeps[substepId];
      if (!substep) {
        console.warn('[createProcessedResolver] resolveVideo: no substep found for', substepId);
        return null;
      }

      return buildVideoEntry(substep, data, {
        useRawVideo: false,
        folderName,
        resolveSourceVideoUrl: (_video, fallback) => fallback,
      });
    },
  };

  return resolver;
}
