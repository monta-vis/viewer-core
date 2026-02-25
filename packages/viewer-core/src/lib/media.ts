/**
 * Media Utilities — shared URL construction & path conventions.
 *
 * Pure functions, no IPC, no side effects.
 */

/** Inlined from timeline feature to avoid circular dependency */
type VideoStatus = 'complete' | 'proxy-only' | 'source-only' | 'missing';

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

/**
 * Build an mvis-catalog:// URL for a catalog asset (icon SVG, etc.).
 * Format: mvis-catalog://PartToolIcons/{catalogName}/{filename}
 */
export function catalogAssetUrl(type: 'PartToolIcons' | 'Tutorials', catalogName: string, filename: string): string {
  return `mvis-catalog://${encodeURIComponent(type)}/${encodeURIComponent(catalogName)}/${encodeURIComponent(filename)}`;
}

/** Result of checking what media files exist on disk for a video */
export interface MediaAvailability {
  sourceExists: boolean;
  proxyExists: boolean;
}

/**
 * Derive VideoStatus from actual file existence.
 */
export function getVideoStatus(availability: MediaAvailability): VideoStatus {
  const { sourceExists, proxyExists } = availability;
  if (sourceExists && proxyExists) return 'complete';
  if (!sourceExists && proxyExists) return 'proxy-only';
  if (sourceExists && !proxyExists) return 'source-only';
  return 'missing';
}

/**
 * Pick the best video URL given cached availability.
 * Default priority: source → proxy (use `preferProxy` to flip).
 * Returns empty string if neither exists.
 */
export function resolveVideoUrl(
  folderName: string,
  videoId: string,
  sourcePath: string | null,
  availability?: MediaAvailability,
  preferProxy = false,
): string {
  if (!availability) {
    return sourcePath ? buildMediaUrl(folderName, sourcePath) : '';
  }

  const proxyUrl = availability.proxyExists
    ? buildMediaUrl(folderName, MediaPaths.proxy(videoId))
    : '';
  const sourceUrl = availability.sourceExists && sourcePath
    ? buildMediaUrl(folderName, sourcePath)
    : '';

  if (preferProxy) return proxyUrl || sourceUrl;
  return sourceUrl || proxyUrl;
}
