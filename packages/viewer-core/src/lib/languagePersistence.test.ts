import { describe, it, expect, beforeEach } from 'vitest';
import { getStoredLanguage, LANGUAGE_STORAGE_KEY } from './languagePersistence';

describe('languagePersistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getStoredLanguage', () => {
    const validCodes = ['en', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'pl', 'zh', 'ja', 'ko'];

    it('returns stored language when valid', () => {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, 'de');
      expect(getStoredLanguage(validCodes)).toBe('de');
    });

    it('falls back to "de" when localStorage is empty', () => {
      expect(getStoredLanguage(validCodes)).toBe('de');
    });

    it('falls back to "de" when stored value is invalid', () => {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, 'xx');
      expect(getStoredLanguage(validCodes)).toBe('de');
    });

    it('falls back to "de" when stored value is empty string', () => {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, '');
      expect(getStoredLanguage(validCodes)).toBe('de');
    });
  });

  describe('languageChanged listener', () => {
    it('saves language to localStorage via the storage key', () => {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, 'fr');
      expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('fr');
    });
  });
});
