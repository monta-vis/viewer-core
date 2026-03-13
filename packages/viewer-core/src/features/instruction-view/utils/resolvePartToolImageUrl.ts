import { resolveAllPartToolImageUrls } from './resolveAllPartToolImageUrls';

/**
 * Resolve the first area image URL for a PartTool.
 * Prefers preview images (sorted by order), then falls back to the first regular area.
 *
 * Delegates to `resolveAllPartToolImageUrls` and returns the first result.
 */
export function resolvePartToolImageUrl(
  partToolId: string,
  folderName: string | undefined,
  partToolVideoFrameAreas: Record<string, { partToolId: string; videoFrameAreaId: string; isPreviewImage: boolean; order: number }>,
  useBlurred?: boolean,
  videoFrameAreas?: Record<string, { localPath?: string | null; useBlurred?: boolean | null }>,
): string | null {
  const urls = resolveAllPartToolImageUrls(
    partToolId,
    folderName,
    partToolVideoFrameAreas,
    useBlurred,
    videoFrameAreas,
  );
  return urls[0] ?? null;
}
