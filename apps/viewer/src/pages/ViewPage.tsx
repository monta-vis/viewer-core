import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
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
  LoadingCard,
  Navbar,
  useTheme,
} from "@monta-vis/viewer-core";
import type { InstructionData, InstructionSnapshot, SafetyIconCategory, PartToolRow, AggregatedPartTool } from "@monta-vis/viewer-core";
import { buildMediaUrl } from "@monta-vis/viewer-core";
import {
  useEditorStore,
  useAutoSave,
  SubstepEditPopover,
  PartToolListPanel,
  PartToolDetailEditor,
  createDefaultPartTool,
  type SafetyIconCatalog,
  type NormalizedCrop,
  type PartToolImageItem,
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

export function ViewPage() {
  const { folderName } = useParams<{ folderName: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const editModeActive = (location.state as { editMode?: boolean } | null)?.editMode ?? false;
  const { t, i18n } = useTranslation();
  const { resolvedTheme } = useTheme();

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

        // Hydrate the Zustand store with translated data
        const translated = translateData(snap, base, i18n.language);
        useEditorStore.getState().setData(translated);
        setData(translated);
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
    const translated = translateData(snapshotRef.current, baseDataRef.current, i18n.language);
    useEditorStore.getState().setData(translated);
    setData(translated);
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
      id: crypto.randomUUID(),
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

  /** Copy a catalog icon into the project folder, returning the resolved VFA ID or null on failure. */
  const tryCopyCatalogIcon = useCallback(async (
    sourceIconId: string | undefined,
    safetyIconId: string,
  ): Promise<string | null> => {
    if (!sourceIconId || !decodedFolderName || !adapter.copyCatalogIcon) return safetyIconId;
    const result = await adapter.copyCatalogIcon(decodedFolderName, 'SafetyIcons', sourceIconId, safetyIconId);
    if (result.success && result.vfaId) return result.vfaId;
    console.error('[copyCatalogIcon] Failed:', result.error ?? 'unknown');
    return null;
  }, [decodedFolderName, adapter]);

  const onSaveNote = useCallback(async (noteRowId: string, text: string, safetyIconId: string, safetyIconCategory: SafetyIconCategory, _substepId: string, sourceIconId?: string) => {
    const finalIconId = await tryCopyCatalogIcon(sourceIconId, safetyIconId);
    if (!finalIconId) return;

    const store = useEditorStore.getState();
    const substepNote = store.data?.substepNotes[noteRowId];
    if (!substepNote) return;

    store.updateNote(substepNote.noteId, {
      text,
      safetyIconId: finalIconId,
      safetyIconCategory,
    });
  }, [tryCopyCatalogIcon]);

  const onAddNote = useCallback(async (text: string, safetyIconId: string, safetyIconCategory: SafetyIconCategory, substepId: string, sourceIconId?: string) => {
    const finalIconId = await tryCopyCatalogIcon(sourceIconId, safetyIconId);
    if (!finalIconId) return;

    const noteId = crypto.randomUUID();
    const substepNoteId = crypto.randomUUID();
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
      safetyIconId: finalIconId,
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
  }, [getVersionId, getInstructionId, tryCopyCatalogIcon]);

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

  const onAddSubstepPartTool = useCallback((substepId: string) => {
    const store = useEditorStore.getState();
    const data = store.data;
    if (!data) return;
    const pt = createDefaultPartTool(getVersionId(), getInstructionId());
    store.addPartTool(pt);
    const substep = data.substeps[substepId];
    const maxOrder = substep
      ? substep.partToolRowIds.reduce((max, id) => {
          const spt = data.substepPartTools[id];
          return spt ? Math.max(max, spt.order) : max;
        }, 0)
      : 0;
    store.addSubstepPartTool({
      id: crypto.randomUUID(), versionId: getVersionId(), substepId,
      partToolId: pt.id, amount: 1, order: maxOrder + 1,
    });
  }, [getVersionId, getInstructionId]);

  const onUpdateSubstepPartToolAmount = useCallback((substepPartToolId: string, amount: number) => {
    useEditorStore.getState().updateSubstepPartTool(substepPartToolId, { amount });
  }, []);

  const onDeleteSubstepPartTool = useCallback((substepPartToolId: string) => {
    useEditorStore.getState().deleteSubstepPartTool(substepPartToolId);
  }, []);

  const onReplaceSubstepPartTool = useCallback((substepPartToolId: string, newPartToolId: string) => {
    useEditorStore.getState().updateSubstepPartTool(substepPartToolId, { partToolId: newPartToolId });
  }, []);

  const onCreateAndReplacePartTool = useCallback((substepPartToolId: string, field: 'name' | 'label' | 'partNumber', value: string) => {
    const store = useEditorStore.getState();
    const pt = createDefaultPartTool(getVersionId(), getInstructionId());
    pt[field] = value;
    store.addPartTool(pt);
    store.updateSubstepPartTool(substepPartToolId, { partToolId: pt.id });
  }, [getVersionId, getInstructionId]);

  // --- Assembly operations ---
  const onAddAssembly = useCallback(() => {
    const store = useEditorStore.getState();
    const data = store.data;
    if (!data) return;
    const assemblies = Object.values(data.assemblies);
    const maxOrder = assemblies.reduce((max, a) => Math.max(max, a.order), 0);
    store.addAssembly({
      id: crypto.randomUUID(),
      versionId: getVersionId(),
      instructionId: getInstructionId(),
      title: null,
      description: null,
      order: maxOrder + 1,
      previewImageId: null,
      stepIds: [],
    });
  }, [getVersionId, getInstructionId]);

  const onDeleteAssembly = useCallback((assemblyId: string) => {
    useEditorStore.getState().deleteAssembly(assemblyId);
  }, []);

  const onRenameAssembly = useCallback((assemblyId: string, title: string) => {
    useEditorStore.getState().updateAssembly(assemblyId, { title: title || null });
  }, []);

  const onMoveStepToAssembly = useCallback((stepId: string, assemblyId: string | null) => {
    useEditorStore.getState().assignStepToAssembly(stepId, assemblyId);
  }, []);

  // ── PartToolListPanel state & callbacks ──
  const [partToolListOpen, setPartToolListOpen] = useState(false);

  const onOpenPartToolList = useCallback(() => {
    setPartToolListOpen(true);
  }, []);

  const onAddPartTool = useCallback(() => {
    const store = useEditorStore.getState();
    const pt = createDefaultPartTool(getVersionId(), getInstructionId());
    store.addPartTool(pt);
  }, [getVersionId, getInstructionId]);

  const onUpdatePartTool = useCallback((id: string, updates: Partial<PartToolRow>) => {
    useEditorStore.getState().updatePartTool(id, updates);
  }, []);

  const onDeletePartToolFromList = useCallback((id: string) => {
    const store = useEditorStore.getState();
    // Delete all substep_part_tool junction rows for this partTool
    const sptRows = Object.values(store.data?.substepPartTools ?? {})
      .filter((spt) => spt.partToolId === id);
    for (const spt of sptRows) {
      store.deleteSubstepPartTool(spt.id);
    }
    // Delete all part_tool_video_frame_area junction rows + their VFAs
    const ptvfaRows = Object.values(store.data?.partToolVideoFrameAreas ?? {})
      .filter((row) => row.partToolId === id);
    for (const row of ptvfaRows) {
      store.deletePartToolVideoFrameArea(row.id);
      store.deleteVideoFrameArea(row.videoFrameAreaId);
    }
    store.deletePartTool(id);
  }, []);

  const onUploadPartToolImage = useCallback(async (partToolId: string, image: File, crop: NormalizedCrop) => {
    if (!decodedFolderName || !adapter.uploadPartToolImage) return;
    // Electron File objects have a `path` property with the native file path
    const filePath = (image as File & { path?: string }).path;
    if (!filePath) return;

    const result = await adapter.uploadPartToolImage(
      decodedFolderName,
      partToolId,
      { type: 'path', path: filePath },
      crop,
    );

    if (result.success && result.vfaId) {
      const store = useEditorStore.getState();
      // Add VFA row to store
      store.addVideoFrameArea({
        id: result.vfaId,
        versionId: getVersionId(),
        videoId: null,
        frameNumber: null,
        x: crop.x,
        y: crop.y,
        width: crop.width,
        height: crop.height,
        type: 'PartToolScan',
        localPath: null,
      });
      // Add junction row to store
      if (result.junctionId) {
        store.addPartToolVideoFrameArea({
          id: result.junctionId,
          versionId: getVersionId(),
          partToolId,
          videoFrameAreaId: result.vfaId,
          isPreviewImage: true,
          order: 0,
        });
      }
      // Update part tool's preview image
      store.updatePartTool(partToolId, { previewImageId: result.vfaId });
    }
  }, [decodedFolderName, adapter, getVersionId]);

  const onDeletePartToolImage = useCallback((partToolId: string, areaId: string) => {
    const store = useEditorStore.getState();
    // Find and delete the junction row
    const junctionRow = Object.values(store.data?.partToolVideoFrameAreas ?? {})
      .find((row) => row.partToolId === partToolId && row.videoFrameAreaId === areaId);
    if (junctionRow) {
      store.deletePartToolVideoFrameArea(junctionRow.id);
    }
    // Delete the VFA
    if (areaId) {
      store.deleteVideoFrameArea(areaId);
    }
    // Clear preview image if it was the deleted area
    const pt = store.data?.partTools[partToolId];
    if (pt?.previewImageId === areaId) {
      store.updatePartTool(partToolId, { previewImageId: null });
    }
  }, []);

  const getPartToolPreviewUrl = useCallback((partToolId: string): string | null => {
    if (!decodedFolderName) return null;
    const store = useEditorStore.getState();
    const pt = store.data?.partTools[partToolId];
    if (!pt?.previewImageId) return null;
    return buildMediaUrl(decodedFolderName, `media/frames/${pt.previewImageId}/image`);
  }, [decodedFolderName]);

  const getPartToolImages = useCallback((partToolId: string): PartToolImageItem[] => {
    const store = useEditorStore.getState();
    const ptvfas = store.data?.partToolVideoFrameAreas ?? {};
    return Object.values(ptvfas)
      .filter((j) => j.partToolId === partToolId)
      .sort((a, b) => a.order - b.order)
      .map((j) => ({
        junctionId: j.id,
        areaId: j.videoFrameAreaId,
        url: buildMediaUrl(decodedFolderName!, `media/frames/${j.videoFrameAreaId}/image`),
        isPreview: j.isPreviewImage,
      }));
  }, [decodedFolderName]);

  const onSetPreviewImage = useCallback((partToolId: string, junctionId: string, areaId: string) => {
    const store = useEditorStore.getState();
    // Clear old preview flags for this partTool
    const ptvfas = store.data?.partToolVideoFrameAreas ?? {};
    for (const j of Object.values(ptvfas)) {
      if (j.partToolId === partToolId && j.isPreviewImage) {
        store.updatePartToolVideoFrameArea(j.id, { isPreviewImage: false });
      }
    }
    // Set new preview
    store.updatePartToolVideoFrameArea(junctionId, { isPreviewImage: true });
    store.updatePartTool(partToolId, { previewImageId: areaId });
  }, []);

  // Image callbacks for PartToolTable (shared by PartToolListPanel + SubstepEditPopover)
  const imageCallbacks = useMemo(() => ({
    onUploadImage: onUploadPartToolImage,
    onDeleteImage: onDeletePartToolImage,
    onSetPreviewImage,
  }), [onUploadPartToolImage, onDeletePartToolImage, onSetPreviewImage]);

  const partToolListCallbacks = useMemo(() => ({
    onAddPartTool,
    onUpdatePartTool,
    onDeletePartTool: onDeletePartToolFromList,
    onUploadImage: onUploadPartToolImage,
    onDeleteImage: onDeletePartToolImage,
    onSetPreviewImage,
  }), [onAddPartTool, onUpdatePartTool, onDeletePartToolFromList, onUploadPartToolImage, onDeletePartToolImage, onSetPreviewImage]);

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
    onUpdatePartTool,
    onAddSubstepPartTool,
    onUpdateSubstepPartToolAmount,
    onDeleteSubstepPartTool,
    onReplaceSubstepPartTool,
    onCreateAndReplacePartTool,
    onAddAssembly,
    onDeleteAssembly,
    onRenameAssembly,
    onMoveStepToAssembly,
  }), [
    onSaveDescription, onDeleteDescription, onAddDescription,
    onSaveNote, onDeleteNote, onAddNote, onSaveRepeat, onDeleteRepeat,
    onDeleteSubstep, onDeleteImage, onDeleteTutorial,
    onUpdatePartTool,
    onAddSubstepPartTool, onUpdateSubstepPartToolAmount, onDeleteSubstepPartTool,
    onReplaceSubstepPartTool, onCreateAndReplacePartTool,
    onAddAssembly, onDeleteAssembly, onRenameAssembly, onMoveStepToAssembly,
  ]);

  // ── Edit popover render function (captures folderName + catalogs in closure) ──
  const renderEditPopover = useCallback(
    (props: Parameters<typeof SubstepEditPopover>[0]) => (
      <SubstepEditPopover
        {...props}
        allPartTools={Object.values(viewerData?.partTools ?? {})}
        folderName={decodedFolderName}
        catalogs={safetyIconCatalogs}
        getPreviewUrl={getPartToolPreviewUrl}
        getPartToolImages={getPartToolImages}
        imageCallbacks={imageCallbacks}
        onOpenPartToolList={onOpenPartToolList}
      />
    ),
    [decodedFolderName, safetyIconCatalogs, getPartToolPreviewUrl, getPartToolImages, imageCallbacks, viewerData?.partTools, onOpenPartToolList],
  );

  // ── Part/tool editor render function (render prop for PartsDrawer) ──
  const renderPartToolEditor = useCallback(
    ({ item, onClose }: { item: AggregatedPartTool; onClose: () => void }) => {
      const previewUrl = getPartToolPreviewUrl(item.partTool.id);
      return (
        <PartToolDetailEditor
          partToolId={item.partTool.id}
          item={item}
          onClose={onClose}
          imageCallbacks={imageCallbacks}
          getPartToolImages={getPartToolImages}
          allPartTools={Object.values(viewerData?.partTools ?? {})}
          onReplacePartTool={(oldId, newId) => {
            // Find substepPartTool rows for oldId and swap partToolId to newId
            const store = useEditorStore.getState();
            const sptRows = Object.values(store.data?.substepPartTools ?? {})
              .filter((spt) => spt.partToolId === oldId);
            for (const spt of sptRows) {
              store.updateSubstepPartTool(spt.id, { partToolId: newId });
            }
            onClose();
          }}
          onCreatePartTool={(oldId, newName) => {
            const store = useEditorStore.getState();
            store.updatePartTool(oldId, { name: newName });
          }}
          onEditPartToolAmount={(partToolId, newAmount) => {
            const store = useEditorStore.getState();
            const num = parseInt(newAmount, 10);
            if (!isNaN(num) && num > 0) {
              store.updatePartTool(partToolId, { amount: num });
            }
          }}
          onDeletePartTool={(partToolId) => {
            onDeletePartTool(partToolId);
            onClose();
          }}
          onUpdatePartTool={(partToolId, updates) => {
            onUpdatePartTool(partToolId, updates as Partial<PartToolRow>);
          }}
          previewImageUrl={previewUrl}
        />
      );
    },
    [imageCallbacks, getPartToolImages, getPartToolPreviewUrl, viewerData?.partTools, onDeletePartTool, onUpdatePartTool],
  );

  // Build noteIconLabels map: safetyIconId (entry UUID) → localized label
  const noteIconLabels = useMemo(() => {
    const lang = i18n.language;
    const map: Record<string, string> = {};
    for (const cat of safetyIconCatalogs) {
      for (const entry of cat.entries ?? []) {
        const label = entry.label[lang] ?? entry.label.de ?? entry.label.en ?? Object.values(entry.label)[0];
        if (label) map[entry.id] = label;
      }
    }
    return map;
  }, [safetyIconCatalogs, i18n.language]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-base)]">
        <LoadingCard
          title={decodedFolderName ?? ""}
          subtitle={t("common.loadingInstruction", "Loading instruction...")}
        />
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
          <InstructionViewProvider defaultTheme={resolvedTheme}>
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
                  renderPartToolEditor={editEnabled ? renderPartToolEditor : undefined}
                  web3FormsKey={import.meta.env.VITE_WEB3FORMS_KEY}
                  noteIconLabels={noteIconLabels}
                />
              </InstructionViewContainer>
              {editEnabled && editModeActive && (
                <PartToolListPanel
                  open={partToolListOpen}
                  onClose={() => setPartToolListOpen(false)}
                  partTools={viewerData?.partTools ?? {}}
                  substepPartTools={viewerData?.substepPartTools ?? {}}
                  callbacks={partToolListCallbacks}
                  getPreviewUrl={getPartToolPreviewUrl}
                  getPartToolImages={getPartToolImages}
                />
              )}
            </ViewerDataProvider>
          </InstructionViewProvider>
        </VideoProvider>
      </div>
    </div>
  );
}
