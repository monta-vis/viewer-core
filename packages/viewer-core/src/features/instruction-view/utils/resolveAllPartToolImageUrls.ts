import { buildMediaUrl, resolveFramePath } from '@/lib/media';

/**
 * Resolve ALL area image URLs for a PartTool (not just the first one).
 * Returns them sorted: preview images first, then by order.
 *
 * Same resolution logic as `resolvePartToolImageUrl` but returns the full list.
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

  const sorted = [...areas].sort((a, b) => {
    if (a.isPreviewImage !== b.isPreviewImage) return a.isPreviewImage ? -1 : 1;
    return a.order - b.order;
  });

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
      }
    }
  }

  return urls;
}
