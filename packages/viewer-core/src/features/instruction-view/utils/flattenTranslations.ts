import type { SnapshotTranslations } from '@/types/snapshot';
import type { TranslationRow } from './applyTranslations';

/**
 * Map from SnapshotTranslations keys to the entity_type used in TranslationRow.
 */
const ENTITY_TYPE_MAP: Record<keyof SnapshotTranslations, string> = {
  instruction: 'instruction',
  steps: 'step',
  substeps: 'substep',
  notes: 'note',
  partTools: 'part_tool',
  substepDescriptions: 'substep_description',
  drawings: 'drawing',
};

/**
 * Flatten nested SnapshotTranslations into TranslationRow[] for a single language.
 *
 * Skips the `is_auto` metadata field and any null/undefined values.
 */
export function flattenTranslations(
  translations: SnapshotTranslations,
  language: string,
): TranslationRow[] {
  const rows: TranslationRow[] = [];

  for (const [key, entityType] of Object.entries(ENTITY_TYPE_MAP)) {
    const entities = translations[key as keyof SnapshotTranslations];
    for (const [entityId, langMap] of Object.entries(entities)) {
      const fields = langMap[language];
      if (!fields) continue;

      for (const [fieldName, value] of Object.entries(fields)) {
        if (fieldName === 'is_auto') continue;
        if (value == null) continue;
        rows.push({
          entity_type: entityType,
          entity_id: entityId,
          field_name: fieldName,
          text: value as string,
        });
      }
    }
  }

  return rows;
}
