import { buildMediaUrl, resolveFramePath } from '@/lib/media';

/**
 * Resolve the first area image URL for a PartTool.
 * Prefers preview images (sorted by order), then falls back to the first regular area.
 *
 * When folderName is available, builds a mvis-media:// URL (Electron context).
 * When folderName is missing but videoFrameAreas is provided, falls back to
 * the area's localPath (mweb/snapshot context with pre-exported relative URLs).
 */
export function resolvePartToolImageUrl(
  partToolId: string,
  folderName: string | undefined,
  partToolVideoFrameAreas: Record<string, { partToolId: string; videoFrameAreaId: string; isPreviewImage: boolean; order: number }>,
  useBlurred?: boolean,
  videoFrameAreas?: Record<string, { localPath?: string | null; useBlurred?: boolean | null }>,
): string | null {
  const areas = Object.values(partToolVideoFrameAreas)
    .filter((a) => a.partToolId === partToolId);

  if (areas.length === 0) return null;

  // Prefer preview images (sorted by order), fallback to first area
  const sorted = [...areas].sort((a, b) => {
    if (a.isPreviewImage !== b.isPreviewImage) return a.isPreviewImage ? -1 : 1;
    return a.order - b.order;
  });

  const areaId = sorted[0].videoFrameAreaId;

  if (folderName) {
    const vfaBlurred = videoFrameAreas?.[areaId]?.useBlurred;
    const mediaPath = resolveFramePath(areaId, !!useBlurred, vfaBlurred);
    return buildMediaUrl(folderName, mediaPath);
  }

  // Fallback: use pre-exported localPath from the store (mweb context)
  return videoFrameAreas?.[areaId]?.localPath ?? null;
}
