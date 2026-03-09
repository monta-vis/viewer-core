/**
 * Mweb i18n configuration.
 *
 * Uses viewerCoreTranslations (not the creator's locale files) so that
 * viewer-core components (InstructionView, PreferencesDialog, etc.)
 * resolve their translation keys correctly.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { viewerCoreTranslations } from '@monta-vis/viewer-core';

// Build i18next resources from viewer-core translations (11 languages)
const resources: Record<string, { translation: Record<string, unknown> }> = {};
for (const [lng, ns] of Object.entries(viewerCoreTranslations)) {
  resources[lng] = { translation: { ...ns } };
}

void i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
