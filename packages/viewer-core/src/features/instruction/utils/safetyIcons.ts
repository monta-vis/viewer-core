/**
 * Safety icon utilities — ISO 7010 / GHS category classification.
 * Categories derived from filename prefix.
 */

import { publicAsset } from '@/lib/media';

/**
 * Resolve the URL for a safety icon.
 * - Legacy filename (contains .png/.jpg/.gif) → publicAsset('SafetyIcons/...')
 * - VFA UUID → publicAsset('media/frames/{id}/image.png')
 */
export function safetyIconUrl(idOrFilename: string): string {
  if (/\.(png|jpg|gif)$/i.test(idOrFilename)) {
    // Legacy filename
    return publicAsset(`SafetyIcons/${encodeURIComponent(idOrFilename.replace(/\.(jpg|gif)$/i, '.png'))}`);
  }
  // VFA UUID — image stored in project's media/frames/
  return publicAsset(`media/frames/${encodeURIComponent(idOrFilename)}/image.png`);
}

/** Human-readable label from safety icon filename (strip extension and replace separators). */
export function safetyIconLabel(filename: string): string {
  return filename.replace(/\.(jpg|gif|png)$/i, '').replace(/[-_]/g, ' ');
}

export type SafetyIconCategory =
  | 'Verbotszeichen'
  | 'Warnzeichen'
  | 'Gefahrstoffe'
  | 'Brandschutz'
  | 'Gebotszeichen'
  | 'Piktogramme-Leitern'
  | 'Rettungszeichen'
  | 'Sonstige';

interface CategoryConfig {
  color: string;
  label: string;
  priority: number;
}

/** ISO standard category colors and sorting priority. */
export const SAFETY_ICON_CATEGORIES: Record<SafetyIconCategory, CategoryConfig> = {
  Verbotszeichen:        { color: '#CC0000', label: 'editor.safetyCategory.prohibition',  priority: 0 },
  Warnzeichen:           { color: '#FFD700', label: 'editor.safetyCategory.warning',      priority: 1 },
  Gefahrstoffe:          { color: '#FF6600', label: 'editor.safetyCategory.hazardous',    priority: 2 },
  Brandschutz:           { color: '#CC0000', label: 'editor.safetyCategory.fireSafety',   priority: 3 },
  Gebotszeichen:         { color: '#0066CC', label: 'editor.safetyCategory.mandatory',    priority: 4 },
  'Piktogramme-Leitern': { color: '#333333', label: 'editor.safetyCategory.ladders',      priority: 5 },
  Rettungszeichen:       { color: '#009933', label: 'editor.safetyCategory.emergency',    priority: 6 },
  Sonstige:              { color: '#666666', label: 'editor.safetyCategory.other',         priority: 7 },
};

/** Prefix rules: order matters — longer prefixes first to avoid false matches. */
const PREFIX_RULES: Array<{ prefix: string; category: SafetyIconCategory }> = [
  { prefix: 'D-P',  category: 'Verbotszeichen' },
  { prefix: 'D-E',  category: 'Rettungszeichen' },
  { prefix: 'D-W',  category: 'Warnzeichen' },
  { prefix: 'GHS',  category: 'Gefahrstoffe' },
  { prefix: 'WSP',  category: 'Verbotszeichen' },
  { prefix: 'WSE',  category: 'Rettungszeichen' },
  { prefix: 'WSM',  category: 'Gebotszeichen' },
  { prefix: 'PI',   category: 'Piktogramme-Leitern' },
  { prefix: 'P',    category: 'Verbotszeichen' },
  { prefix: 'W',    category: 'Warnzeichen' },
  { prefix: 'M',    category: 'Gebotszeichen' },
  { prefix: 'E',    category: 'Rettungszeichen' },
  { prefix: 'F',    category: 'Brandschutz' },
];

/** Derive category from filename prefix (e.g. "W001-..." → "Warnzeichen"). */
export function getCategoryFromFilename(filename: string): SafetyIconCategory {
  for (const { prefix, category } of PREFIX_RULES) {
    if (filename.startsWith(prefix)) return category;
  }
  return 'Sonstige';
}

/** Get the ISO standard color for a category. */
export function getCategoryColor(category: string): string {
  return (SAFETY_ICON_CATEGORIES as Record<string, CategoryConfig>)[category]?.color ?? '#666666';
}

/** Get sort priority for a category (lower = higher priority). */
export function getCategoryPriority(category: string): number {
  return (SAFETY_ICON_CATEGORIES as Record<string, CategoryConfig>)[category]?.priority ?? 99;
}

const LEGACY_LEVELS = new Set(['Critical', 'Warning', 'Quality', 'Info']);

/** Check if a string is one of the old note level values. */
export function isLegacyLevel(value: string): boolean {
  return LEGACY_LEVELS.has(value);
}

/** Maps old note levels to their equivalent generic safety icon filenames. */
export const LEGACY_LEVEL_TO_ICON: Record<string, string> = {
  Critical: 'P001-Allgemeines-Verbotszeichen.png',
  Warning:  'W001-Allgemeines-Warnzeichen.png',
  Quality:  'M001_Allgemeines-Gebotszeichen.png',
  Info:     'E003-Erste-Hilfe.png',
};

/** Note severity level. Shared between editor and instruction-view. */
export type NoteLevel = 'Critical' | 'Warning' | 'Quality' | 'Info';
