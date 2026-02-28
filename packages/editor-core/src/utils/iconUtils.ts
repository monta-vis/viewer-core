import { SAFETY_ICON_MANIFEST, buildMediaUrl } from '@monta-vis/viewer-core';
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
