import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2, Save, Undo2, Redo2 } from "lucide-react";
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
  Button,
  Navbar,
} from "@monta-vis/viewer-core";
import type { InstructionData, InstructionSnapshot, NoteLevel } from "@monta-vis/viewer-core";
import { useEditorStore, SubstepEditPopover, type ProjectChanges } from "@monta-vis/editor-core";
import { createElectronAdapter } from "../persistence/electronAdapter";
import { useHistoryStore, useHistorySync } from "../stores/historyStore";
import { TextEditDialog } from "../components/TextEditDialog";
import { NoteEditDialog } from "../components/NoteEditDialog";

// ── Dialog state types ──

interface DescriptionDialog {
  type: "description";
  title: string;
  initialValue: string;
  onSave: (text: string) => void;
}

interface NoteDialog {
  type: "note";
  title: string;
  initialText: string;
  initialSafetyIconId: string | null;
  initialSafetyIconCategory: string | null;
  onSave: (text: string, level: NoteLevel, safetyIconId: string | null, safetyIconCategory: string | null) => void;
}

type EditDialog = DescriptionDialog | NoteDialog;

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

function generateId(): string {
  return crypto.randomUUID();
}

export function ViewPage() {
  const { folderName } = useParams<{ folderName: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [data, setData] = useState<InstructionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Dialog state for editing descriptions/notes
  const [editDialog, setEditDialog] = useState<EditDialog | null>(null);

  // Ref for save message timeout cleanup
  const saveMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscribe to store change tracking
  const hasChanges = useEditorStore((s) => s.hasChanges());
  const storeData = useEditorStore((s) => s.data);

  // Persistence adapter
  const adapter = useMemo(() => createElectronAdapter(), []);

  // Undo/redo
  useHistorySync();
  const canUndo = useHistoryStore((s) => s.canUndo());
  const canRedo = useHistoryStore((s) => s.canRedo());

  // Refs for snapshot and base data — used by language effect without triggering it
  const snapshotRef = useRef<InstructionSnapshot | null>(null);
  const baseDataRef = useRef<InstructionData | null>(null);

  // Cleanup save message timer on unmount
  useEffect(() => () => {
    if (saveMessageTimerRef.current) clearTimeout(saveMessageTimerRef.current);
  }, []);

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

  // ── Save handler ──
  const decodedFolderName = useMemo(
    () => (folderName ? decodeURIComponent(folderName) : undefined),
    [folderName],
  );

  const handleSave = useCallback(async () => {
    if (!decodedFolderName) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const changes = useEditorStore.getState().getChangedData() as ProjectChanges;
      const result = await adapter.saveChanges(decodedFolderName, changes);

      if (result.success) {
        useEditorStore.getState().clearChanges();
        setSaveMessage({ type: "success", text: t("common.saved", "Saved successfully") });
      } else {
        setSaveMessage({ type: "error", text: result.error ?? t("common.saveError", "Save failed") });
      }
    } catch (err) {
      setSaveMessage({
        type: "error",
        text: err instanceof Error ? err.message : t("common.saveError", "Save failed"),
      });
    } finally {
      setIsSaving(false);
      if (saveMessageTimerRef.current) clearTimeout(saveMessageTimerRef.current);
      saveMessageTimerRef.current = setTimeout(() => setSaveMessage(null), 3000);
    }
  }, [decodedFolderName, adapter, t]);

  // ── Helper: get versionId from store ──
  const getVersionId = useCallback(() => {
    const d = useEditorStore.getState().data;
    return d?.currentVersionId ?? d?.instructionId ?? "";
  }, []);

  // ── Helper: get instructionId from store ──
  const getInstructionId = useCallback(() => {
    return useEditorStore.getState().data?.instructionId ?? "";
  }, []);

  // ── Edit callbacks ──

  // --- Description operations ---
  const onEditDescription = useCallback((descId: string) => {
    const store = useEditorStore.getState();
    const desc = store.data?.substepDescriptions[descId];
    if (!desc) return;

    setEditDialog({
      type: "description",
      title: t("edit.editDescription", "Edit Description"),
      initialValue: desc.text,
      onSave: (text) => {
        useEditorStore.getState().updateSubstepDescription(descId, { text });
      },
    });
  }, [t]);

  const onAddDescription = useCallback((substepId: string) => {
    setEditDialog({
      type: "description",
      title: t("edit.addDescription", "Add Description"),
      initialValue: "",
      onSave: (text) => {
        const store = useEditorStore.getState();
        const existingDescs = Object.values(store.data?.substepDescriptions ?? {})
          .filter((d) => d.substepId === substepId);
        const maxOrder = existingDescs.reduce((max, d) => Math.max(max, d.order), -1);

        useEditorStore.getState().addSubstepDescription({
          id: generateId(),
          substepId,
          text,
          order: maxOrder + 1,
          versionId: getVersionId(),
        });
      },
    });
  }, [t, getVersionId]);

  const onDeleteDescription = useCallback((descId: string) => {
    useEditorStore.getState().deleteSubstepDescription(descId);
  }, []);

  // --- Note operations ---
  const onEditNote = useCallback((noteRowId: string) => {
    const store = useEditorStore.getState();
    const substepNote = store.data?.substepNotes[noteRowId];
    if (!substepNote) return;

    const note = store.data?.notes[substepNote.noteId];
    if (!note) return;

    setEditDialog({
      type: "note",
      title: t("edit.editNote", "Edit Note"),
      initialText: note.text,
      initialSafetyIconId: note.safetyIconId,
      initialSafetyIconCategory: note.safetyIconCategory,
      onSave: (text, level, safetyIconId, safetyIconCategory) => {
        useEditorStore.getState().updateNote(substepNote.noteId, {
          text,
          level,
          safetyIconId,
          safetyIconCategory,
        });
      },
    });
  }, [t]);

  const onAddNote = useCallback((substepId: string) => {
    setEditDialog({
      type: "note",
      title: t("edit.addNote", "Add Note"),
      initialText: "",
      initialSafetyIconId: null,
      initialSafetyIconCategory: null,
      onSave: (text, level, safetyIconId, safetyIconCategory) => {
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
      },
    });
  }, [t, getVersionId, getInstructionId]);

  const onDeleteNote = useCallback((noteRowId: string) => {
    const store = useEditorStore.getState();
    const substepNote = store.data?.substepNotes[noteRowId];
    if (!substepNote) return;

    // Delete the junction row and the note itself
    store.deleteSubstepNote(noteRowId);
    store.deleteNote(substepNote.noteId);
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

  const onDeleteReference = useCallback((refIdx: number, substepId: string) => {
    const store = useEditorStore.getState();
    const substep = store.data?.substeps[substepId];
    if (!substep) return;

    const refId = substep.referenceRowIds[refIdx];
    if (refId) {
      store.deleteSubstepReference(refId);
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

  // ── Memoized edit callbacks (unimplemented callbacks are omitted) ──
  const editCallbacks = useMemo(() => ({
    onEditDescription,
    onDeleteDescription,
    onAddDescription,
    onEditNote,
    onDeleteNote,
    onAddNote,
    onDeleteSubstep,
    onDeleteImage,
    onDeleteReference,
    onDeletePartTool,
  }), [
    onEditDescription, onDeleteDescription, onAddDescription,
    onEditNote, onDeleteNote, onAddNote,
    onDeleteSubstep, onDeleteImage, onDeleteReference, onDeletePartTool,
  ]);

  // ── Edit popover render function ──
  const renderEditPopover = useCallback(
    (props: Parameters<typeof SubstepEditPopover>[0]) => <SubstepEditPopover {...props} />,
    [],
  );

  // ── Navbar extras (save, undo, redo) ──
  const editNavbarExtra = useMemo(() => (
    <div className="flex items-center gap-1">
      <IconButton
        icon={<Undo2 />}
        onClick={() => useHistoryStore.getState().undo()}
        disabled={!canUndo}
        variant="ghost"
        aria-label={t("edit.undo", "Undo")}
      />
      <IconButton
        icon={<Redo2 />}
        onClick={() => useHistoryStore.getState().redo()}
        disabled={!canRedo}
        variant="ghost"
        aria-label={t("edit.redo", "Redo")}
      />
      <Button
        variant="primary"
        size="sm"
        onClick={handleSave}
        disabled={!hasChanges || isSaving}
        className={`h-12 sm:h-14 px-2 sm:px-3 ${hasChanges && !isSaving ? "animate-pulse" : ""}`}
        aria-label={t("common.save", "Save")}
      >
        {isSaving ? (
          <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
        ) : (
          <Save className="h-5 w-5 sm:h-6 sm:w-6" />
        )}
      </Button>
      {saveMessage && (
        <span
          className={`text-xs px-2 py-1 rounded-lg ${
            saveMessage.type === "success"
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
          }`}
        >
          {saveMessage.text}
        </span>
      )}
    </div>
  ), [canUndo, canRedo, hasChanges, isSaving, saveMessage, handleSave, t]);

  // ── Dialog close handler ──
  const closeDialog = useCallback(() => setEditDialog(null), []);

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
                  editNavbarExtra={editNavbarExtra}
                  editCallbacks={editCallbacks}
                  renderEditPopover={renderEditPopover}
                />
              </InstructionViewContainer>
            </ViewerDataProvider>
          </InstructionViewProvider>
        </VideoProvider>
      </div>

      {/* Edit dialogs */}
      {editDialog?.type === "description" && (
        <TextEditDialog
          open
          title={editDialog.title}
          initialValue={editDialog.initialValue}
          onSave={editDialog.onSave}
          onClose={closeDialog}
        />
      )}
      {editDialog?.type === "note" && (
        <NoteEditDialog
          open
          initialText={editDialog.initialText}
          initialSafetyIconId={editDialog.initialSafetyIconId}
          initialSafetyIconCategory={editDialog.initialSafetyIconCategory}
          folderName={decodedFolderName}
          onSave={editDialog.onSave}
          onClose={closeDialog}
        />
      )}
    </div>
  );
}
