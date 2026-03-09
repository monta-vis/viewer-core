/**
 * MwebApp — Main component for the .mweb viewer.
 *
 * Fetches data.json, transforms it, and renders InstructionView.
 * Shows a landing card first (title, cover image, language selector),
 * then the full InstructionView after clicking Start.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { Play } from 'lucide-react';
import {
  hexToBrandStyle,
  hexToBgStyle,
  InstructionCard,
  sortedValues,
  byStepNumber,
  VideoProvider,
  InstructionViewProvider,
  InstructionViewContainer,
  InstructionView,
  ViewerDataProvider,
  transformSnapshotToStore,
  applyTranslationsToStore,
  flattenTranslations,
  type InstructionLanguage,
  type InstructionSnapshot,
} from '@monta-vis/viewer-core';
import { useEditorStore } from '@monta-vis/editor-core';
import { isObfuscated, deobfuscateJson } from '@monta-vis/export-utils/obfuscation';
import {
  getUrlLanguage, getUrlMode, getUrlPrimary, getUrlAutostart, getUrlBg,
  fullscreen, tutorial, textSize, textSizeLarge, isEmbedded,
} from './urlParams';
import { useMwebReset, useMwebResize, useTextSize } from './useMwebEmbed';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MwebApp() {
  const { t } = useTranslation();
  const { data, setData } = useEditorStore();
  const [snapshot, setSnapshot] = useState<InstructionSnapshot | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>(getUrlLanguage() || '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(getUrlAutostart());
  const startedRef = useRef(started);
  startedRef.current = started;
  const [inlineHeight, setInlineHeight] = useState(0);

  useTextSize(textSize);
  useMwebReset(isEmbedded, setStarted);
  useMwebResize(isEmbedded, startedRef);

  // URL-configurable theme, brand color, and background color
  const theme = getUrlMode();
  const brandStyle = useMemo(() => {
    const urlPrimary = getUrlPrimary();
    if (urlPrimary) return hexToBrandStyle(urlPrimary);
    const brandingPrimary = snapshot?.branding?.[0]?.primary_color;
    return brandingPrimary ? hexToBrandStyle(brandingPrimary.replace('#', '')) : undefined;
  }, [snapshot]);
  const bgStyle = useMemo(() => {
    const urlBg = getUrlBg();
    if (urlBg) return hexToBgStyle(urlBg);
    const brandingSecondary = snapshot?.branding?.[0]?.secondary_color;
    return brandingSecondary ? hexToBgStyle(brandingSecondary.replace('#', '')) : undefined;
  }, [snapshot]);
  const combinedStyle = useMemo(() => ({ ...brandStyle, ...bgStyle }), [brandStyle, bgStyle]);

  // Sync URL language to i18next (for UI translations)
  useEffect(() => {
    const urlLang = getUrlLanguage();
    if (urlLang && i18n.language !== urlLang) {
      i18n.changeLanguage(urlLang);
    }
  }, []);

  // Load data.json on mount
  useEffect(() => {
    async function load() {
      try {
        const response = await fetch('./data.json');
        if (!response.ok) throw new Error(`Failed to load data.json: ${response.status}`);

        // Support obfuscated data.json
        const rawText = await response.text();
        const jsonText = isObfuscated(rawText) ? deobfuscateJson(rawText) : rawText;
        const snap: InstructionSnapshot = JSON.parse(jsonText);

        if (!language && snap.instruction.source_language) {
          setLanguage(snap.instruction.source_language);
          i18n.changeLanguage(snap.instruction.source_language);
        }

        setSnapshot(snap);
      } catch (err) {
        console.error('[MwebApp] Failed to load data.json:', err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Memoize the base transform — deterministic given same snapshot
  const transformedBase = useMemo(() => {
    if (!snapshot) return null;
    return transformSnapshotToStore(snapshot as Parameters<typeof transformSnapshotToStore>[0]);
  }, [snapshot]);

  // Set store data (with translations) when transformedBase is ready
  useEffect(() => {
    if (!transformedBase || !snapshot) return;

    const targetLang = getUrlLanguage() || '';
    let finalData = transformedBase;
    if (targetLang && targetLang !== transformedBase.sourceLanguage) {
      const translationRows = flattenTranslations(snapshot.translations, targetLang);
      if (translationRows.length > 0) {
        finalData = applyTranslationsToStore(transformedBase, translationRows);
      }
    }
    setData(finalData);

    // Pick first step
    const steps = sortedValues(transformedBase.steps, byStepNumber);
    if (steps.length > 0) setSelectedStepId(steps[0].id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transformedBase]);

  // Language change handler
  const handleLanguageChange = useCallback((lang: InstructionLanguage) => {
    if (!snapshot || !transformedBase) return;

    setLanguage(lang);
    i18n.changeLanguage(lang);

    if (lang !== transformedBase.sourceLanguage) {
      const translationRows = flattenTranslations(snapshot.translations, lang);
      if (translationRows.length > 0) {
        setData(applyTranslationsToStore(transformedBase, translationRows));
        return;
      }
    }
    // No translations or same as source → use original
    setData(transformedBase);
  }, [snapshot, transformedBase, setData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 bg-[var(--color-bg-base)]">
        <div className="text-[var(--color-text-muted)]">{t('common.loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 bg-[var(--color-bg-base)]">
        <div className="text-center px-4 max-w-md">
          <p className="text-red-500 font-medium">{t('common.error')}</p>
          <p className="text-[var(--color-text-muted)] mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || !snapshot) return null;

  const languages = snapshot.meta.languages;
  const sourceLanguage = snapshot.instruction.source_language || 'de';

  // Resolve cover image URL from snapshot
  const coverImageUrl = (() => {
    const areaId = snapshot.instruction.cover_image_area_id;
    if (!areaId) return null;
    const area = snapshot.videoFrameAreas[areaId];
    return area?.url_1080p || area?.url_720p || null;
  })();

  // Estimated duration from snapshot
  const estimatedDuration = snapshot.instruction.estimated_duration;

  const handleStart = () => {
    if (!fullscreen) {
      const root = document.getElementById('root');
      if (root) setInlineHeight(Math.ceil(root.getBoundingClientRect().height));
    }
    if (fullscreen && isEmbedded) {
      window.parent.postMessage({ type: 'mweb-start' }, '*');
    }
    setStarted(true);
  };

  // Landing card — shown before the instruction starts
  if (!started) {
    return (
      <InstructionViewProvider
        defaultTheme={theme}
        defaultLanguage={(language || sourceLanguage) as InstructionLanguage}
      >
        <div
          className={theme === 'light' ? 'instruction-theme-light' : 'instruction-theme-dark'}
          style={{
            width: '100%',
            ...combinedStyle,
            background: 'transparent',
          }}
        >
          <InstructionCard
            flat
            name={data.instructionName}
            description={data.instructionDescription ?? null}
            version={snapshot.meta.revision > 0 ? snapshot.meta.revision : undefined}
            articleNumber={snapshot.instruction.article_number}
            estimatedDuration={estimatedDuration}
            updatedAt={snapshot.meta.generated_at}
            imageUrl={coverImageUrl}
            previewImageId={null}
            onClick={handleStart}
            languages={languages}
            sourceLanguage={sourceLanguage}
            footerClassName="bg-[var(--color-bg-base)]"
            footer={
              <div className="relative z-[60] pt-3 mt-2 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStart();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--color-bg-elevated)] backdrop-blur-md ring-1 ring-[var(--color-border-base)] text-[var(--color-text-primary)] font-semibold text-base hover:bg-[var(--color-bg-card-hover)] transition-colors"
                  aria-label={t('instructionView.start', 'Start Assembly')}
                >
                  <Play className="w-4 h-4" />
                  {t('instructionView.start', 'Start Assembly')}
                </button>

                <p className="text-xs tracking-wide text-[var(--color-text-muted)] opacity-40 text-center">
                  {t('mweb.poweredBy', 'Powered by Montavis')}
                </p>
              </div>
            }
          />
        </div>
      </InstructionViewProvider>
    );
  }

  return (
    <VideoProvider>
      <InstructionViewProvider
        defaultTheme={theme}
        defaultLanguage={(language || sourceLanguage) as InstructionLanguage}
        onLanguageChange={languages.length > 0 ? handleLanguageChange : undefined}
      >
        <div
          className={`${fullscreen ? 'h-screen' : ''} flex flex-col bg-[var(--color-bg-base)]`}
          style={!fullscreen && inlineHeight ? { height: `${inlineHeight}px` } : undefined}
        >
          <div className="flex-1 min-h-0 overflow-hidden">
            <ViewerDataProvider data={data}>
              <InstructionViewContainer className="h-full" style={combinedStyle} textSizeLarge={textSizeLarge}>
                <InstructionView
                  selectedStepId={selectedStepId}
                  onStepChange={setSelectedStepId}
                  instructionId={snapshot.instruction.id}
                  useBlurred={data.useBlurred}
                  tutorial={tutorial}
                  onBreak={() => {
                    if (fullscreen && isEmbedded) {
                      window.parent.postMessage({ type: 'mweb-close' }, '*');
                    }
                    setStarted(false);
                  }}
                />
              </InstructionViewContainer>
            </ViewerDataProvider>
          </div>
        </div>
      </InstructionViewProvider>
    </VideoProvider>
  );
}
