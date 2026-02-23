/**
 * Shared language constants and utilities.
 * Used by dashboard, editor, and translations features.
 */

/** Languages supported by Mistral Small 3 (via Ollama) for instruction translation */
export const SUPPORTED_LANGUAGES = [
  { code: 'de', label: 'Deutsch', native: 'Deutsch' },
  { code: 'en', label: 'English', native: 'English' },
  { code: 'es', label: 'Spanish', native: 'Español' },
  { code: 'fr', label: 'French', native: 'Français' },
  { code: 'it', label: 'Italian', native: 'Italiano' },
  { code: 'pt', label: 'Portuguese', native: 'Português' },
  { code: 'nl', label: 'Dutch', native: 'Nederlands' },
  { code: 'pl', label: 'Polish', native: 'Polski' },
  { code: 'zh', label: 'Chinese', native: '中文' },
  { code: 'ja', label: 'Japanese', native: '日本語' },
  { code: 'ko', label: 'Korean', native: '한국어' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

/** Get language label by code */
export function getLanguageLabel(code: string): string {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
  return lang?.code.toUpperCase() ?? code.toUpperCase();
}

/** Map i18n language codes to our supported languages */
export function mapToSupportedLanguage(lang: string): LanguageCode {
  const normalized = lang.toLowerCase().split('-')[0];
  const found = SUPPORTED_LANGUAGES.find(l => l.code === normalized);
  return found?.code ?? 'en';
}
