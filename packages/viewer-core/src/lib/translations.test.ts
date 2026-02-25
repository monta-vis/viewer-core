import { describe, it, expect } from 'vitest';
import { viewerCoreTranslations } from './translations';
import { SUPPORTED_LANGUAGES } from './languages';
import type { LanguageCode } from './languages';

/** Recursively collect all leaf keys as dot-separated paths */
function getLeafKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      keys.push(...getLeafKeys(value as Record<string, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys.sort();
}

/** Extract all {{...}} interpolation placeholders from a string */
function getPlaceholders(str: string): string[] {
  const matches = str.match(/\{\{[^}]+\}\}/g);
  return matches ? matches.sort() : [];
}

describe('viewerCoreTranslations', () => {
  const allLanguageCodes = SUPPORTED_LANGUAGES.map(l => l.code);
  const en = viewerCoreTranslations.en;
  const enLeafKeys = getLeafKeys(en as unknown as Record<string, unknown>);

  it('has exactly 11 keys matching all SUPPORTED_LANGUAGES codes', () => {
    const translationKeys = Object.keys(viewerCoreTranslations).sort();
    expect(translationKeys).toEqual([...allLanguageCodes].sort());
  });

  it('every language has the same namespace keys as English', () => {
    const enNamespaces = Object.keys(en).sort();
    for (const code of allLanguageCodes) {
      if (code === 'en') continue;
      const lang = viewerCoreTranslations[code as LanguageCode];
      const langNamespaces = Object.keys(lang).sort();
      expect(langNamespaces, `${code} namespaces mismatch`).toEqual(enNamespaces);
    }
  });

  it('every language has the same leaf-key structure as English', () => {
    for (const code of allLanguageCodes) {
      if (code === 'en') continue;
      const lang = viewerCoreTranslations[code as LanguageCode];
      const langLeafKeys = getLeafKeys(lang as unknown as Record<string, unknown>);
      expect(langLeafKeys, `${code} leaf keys mismatch`).toEqual(enLeafKeys);
    }
  });

  it('every string value is non-empty across all languages', () => {
    for (const code of allLanguageCodes) {
      const lang = viewerCoreTranslations[code as LanguageCode];
      function checkNonEmpty(obj: Record<string, unknown>, path: string) {
        for (const [key, value] of Object.entries(obj)) {
          const fullPath = `${path}.${key}`;
          if (typeof value === 'string') {
            expect(value.length, `${fullPath} should not be empty`).toBeGreaterThan(0);
          } else if (typeof value === 'object' && value !== null) {
            checkNonEmpty(value as Record<string, unknown>, fullPath);
          }
        }
      }
      checkNonEmpty(lang as unknown as Record<string, unknown>, code);
    }
  });

  it('interpolation placeholders are preserved in all languages', () => {
    // Build a map of English keys → placeholders
    function collectPlaceholders(
      obj: Record<string, unknown>,
      prefix: string,
      map: Map<string, string[]>,
    ) {
      for (const [key, value] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'string') {
          const placeholders = getPlaceholders(value);
          if (placeholders.length > 0) {
            map.set(path, placeholders);
          }
        } else if (typeof value === 'object' && value !== null) {
          collectPlaceholders(value as Record<string, unknown>, path, map);
        }
      }
    }

    const enPlaceholders = new Map<string, string[]>();
    collectPlaceholders(en as unknown as Record<string, unknown>, '', enPlaceholders);

    for (const code of allLanguageCodes) {
      if (code === 'en') continue;
      const lang = viewerCoreTranslations[code as LanguageCode];
      const langPlaceholders = new Map<string, string[]>();
      collectPlaceholders(lang as unknown as Record<string, unknown>, '', langPlaceholders);

      for (const [path, enPh] of enPlaceholders) {
        const langPh = langPlaceholders.get(path) ?? [];
        expect(langPh, `${code}.${path} placeholders mismatch`).toEqual(enPh);
      }
    }
  });

  it('includes instructionView.start for all languages', () => {
    for (const code of allLanguageCodes) {
      const lang = viewerCoreTranslations[code as LanguageCode];
      const iv = lang.instructionView as Record<string, unknown>;
      expect(iv.start, `${code} missing instructionView.start`).toEqual(expect.any(String));
      expect((iv.start as string).length, `${code} instructionView.start is empty`).toBeGreaterThan(0);
    }
  });

  it('includes common.error for all languages', () => {
    for (const code of allLanguageCodes) {
      const lang = viewerCoreTranslations[code as LanguageCode];
      const common = lang.common as Record<string, unknown>;
      expect(common.error, `${code} missing common.error`).toEqual(expect.any(String));
      expect((common.error as string).length, `${code} common.error is empty`).toBeGreaterThan(0);
    }
  });

  it('includes mweb.poweredBy for all languages', () => {
    for (const code of allLanguageCodes) {
      const lang = viewerCoreTranslations[code as LanguageCode];
      const mweb = lang.mweb as Record<string, unknown>;
      expect(mweb, `${code} missing mweb namespace`).toBeDefined();
      expect(mweb.poweredBy, `${code} missing mweb.poweredBy`).toEqual(expect.any(String));
      expect((mweb.poweredBy as string).length, `${code} mweb.poweredBy is empty`).toBeGreaterThan(0);
    }
  });

  // Keep existing English-specific tests
  it('exports all expected top-level namespaces', () => {
    const expectedNamespaces = [
      'preferences', 'common', 'instructionView', 'editorCore',
      'feedback', 'rating', 'hierarchy', 'shortcuts', 'textInput',
      'export', 'instruction', 'editor', 'dashboard', 'mweb',
    ];
    for (const ns of expectedNamespaces) {
      expect(en).toHaveProperty(ns);
      expect(typeof en[ns as keyof typeof en]).toBe('object');
    }
  });

  it('has tutorial sub-keys in instructionView', () => {
    expect(en.instructionView.tutorial).toMatchObject({
      clickSubstep: expect.any(String),
      openParts: expect.any(String),
    });
  });
});
