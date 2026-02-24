import type { LanguageCode } from '../languages';
import type { TranslationNamespaces } from './types';
import { de } from './de';
import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import { it } from './it';
import { ja } from './ja';
import { ko } from './ko';
import { nl } from './nl';
import { pl } from './pl';
import { pt } from './pt';
import { zh } from './zh';

export type { TranslationNamespaces };

/**
 * Translations for all supported languages.
 * Record<LanguageCode, ...> ensures TypeScript errors if any language is missing.
 */
export const viewerCoreTranslations: Record<LanguageCode, TranslationNamespaces> = {
  de,
  en,
  es,
  fr,
  it,
  ja,
  ko,
  nl,
  pl,
  pt,
  zh,
};
