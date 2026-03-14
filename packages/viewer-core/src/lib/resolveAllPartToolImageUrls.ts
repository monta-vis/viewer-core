import { buildMediaUrl, resolveFramePath } from '@/lib/media';
import { sortPartToolJunctions } from '@/lib/mediaResolver';

/**
 * Resolve ALL area image URLs for a PartTool (not just the first one).
 * Returns them sorted: preview images first, then by order.
 *
 * Used internally by createProcessedResolver.
 */
export function resolveAllPartToolImageUrls(
  partToolId: string,
  folderName: string | undefined,
  partToolVideoFrameAreas: Record<string, { partToolId: string; videoFrameAreaId: string; isPreviewImage: boolean; order: number }>,
  useBlurred?: boolean,
  videoFrameAreas?: Record<string, { localPath?: string | null; useBlurred?: boolean | null }>,
): string[] {
  const areas = Object.values(partToolVideoFrameAreas)
    .filter((a) => a.partToolId === partToolId);

  if (areas.length === 0) return [];

  const sorted = sortPartToolJunctions(areas);

  const urls: string[] = [];

  for (const area of sorted) {
    const areaId = area.videoFrameAreaId;

    if (folderName) {
      const vfaBlurred = videoFrameAreas?.[areaId]?.useBlurred;
      const mediaPath = resolveFramePath(areaId, !!useBlurred, vfaBlurred);
      urls.push(buildMediaUrl(folderName, mediaPath));
    } else {
      const localPath = videoFrameAreas?.[areaId]?.localPath;
      if (localPath) {
        urls.push(localPath);
      } else {
        console.warn('[resolveAllPartToolImageUrls] VFA missing localPath in cloud mode:', areaId);
      }
    }
  }

  return urls;
}
