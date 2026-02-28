import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
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
import type { InstructionData, InstructionSnapshot, NoteLevel } from "@monta-vis/viewer-core";
import {
  useEditorStore,
  useAutoSave,
  SubstepEditPopover,
  type SafetyIconCatalog,
} from "@monta-vis/editor-core";
import { createElectronAdapter } from "../persistence/electronAdapter";

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

const editEnabled = import.meta.env.VITE_EDIT_ENABLED !== 'false';

function generateId(): string {
  return crypto.randomUUID();
}

export function ViewPage() {
  const { folderName } = useParams<{ folderName: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const editModeActive = (location.state as { editMode?: boolean } | null)?.editMode ?? false;
  const { t, i18n } = useTranslation();

  const [data, setData] = useState<InstructionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Safety icon catalogs (loaded from disk via Electron API)
  const [safetyIconCatalogs, setSafetyIconCatalogs] = useState<SafetyIconCatalog[]>([]);

  useEffect(() => {
    window.electronAPI?.catalogs
      ?.getSafetyIcons()
      .then((result: SafetyIconCatalog[]) => setSafetyIconCatalogs(result ?? []))
      .catch(() => setSafetyIconCatalogs([]));
  }, []);

  // Subscribe to store data (reflects edits)
  const storeData = useEditorStore((s) => s.data);

  // Persistence adapter
  const adapter = useMemo(() => createElectronAdapter(), []);

  // Decoded folder name for persistence
  const decodedFolderName = useMemo(
    () => (folderName ? decodeURIComponent(folderName) : undefined),
    [folderName],
  );

  // Auto-save: watches store for changes and saves automatically
  useAutoSave({
    adapter,
    projectId: decodedFolderName ?? '',
    enabled: !!decodedFolderName,
  });

  // Refs for snapshot and base data — used by language effect without triggering it
  const snapshotRef = useRef<InstructionSnapshot | null>(null);
  const baseDataRef = useRef<InstructionData | null>(null);

  // ── Load project data from SQLite (once per folderName) ──
  useEffect(() => {
    if (!folderName || !window.electronAPI) {
      setError(t("common.unableToLoadProject", "Unable to load project"));
      setIsLoading(false);
      return;
    }

    window.electronAPI.projects
      .getData(decodeURIComponent(folderName))
      .then((projectData) => {
        if (!projectData || typeof projectData !== 'object') {
          throw new Error('Invalid project data');
        }
        const snap = sqliteToSnapshot(projectData as Parameters<typeof sqliteToSnapshot>[0]);
        const base = transformSnapshotToStore(snap);

        snapshotRef.current = snap;
        baseDataRef.current = base;

        // Hydrate the Zustand store for change tracking
        useEditorStore.getState().setData(base);

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
  useEffect(() => {
    if (!snapshotRef.current || !baseDataRef.current) return;
    setData(translateData(snapshotRef.current, baseDataRef.current, i18n.language));
  }, [i18n.language]);

  // Use store data when available (reflects edits), fallback to local state
  const viewerData = storeData ?? data;

  // Derive the first step ID from the initial loaded data (not store data)
  const firstStepId = useMemo(() => {
    if (!data) return null;
    const steps = Object.values(data.steps);
    if (steps.length === 0) return null;
    return [...steps].sort((a, b) => a.stepNumber - b.stepNumber)[0].id;
  }, [data]);

  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  useEffect(() => {
    if (firstStepId && !selectedStepId) {
      setSelectedStepId(firstStepId);
    }
  }, [firstStepId, selectedStepId]);

  // ── Helper: get versionId from store ──
  const getVersionId = useCallback(() => {
    const d = useEditorStore.getState().data;
    return d?.currentVersionId ?? d?.instructionId ?? "";
  }, []);

  // ── Helper: get instructionId from store ──
  const getInstructionId = useCallback(() => {
    return useEditorStore.getState().data?.instructionId ?? "";
  }, []);

  // ── Edit callbacks (direct store calls, no dialogs) ──

  // --- Description operations (inline save) ---
  const onSaveDescription = useCallback((descId: string, text: string) => {
    useEditorStore.getState().updateSubstepDescription(descId, { text });
  }, []);

  const onAddDescription = useCallback((text: string, substepId: string) => {
    const store = useEditorStore.getState();
    const existingDescs = Object.values(store.data?.substepDescriptions ?? {})
      .filter((d) => d.substepId === substepId);
    const maxOrder = existingDescs.reduce((max, d) => Math.max(max, d.order), -1);

    store.addSubstepDescription({
      id: generateId(),
      substepId,
      text,
      order: maxOrder + 1,
      versionId: getVersionId(),
    });
  }, [getVersionId]);

  const onDeleteDescription = useCallback((descId: string) => {
    useEditorStore.getState().deleteSubstepDescription(descId);
  }, []);

  // --- Note operations (inline save) ---
  const onSaveNote = useCallback((noteRowId: string, text: string, level: NoteLevel, safetyIconId: string | null, safetyIconCategory: string | null) => {
    const store = useEditorStore.getState();
    const substepNote = store.data?.substepNotes[noteRowId];
    if (!substepNote) return;

    store.updateNote(substepNote.noteId, {
      text,
      level,
      safetyIconId,
      safetyIconCategory,
    });
  }, []);

  const onAddNote = useCallback((text: string, level: NoteLevel, safetyIconId: string | null, safetyIconCategory: string | null, substepId: string) => {
    const noteId = generateId();
    const substepNoteId = generateId();
    const versionId = getVersionId();
    const instructionId = getInstructionId();

    const store = useEditorStore.getState();
    const existingNotes = Object.values(store.data?.substepNotes ?? {})
      .filter((sn) => sn.substepId === substepId);
    const maxOrder = existingNotes.reduce((max, sn) => Math.max(max, sn.order), -1);

    // Create the note entity
    store.addNote({
      id: noteId,
      versionId,
      instructionId,
      text,
      level,
      safetyIconId,
      safetyIconCategory,
    });

    // Create the junction row
    store.addSubstepNote({
      id: substepNoteId,
      versionId,
      substepId,
      noteId,
      order: maxOrder + 1,
    });
  }, [getVersionId, getInstructionId]);

  const onDeleteNote = useCallback((noteRowId: string) => {
    const store = useEditorStore.getState();
    const substepNote = store.data?.substepNotes[noteRowId];
    if (!substepNote) return;

    // Delete the junction row and the note itself
    store.deleteSubstepNote(noteRowId);
    store.deleteNote(substepNote.noteId);
  }, []);

  // --- Repeat operations (inline save) ---
  const onSaveRepeat = useCallback((count: number, label: string | null, substepId: string) => {
    useEditorStore.getState().updateSubstep(substepId, { repeatCount: count, repeatLabel: label });
  }, []);

  const onDeleteRepeat = useCallback((substepId: string) => {
    useEditorStore.getState().updateSubstep(substepId, { repeatCount: 1, repeatLabel: null });
  }, []);

  // --- Delete operations (direct store calls) ---
  const onDeleteSubstep = useCallback((substepId: string) => {
    useEditorStore.getState().deleteSubstep(substepId);
  }, []);

  const onDeleteImage = useCallback((substepId: string) => {
    const store = useEditorStore.getState();
    const substep = store.data?.substeps[substepId];
    if (!substep) return;

    for (const imageId of substep.imageRowIds) {
      store.deleteSubstepImage(imageId);
    }
  }, []);

  const onDeleteTutorial = useCallback((refIdx: number, substepId: string) => {
    const store = useEditorStore.getState();
    const substep = store.data?.substeps[substepId];
    if (!substep) return;

    const refId = substep.tutorialRowIds[refIdx];
    if (refId) {
      store.deleteSubstepTutorial(refId);
    }
  }, []);

  const onDeletePartTool = useCallback((partToolId: string) => {
    const store = useEditorStore.getState();
    // Find and delete all substep_part_tool junction rows for this partTool
    const sptRows = Object.values(store.data?.substepPartTools ?? {})
      .filter((spt) => spt.partToolId === partToolId);
    for (const spt of sptRows) {
      store.deleteSubstepPartTool(spt.id);
    }
  }, []);

  // ── Memoized edit callbacks ──
  const editCallbacks = useMemo(() => ({
    onSaveDescription,
    onDeleteDescription,
    onAddDescription,
    onSaveNote,
    onDeleteNote,
    onAddNote,
    onSaveRepeat,
    onDeleteRepeat,
    onDeleteSubstep,
    onDeleteImage,
    onDeleteTutorial,
    onDeletePartTool,
  }), [
    onSaveDescription, onDeleteDescription, onAddDescription,
    onSaveNote, onDeleteNote, onAddNote, onSaveRepeat, onDeleteRepeat,
    onDeleteSubstep, onDeleteImage, onDeleteTutorial, onDeletePartTool,
  ]);

  // ── Edit popover render function (captures folderName + catalogs in closure) ──
  const renderEditPopover = useCallback(
    (props: Parameters<typeof SubstepEditPopover>[0]) => (
      <SubstepEditPopover {...props} folderName={decodedFolderName} catalogs={safetyIconCatalogs} />
    ),
    [decodedFolderName, safetyIconCatalogs],
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg-base)]">
        <Loader2 className="w-8 h-8 text-[var(--color-text-subtle)] animate-spin" />
        <p className="mt-4 text-[var(--color-text-muted)]">
          {t("common.loading", "Loading...")}
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
              aria-label={t("common.back", "Back")}
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
            <ViewerDataProvider data={viewerData}>
              <InstructionViewContainer>
                <InstructionView
                  selectedStepId={selectedStepId}
                  onStepChange={setSelectedStepId}
                  onBreak={() => navigate("/")}
                  folderName={decodedFolderName}
                  editModeActive={editEnabled && editModeActive}
                  editCallbacks={editEnabled ? editCallbacks : undefined}
                  renderEditPopover={editEnabled ? renderEditPopover : undefined}
                />
              </InstructionViewContainer>
            </ViewerDataProvider>
          </InstructionViewProvider>
        </VideoProvider>
      </div>
    </div>
  );
}
