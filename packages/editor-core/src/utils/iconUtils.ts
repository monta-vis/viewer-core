import { SAFETY_ICON_MANIFEST, buildMediaUrl, MediaPaths } from '@monta-vis/viewer-core';
import type { SafetyIconItem } from '../components/SafetyIconPicker';
import type { SafetyIconCatalog } from '../types';

/**
 * Resolve a localized label. Falls back to first available language, then filename.
 */
export function resolveLabel(label: Record<string, string> | string | undefined, lang: string, filename: string): string {
  if (!label) return filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
  if (typeof label === 'string') return label;
  return label[lang] ?? label.de ?? label.en ?? Object.values(label)[0] ?? filename;
}

/**
 * Build the list of selectable icons.
 * Priority: external catalogs (from disk) → built-in manifest (from public/SafetyIcons/).
 */
export function buildIconList(catalogs: SafetyIconCatalog[], lang: string): SafetyIconItem[] {
  // External catalog icons (use filename as id since entries don't have a dedicated id)
  const catalogIcons: SafetyIconItem[] = catalogs.flatMap((cat) =>
    (cat.entries ?? []).map((entry) => ({
      id: entry.filename,
      filename: entry.filename,
      category: entry.category,
      label: resolveLabel(entry.label, lang, entry.filename),
      catalogName: cat.name,
      catalogDirName: cat.dirName,
    })),
  );

  // Built-in manifest icons (fallback)
  const builtinIcons: SafetyIconItem[] = SAFETY_ICON_MANIFEST.map((entry) => ({
    id: entry.filename,
    filename: entry.filename,
    category: entry.category,
    label: entry.filename.replace(/\.png$/, '').replace(/[-_]/g, ' '),
  }));

  return catalogIcons.length > 0 ? catalogIcons : builtinIcons;
}

/**
 * Build a map of catalog assetsDir by filename for URL construction.
 */
export function buildAssetsDirMap(catalogs: SafetyIconCatalog[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const cat of catalogs) {
    for (const entry of cat.entries ?? []) {
      map.set(entry.filename, cat.assetsDir);
    }
  }
  return map;
}

/**
 * Get the URL for a safety icon, resolving either from an external catalog or built-in.
 */
export function getIconUrl(icon: SafetyIconItem, assetsDirMap: Map<string, string>, folderName?: string): string {
  const assetsDir = assetsDirMap.get(icon.filename);
  if (assetsDir && folderName) {
    // External catalog icon: absolute path via mvis-media protocol
    const absPath = `${assetsDir}/${icon.filename}`.replace(/\\/g, '/');
    return buildMediaUrl(folderName, absPath);
  }
  // Built-in icon: served from public/SafetyIcons/
  return `./SafetyIcons/${encodeURIComponent(icon.filename)}`;
}

/** Pattern matching legacy filenames (e.g. "W001.png"). */
const LEGACY_FILENAME_RE = /\.\w+$/;

/**
 * Resolve a note's safetyIconId to a displayable URL.
 *
 * Resolution order:
 * 1. Catalog match — safetyIconId matches a known icon filename → catalog/built-in URL
 * 2. VFA UUID — safetyIconId is a UUID (not a filename) + folderName provided → mvis-media URL
 * 3. null — cannot resolve
 *
 * Reusable across apps (viewer + creator) — no app-specific logic.
 */
export function resolveNoteIconUrl(
  safetyIconId: string,
  icons: SafetyIconItem[],
  getIconUrlFn: (icon: SafetyIconItem) => string,
  folderName?: string,
): string | null {
  if (!safetyIconId) return null;

  // 1. Try built-in icon match only (skip catalog icons to prevent catalog path leakage)
  const builtinMatch = icons.find((ic) => ic.id === safetyIconId && !ic.catalogDirName);
  if (builtinMatch) return getIconUrlFn(builtinMatch);

  // 2. Not a legacy filename → treat as VFA UUID
  if (!LEGACY_FILENAME_RE.test(safetyIconId) && folderName) {
    return buildMediaUrl(folderName, MediaPaths.frame(safetyIconId));
  }

  return null;
}
