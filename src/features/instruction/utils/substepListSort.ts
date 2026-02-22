import type {
  Substep,
  VideoSectionRow,
  VideoFrameAreaRow,
  SubstepImageRow,
  Video,
} from '../types';
import type { InstructionData } from '../store/simpleStore';

// ============================================
// Substep Video+Frame Sorting
// ============================================

/**
 * Data needed to sort substeps by video order and frame number.
 */
export interface SubstepSortData {
  videos: Record<string, Pick<Video, 'id' | 'order'>>;
  substepImages: Record<string, SubstepImageRow>;
  substepVideoSections: Record<string, { id: string; videoSectionId: string | null }>;
  videoSections: Record<string, VideoSectionRow>;
  videoFrameAreas: Record<string, VideoFrameAreaRow>;
}

/**
 * Extract SubstepSortData from InstructionData for convenience.
 */
export function buildSortData(data: InstructionData): SubstepSortData {
  return {
    videos: data.videos,
    substepImages: data.substepImages,
    substepVideoSections: data.substepVideoSections,
    videoSections: data.videoSections,
    videoFrameAreas: data.videoFrameAreas,
  };
}

/**
 * Derive the sort key for a single substep: (videoOrder, earliestFrame).
 *
 * Examines:
 * 1. SubstepImages → VideoFrameArea → (videoId, frameNumber)
 * 2. SubstepVideoSections → VideoSection → (videoId, startFrame)
 *
 * Returns the earliest (video.order, frame) pair.
 * If no video element exists, returns Infinity for both (sorts to end).
 */
function getSubstepSortKey(
  substep: Substep,
  sortData: SubstepSortData,
): { videoOrder: number; frame: number } {
  let bestVideoOrder = Infinity;
  let bestFrame = Infinity;

  // Check SubstepImages
  for (const imgRowId of substep.imageRowIds) {
    const imgRow = sortData.substepImages[imgRowId];
    if (!imgRow) continue;
    const area = sortData.videoFrameAreas[imgRow.videoFrameAreaId];
    if (!area?.videoId || area.frameNumber == null) continue;
    const video = sortData.videos[area.videoId];
    const vOrder = video?.order ?? Infinity;
    if (vOrder < bestVideoOrder || (vOrder === bestVideoOrder && area.frameNumber < bestFrame)) {
      bestVideoOrder = vOrder;
      bestFrame = area.frameNumber;
    }
  }

  // Check SubstepVideoSections
  for (const junctionId of substep.videoSectionRowIds) {
    const junction = sortData.substepVideoSections[junctionId];
    if (!junction?.videoSectionId) continue;
    const section = sortData.videoSections[junction.videoSectionId];
    if (!section) continue;
    const video = sortData.videos[section.videoId];
    const vOrder = video?.order ?? Infinity;
    if (vOrder < bestVideoOrder || (vOrder === bestVideoOrder && section.startFrame < bestFrame)) {
      bestVideoOrder = vOrder;
      bestFrame = section.startFrame;
    }
  }

  return { videoOrder: bestVideoOrder, frame: bestFrame };
}

/**
 * Sort substeps by video order, then frame number.
 * Substeps without any video element sort to the end by creationOrder.
 * Pre-computes sort keys for O(n) lookups during sort.
 */
export function sortSubstepsByVideoFrame(
  substeps: Substep[],
  sortData: SubstepSortData,
): Substep[] {
  // Pre-compute sort keys to avoid O(n log n × m) re-iteration
  const keyMap = new Map<string, { videoOrder: number; frame: number }>();
  for (const s of substeps) {
    keyMap.set(s.id, getSubstepSortKey(s, sortData));
  }

  return [...substeps].sort((a, b) => {
    const keyA = keyMap.get(a.id)!;
    const keyB = keyMap.get(b.id)!;

    // Primary: video order
    if (keyA.videoOrder !== keyB.videoOrder) return keyA.videoOrder - keyB.videoOrder;
    // Secondary: frame number
    if (keyA.frame !== keyB.frame) return keyA.frame - keyB.frame;
    // Tertiary: creationOrder for stable ordering of ties
    return a.creationOrder - b.creationOrder;
  });
}

/**
 * Sort substeps flat (all substeps, ignoring step assignment).
 * Alias for sortSubstepsByVideoFrame.
 */
export const sortSubstepsFlat = sortSubstepsByVideoFrame;
