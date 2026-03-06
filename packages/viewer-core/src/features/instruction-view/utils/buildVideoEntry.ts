import type { Substep, ViewportKeyframeRow, InstructionData } from '@/features/instruction';
import { buildMediaUrl, MediaPaths, DEFAULT_FPS } from '@/lib/media';

/** Pre-computed video playback data for a single substep. */
export interface SubstepVideoEntry {
  videoSrc: string;
  startFrame: number;
  endFrame: number;
  fps: number;
  viewportKeyframes: ViewportKeyframeRow[];
  videoAspectRatio: number;
  contentAspectRatio?: number | null;
  sections?: { startFrame: number; endFrame: number }[];
}

/** Build video data entry for standalone uploaded videos (no parent videos row). */
export function buildStandaloneVideoEntry(
  substepId: string,
  videoSection: { fps: number | null; startFrame: number; endFrame: number; contentAspectRatio?: number | null },
  folderName: string | undefined,
): SubstepVideoEntry {
  const fps = videoSection.fps ?? DEFAULT_FPS;
  const duration = videoSection.endFrame - videoSection.startFrame;
  const substepMediaPath = MediaPaths.substepVideo(substepId);
  const videoSrc = folderName
    ? buildMediaUrl(folderName, substepMediaPath)
    : `./${substepMediaPath}`;
  return {
    videoSrc,
    startFrame: 0,
    endFrame: duration,
    fps,
    viewportKeyframes: [],
    videoAspectRatio: 1,
    contentAspectRatio: videoSection.contentAspectRatio,
  };
}

interface BuildVideoEntryOptions {
  useRawVideo: boolean;
  folderName?: string;
  resolveSourceVideoUrl: (video: { videoPath?: string | null }, fallback: string) => string;
}

/**
 * Build a SubstepVideoEntry for a substep by resolving its video sections.
 * Handles standalone uploads, raw (editor) mode, and processed mode.
 * Returns null if the substep has no video data.
 */
export function buildVideoEntry(
  substep: Substep,
  data: InstructionData,
  options: BuildVideoEntryOptions,
): SubstepVideoEntry | null {
  const firstSectionRowId = substep.videoSectionRowIds[0];
  if (!firstSectionRowId) return null;

  const sectionRow = data.substepVideoSections[firstSectionRowId];
  if (!sectionRow?.videoSectionId) return null;

  const videoSection = data.videoSections[sectionRow.videoSectionId];
  if (!videoSection) return null;

  const video = videoSection.videoId ? data.videos[videoSection.videoId] : undefined;

  // Standalone uploaded video (no parent videos row)
  if (!video) {
    return buildStandaloneVideoEntry(substep.id, videoSection, options.folderName);
  }

  if (options.useRawVideo) {
    // Editor raw mode — use source video, iterate ALL sections
    const videoSrc = options.resolveSourceVideoUrl(video, videoSection.localPath || '');
    if (!videoSrc) return null;

    const videoAspectRatio = (video.width && video.height) ? video.width / video.height : 16 / 9;

    const allSections: { startFrame: number; endFrame: number }[] = [];
    const viewportKeyframes: ViewportKeyframeRow[] = [];
    for (const rowId of substep.videoSectionRowIds) {
      const row = data.substepVideoSections[rowId];
      if (!row?.videoSectionId) continue;
      const sec = data.videoSections[row.videoSectionId];
      if (!sec) continue;
      allSections.push({ startFrame: sec.startFrame, endFrame: sec.endFrame });
      for (const kfId of sec.viewportKeyframeIds) {
        const kf = data.viewportKeyframes[kfId];
        if (kf) {
          viewportKeyframes.push({
            ...kf,
            frameNumber: kf.frameNumber + sec.startFrame,
          });
        }
      }
    }
    allSections.sort((a, b) => a.startFrame - b.startFrame);

    return {
      videoSrc,
      startFrame: allSections[0]?.startFrame ?? videoSection.startFrame,
      endFrame: allSections[allSections.length - 1]?.endFrame ?? videoSection.endFrame,
      fps: video.fps,
      viewportKeyframes,
      videoAspectRatio,
      sections: allSections.length > 1 ? allSections : undefined,
    };
  }

  // Processed mode — use merged substep video (all sections concatenated)
  let totalFrames = 0;
  for (const rowId of substep.videoSectionRowIds) {
    const row = data.substepVideoSections[rowId];
    if (!row?.videoSectionId) continue;
    const sec = data.videoSections[row.videoSectionId];
    if (!sec) continue;
    totalFrames += sec.endFrame - sec.startFrame;
  }

  const substepMediaPath = MediaPaths.substepVideo(substep.id);
  const videoSrc = options.folderName
    ? buildMediaUrl(options.folderName, substepMediaPath)
    : `./${substepMediaPath}`;

  return {
    videoSrc,
    startFrame: 0,
    endFrame: totalFrames,
    fps: video.fps,
    viewportKeyframes: [],
    videoAspectRatio: 1,
    contentAspectRatio: videoSection.contentAspectRatio,
  };
}
