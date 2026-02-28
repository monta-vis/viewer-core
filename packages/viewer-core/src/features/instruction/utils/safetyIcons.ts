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
  | 'Gebotszeichen'
  | 'Piktogramme-Leitern';

interface CategoryConfig {
  color: string;
  label: string;
  priority: number;
}

/** ISO standard category colors and sorting priority. */
export const SAFETY_ICON_CATEGORIES: Record<SafetyIconCategory, CategoryConfig> = {
  Verbotszeichen:        { color: '#CC0000', label: 'editor.safetyCategory.prohibition',  priority: 0 },
  Warnzeichen:           { color: '#FFD700', label: 'editor.safetyCategory.warning',      priority: 1 },
  Gefahrstoffe:          { color: '#CC0000', label: 'editor.safetyCategory.hazardous',    priority: 2 },
  Gebotszeichen:         { color: '#0066CC', label: 'editor.safetyCategory.mandatory',    priority: 3 },
  'Piktogramme-Leitern': { color: '#E0E0E0', label: 'editor.safetyCategory.ladders',      priority: 4 },
};

/** Category-based note card styles (CSS class strings). */
export const NOTE_CATEGORY_STYLES: Record<SafetyIconCategory, { bg: string; border: string; text: string }> = {
  Verbotszeichen:        { bg: 'bg-[var(--color-note-verbotszeichen-bg)]', border: 'border-[var(--color-note-verbotszeichen-border)]', text: 'text-[var(--color-note-verbotszeichen-text)]' },
  Warnzeichen:           { bg: 'bg-[var(--color-note-warnzeichen-bg)]',    border: 'border-[var(--color-note-warnzeichen-border)]',    text: 'text-[var(--color-note-warnzeichen-text)]' },
  Gefahrstoffe:          { bg: 'bg-[var(--color-note-gefahrstoffe-bg)]',   border: 'border-[var(--color-note-gefahrstoffe-border)]',   text: 'text-[var(--color-note-gefahrstoffe-text)]' },
  Gebotszeichen:         { bg: 'bg-[var(--color-note-gebotszeichen-bg)]',  border: 'border-[var(--color-note-gebotszeichen-border)]',  text: 'text-[var(--color-note-gebotszeichen-text)]' },
  'Piktogramme-Leitern': { bg: 'bg-[var(--color-note-piktogramme-leitern-bg)]', border: 'border-[var(--color-note-piktogramme-leitern-border)]', text: 'text-[var(--color-note-piktogramme-leitern-text)]' },
};

/** Prefix rules: order matters — longer prefixes first to avoid false matches. */
const PREFIX_RULES: Array<{ prefix: string; category: SafetyIconCategory }> = [
  { prefix: 'D-P',  category: 'Verbotszeichen' },
  { prefix: 'D-W',  category: 'Warnzeichen' },
  { prefix: 'GHS',  category: 'Gefahrstoffe' },
  { prefix: 'WSP',  category: 'Verbotszeichen' },
  { prefix: 'WSM',  category: 'Gebotszeichen' },
  { prefix: 'PI',   category: 'Piktogramme-Leitern' },
  { prefix: 'P',    category: 'Verbotszeichen' },
  { prefix: 'W',    category: 'Warnzeichen' },
  { prefix: 'M',    category: 'Gebotszeichen' },
];

/** Derive category from filename prefix (e.g. "W001-..." → "Warnzeichen"). Returns null for unrecognized files. */
export function getCategoryFromFilename(filename: string): SafetyIconCategory | null {
  for (const { prefix, category } of PREFIX_RULES) {
    if (filename.startsWith(prefix)) return category;
  }
  return null;
}

/** Get the ISO standard color for a category. */
export function getCategoryColor(category: string): string {
  return (SAFETY_ICON_CATEGORIES as Record<string, CategoryConfig>)[category]?.color ?? '#666666';
}

/** Get sort priority for a category (lower = higher priority). */
export function getCategoryPriority(category: string): number {
  return (SAFETY_ICON_CATEGORIES as Record<string, CategoryConfig>)[category]?.priority ?? 99;
}

/** Maps old note levels to their equivalent generic safety icon filenames (for backward compat in transformSnapshotToStore). */
export const LEGACY_LEVEL_TO_ICON: Record<string, string> = {
  Critical: 'P001-Allgemeines-Verbotszeichen.png',
  Warning:  'W001-Allgemeines-Warnzeichen.png',
  Quality:  'M001_Allgemeines-Gebotszeichen.png',
  Info:     'W001-Allgemeines-Warnzeichen.png',
};

/** Maps old note levels to a SafetyIconCategory (for backward compat in transformSnapshotToStore). */
export const LEGACY_LEVEL_TO_CATEGORY: Record<string, SafetyIconCategory> = {
  Critical: 'Verbotszeichen',
  Warning:  'Warnzeichen',
  Quality:  'Gebotszeichen',
  Info:     'Warnzeichen',
};
