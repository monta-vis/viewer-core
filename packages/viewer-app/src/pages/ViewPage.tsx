import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  sqliteToSnapshot,
  transformSnapshotToStore,
  flattenTranslations,
  applyTranslationsToStore,
  InstructionViewProvider,
  InstructionViewContainer,
  InstructionView,
  ViewerDataProvider,
  VideoProvider,
  IconButton,
  Navbar,
} from "@monta-vis/viewer-core";
import type { InstructionData, InstructionSnapshot } from "@monta-vis/viewer-core";

/** Apply content translations for a language to base (untranslated) data. */
function translateData(
  snap: InstructionSnapshot,
  base: InstructionData,
  lang: string,
): InstructionData {
  const sourceLanguage = snap.instruction.source_language ?? "en";
  if (lang === sourceLanguage) return base;
  const rows = flattenTranslations(snap.translations, lang);
  return applyTranslationsToStore(base, rows);
}

export function ViewPage() {
  const { folderName } = useParams<{ folderName: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [data, setData] = useState<InstructionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Refs for snapshot and base data — used by language effect without triggering it
  const snapshotRef = useRef<InstructionSnapshot | null>(null);
  const baseDataRef = useRef<InstructionData | null>(null);

  // ── Load project data from SQLite (once per folderName) ──
  useEffect(() => {
    if (!folderName || !window.electronAPI) {
      setError("Unable to load project");
      setIsLoading(false);
      return;
    }

    window.electronAPI.projects
      .getData(decodeURIComponent(folderName))
      .then((projectData) => {
        const snap = sqliteToSnapshot(projectData as Parameters<typeof sqliteToSnapshot>[0]);
        const base = transformSnapshotToStore(snap);

        snapshotRef.current = snap;
        baseDataRef.current = base;

        // Apply translations for current i18n language
        setData(translateData(snap, base, i18n.language));
        setIsLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setIsLoading(false);
      });
    // i18n.language intentionally excluded — handled by separate effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderName]);

  // ── Re-apply translations when global i18n language changes ──
  // PreferencesDialog calls i18n.changeLanguage(), so we listen here.
  useEffect(() => {
    if (!snapshotRef.current || !baseDataRef.current) return;
    setData(translateData(snapshotRef.current, baseDataRef.current, i18n.language));
  }, [i18n.language]);

  // Derive the first step ID from the loaded data
  const firstStepId = useMemo(() => {
    if (!data) return null;
    const steps = Object.values(data.steps);
    if (steps.length === 0) return null;
    // Sort by step_number to get the first step
    steps.sort((a, b) => a.stepNumber - b.stepNumber);
    return steps[0].id;
  }, [data]);

  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  // Set initial selected step when data loads
  useEffect(() => {
    if (firstStepId && !selectedStepId) {
      setSelectedStepId(firstStepId);
    }
  }, [firstStepId, selectedStepId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg-base)]">
        <Loader2 className="w-8 h-8 text-[var(--color-text-subtle)] animate-spin" />
        <p className="mt-4 text-[var(--color-text-muted)]">
          {t("common.loading")}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--color-bg-base)]">
        <Navbar
          left={
            <IconButton
              icon={<ArrowLeft />}
              aria-label={t("common.back")}
              variant="ghost"
              onClick={() => navigate("/")}
            />
          }
        />
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-[var(--color-text-danger)]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--color-bg-base)]">
      <div className="flex-1 overflow-hidden">
        <VideoProvider>
          <InstructionViewProvider>
            <ViewerDataProvider data={data}>
              <InstructionViewContainer>
                <InstructionView
                  selectedStepId={selectedStepId}
                  onStepChange={setSelectedStepId}
                  onBreak={() => navigate("/")}
                />
              </InstructionViewContainer>
            </ViewerDataProvider>
          </InstructionViewProvider>
        </VideoProvider>
      </div>
    </div>
  );
}
