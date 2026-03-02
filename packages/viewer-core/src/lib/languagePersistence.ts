export const LANGUAGE_STORAGE_KEY = 'montavis-language';

/** Read the stored language from localStorage, falling back to 'de'. */
export function getStoredLanguage(validCodes: string[]): string {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored && validCodes.includes(stored)) return stored;
  return 'de';
}

/** Save the current language to localStorage. Intended as an i18n.on('languageChanged') callback. */
export function saveLanguage(lng: string): void {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
}
