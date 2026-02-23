import { describe, it, expect } from 'vitest';
import { flattenTranslations } from './flattenTranslations';
import type { SnapshotTranslations } from '@/types/snapshot';

const EMPTY_TRANSLATIONS: SnapshotTranslations = {
  instruction: {},
  steps: {},
  substeps: {},
  notes: {},
  partTools: {},
  substepDescriptions: {},
  drawings: {},
};

describe('flattenTranslations', () => {
  it('returns empty array for empty translations', () => {
    expect(flattenTranslations(EMPTY_TRANSLATIONS, 'de')).toEqual([]);
  });

  it('returns correct TranslationRow[] for a given language', () => {
    const translations: SnapshotTranslations = {
      ...EMPTY_TRANSLATIONS,
      instruction: {
        'inst-1': {
          de: { name: 'Anleitung', description: 'Beschreibung', is_auto: false },
        },
      },
      steps: {
        'step-1': {
          de: { title: 'Schritt 1', repeat_label: 'Wiederholung', is_auto: false },
        },
      },
    };

    const rows = flattenTranslations(translations, 'de');

    expect(rows).toEqual(
      expect.arrayContaining([
        { entity_type: 'instruction', entity_id: 'inst-1', field_name: 'name', text: 'Anleitung' },
        { entity_type: 'instruction', entity_id: 'inst-1', field_name: 'description', text: 'Beschreibung' },
        { entity_type: 'step', entity_id: 'step-1', field_name: 'title', text: 'Schritt 1' },
        { entity_type: 'step', entity_id: 'step-1', field_name: 'repeat_label', text: 'Wiederholung' },
      ]),
    );
    expect(rows).toHaveLength(4);
  });

  it('skips is_auto field and null values', () => {
    const translations: SnapshotTranslations = {
      ...EMPTY_TRANSLATIONS,
      notes: {
        'note-1': {
          en: { text: 'Hello', name: null, is_auto: true },
        },
      },
    };

    const rows = flattenTranslations(translations, 'en');

    // Only 'text' should appear — is_auto is skipped, null name is skipped
    expect(rows).toEqual([
      { entity_type: 'note', entity_id: 'note-1', field_name: 'text', text: 'Hello' },
    ]);
  });

  it('returns empty array for language with no translations', () => {
    const translations: SnapshotTranslations = {
      ...EMPTY_TRANSLATIONS,
      steps: {
        'step-1': {
          de: { title: 'Schritt 1', is_auto: false },
        },
      },
    };

    expect(flattenTranslations(translations, 'fr')).toEqual([]);
  });
});
