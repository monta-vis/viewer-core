/**
 * MediaResolver — unified interface for resolving media (images + video)
 * in both processed (viewer) and raw (editor) modes.
 *
 * Components call `useMediaResolver()` instead of branching on mode props.
 */

import type { FrameCaptureData } from '@/features/instruction-view/utils/resolveRawFrameCapture';
import type { SubstepVideoEntry } from '@/features/instruction-view/utils/buildVideoEntry';

/** Discriminated union for resolved images */
export type ResolvedImage =
  | { kind: 'url'; url: string }
  | { kind: 'frameCapture'; data: FrameCaptureData };

/** Key for frame cache lookup */
export interface FrameCacheKey {
  videoId: string;
  frameNumber: number;
  cropArea?: { x: number | null; y: number | null; width: number | null; height: number | null };
}

/** Cache provider for raw-mode frame persistence */
export interface FrameCacheProvider {
  get(key: FrameCacheKey): string | null;
  set(key: FrameCacheKey, dataUrl: string): Promise<string>;
}

/** Sort part/tool junctions: preview images first, then by order */
export function sortPartToolJunctions<T extends { isPreviewImage: boolean; order: number }>(
  junctions: T[],
): T[] {
  return [...junctions].sort((a, b) => {
    if (a.isPreviewImage !== b.isPreviewImage) return a.isPreviewImage ? -1 : 1;
    return a.order - b.order;
  });
}

/** Unified media resolution interface */
export interface MediaResolver {
  readonly mode: 'processed' | 'raw';
  /** Folder name used for media URL construction (when available) */
  readonly folderName?: string;

  /** Resolve a single VideoFrameArea to a displayable image */
  resolveImage(areaId: string): ResolvedImage | null;

  /** Resolve ALL images for a PartTool (sorted: preview first, then by order) */
  resolveAllPartToolImages(partToolId: string): ResolvedImage[];

  /** Resolve first image for a PartTool */
  resolvePartToolImage(partToolId: string): ResolvedImage | null;

  /** Resolve a substep's video entry */
  resolveVideo(substepId: string): SubstepVideoEntry | null;
}
