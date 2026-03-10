/**
 * Media Utilities — shared URL construction & path conventions.
 *
 * Pure functions, no IPC, no side effects.
 */

/**
 * Resolve a public asset path that works in both dev (/) and Electron (./).
 * Uses Vite's BASE_URL which is '/' in dev and './' in Electron builds.
 */
export function publicAsset(assetPath: string): string {
  const base = import.meta.env.BASE_URL ?? '/';
  // assetPath may start with '/' — strip it so we don't get double slashes
  const clean = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath;
  return `${base}${clean}`;
}

/** Default FPS fallback for standalone uploaded videos without a parent videos row */
export const DEFAULT_FPS = 30;

/** Convention-based relative paths for all media types */
export const MediaPaths = {
  proxy: (videoId: string) => `proxy/${videoId}.mp4`,
  section: (sectionId: string) => `media/sections/${sectionId}/video.mp4`,
  substepVideo: (substepId: string) => `media/substeps/${substepId}/video.mp4`,
  substepVideoBlurred: (substepId: string) => `media_blurred/substeps/${substepId}/video.mp4`,
  frame: (frameAreaId: string) => `media/frames/${frameAreaId}/image`,
  frameBlurred: (frameAreaId: string) => `media_blurred/frames/${frameAreaId}/image`,
} as const;

/** Resolve frame image path: use blurred path when master ON + VFA flag ON. */
export function resolveFramePath(
  vfaId: string,
  masterBlurred: boolean,
  vfaUseBlurred: boolean | null | undefined,
): string {
  if (masterBlurred && vfaUseBlurred) return MediaPaths.frameBlurred(vfaId);
  return MediaPaths.frame(vfaId);
}

/** Resolve substep video path: use blurred path when master ON + substep flag ON. */
export function resolveSubstepVideoPath(
  substepId: string,
  masterBlurred: boolean,
  substepUseBlurred: boolean | null | undefined,
): string {
  if (masterBlurred && substepUseBlurred) return MediaPaths.substepVideoBlurred(substepId);
  return MediaPaths.substepVideo(substepId);
}

/**
 * Build an mvis-media:// URL. Handles both absolute external paths
 * and relative project paths.
 */
export function buildMediaUrl(folderName: string, filePath: string): string {
  const isAbsolute = /^[a-zA-Z]:[\\/]/.test(filePath) || filePath.startsWith('/');
  const encodedFolder = encodeURIComponent(folderName);
  const normalizedPath = filePath.replace(/\\/g, '/');
  const encodedPath = normalizedPath.split('/').map(encodeURIComponent).join('/');
  return isAbsolute
    ? `mvis-media://${encodedFolder}/absolute:${encodedPath}`
    : `mvis-media://${encodedFolder}/${encodedPath}`;
}

