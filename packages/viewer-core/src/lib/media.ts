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

/** Convention-based relative paths for all media types */
export const MediaPaths = {
  proxy: (videoId: string) => `proxy/${videoId}.mp4`,
  section: (sectionId: string) => `media/sections/${sectionId}/video.mp4`,
  sectionBlurred: (sectionId: string) => `media/sections/${sectionId}/video_blurred.mp4`,
  substepVideo: (substepId: string) => `media/substeps/${substepId}/video.mp4`,
  substepVideoBlurred: (substepId: string) => `media/substeps/${substepId}/video_blurred.mp4`,
  frame: (frameAreaId: string) => `media/frames/${frameAreaId}/image`,
  frameBlurred: (frameAreaId: string) => `media/frames/${frameAreaId}/image_blurred`,
} as const;

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

