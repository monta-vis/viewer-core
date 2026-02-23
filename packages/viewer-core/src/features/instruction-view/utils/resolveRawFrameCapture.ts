import { buildMediaUrl } from '@/lib/media';
import type { VideoFrameAreaRow, VideoRow } from '@/features/instruction';

export interface FrameCaptureData {
  videoSrc: string;
  videoId: string;
  fps: number;
  frameNumber: number;
  cropArea?: { x: number | null; y: number | null; width: number | null; height: number | null };
}

/**
 * Resolve a VideoFrameArea to raw frame capture data for VideoFrameCapture.
 * Standard function for Editor preview: area -> source video -> capture data.
 * Returns null if area, video, or videoPath is missing.
 */
export function resolveRawFrameCapture(
  area: VideoFrameAreaRow | null | undefined,
  videos: Record<string, VideoRow>,
  folderName: string,
): FrameCaptureData | null {
  if (!area?.videoId || area.frameNumber === null || area.frameNumber === undefined) return null;
  const video = videos[area.videoId];
  if (!video?.videoPath) return null;
  return {
    videoSrc: buildMediaUrl(folderName, video.videoPath),
    videoId: video.id,
    fps: video.fps,
    frameNumber: area.frameNumber,
    cropArea: area.x !== null
      ? { x: area.x, y: area.y, width: area.width, height: area.height }
      : undefined,
  };
}

/**
 * Resolve PartTool preview image as raw frame capture data.
 * Looks up junction records, sorts (preview first, then by order),
 * and resolves the first area that has a valid video.
 */
export function resolvePartToolFrameCapture(
  partToolId: string,
  partToolVideoFrameAreas: Record<string, { partToolId: string; videoFrameAreaId: string; isPreviewImage: boolean; order: number }>,
  videoFrameAreas: Record<string, VideoFrameAreaRow>,
  videos: Record<string, VideoRow>,
  folderName: string,
): FrameCaptureData | null {
  const junctions = Object.values(partToolVideoFrameAreas)
    .filter((j) => j.partToolId === partToolId);

  if (junctions.length === 0) return null;

  // Sort: preview images first, then by order
  const sorted = [...junctions].sort((a, b) => {
    if (a.isPreviewImage !== b.isPreviewImage) return a.isPreviewImage ? -1 : 1;
    return a.order - b.order;
  });

  // Try each junction until one resolves successfully
  for (const junction of sorted) {
    const area = videoFrameAreas[junction.videoFrameAreaId];
    const result = resolveRawFrameCapture(area, videos, folderName);
    if (result) return result;
  }

  return null;
}
