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
import type { InstructionData, InstructionSnapshot, SafetyIconCategory, PartToolRow, AggregatedPartTool, DrawingRow } from "@monta-vis/viewer-core";
import { buildMediaUrl } from "@monta-vis/viewer-core";
import {
  useEditorStore,
  useAutoSave,
  useEditCallbacks,
  SubstepEditPopover,
  PartToolListPanel,
  PartToolDetailEditor,
  VideoEditorDialog,
  createDefaultPartTool,
  type SafetyIconCatalog,
  type NormalizedCrop,
  type PartToolImageItem,
  type VideoEditorResult,
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

  // --- Assembly operations (from editor-core hook) ---
  const {
    onAddAssembly,
    onDeleteAssembly,
    onRenameAssembly,
    onMoveStepToAssembly,
    onReorderAssembly,
    renderAssemblyList,
  } = useEditCallbacks();

  // ── Video upload callback factory ──
  const createUploadSubstepVideo = useCallback((substepId: string) => {
    return async (file: File, sections: Array<{ startFrame: number; endFrame: number }> | null) => {
      if (!decodedFolderName || !adapter.uploadSubstepVideo) return;
      const filePath = window.electronAPI?.getFilePath(file);
      if (!filePath) return;

      try {
        await adapter.uploadSubstepVideo(decodedFolderName, substepId, { sourceVideoPath: filePath, sections });

        // Reload project data from SQLite
        if (window.electronAPI && folderName) {
          const projectData = await window.electronAPI.projects.getData(decodeURIComponent(folderName));
          if (projectData && typeof projectData === 'object') {
            const snap = sqliteToSnapshot(projectData as Parameters<typeof sqliteToSnapshot>[0]);
            const base = transformSnapshotToStore(snap);
            snapshotRef.current = snap;
            baseDataRef.current = base;
            const translated = translateData(snap, base, i18n.language);
            useEditorStore.getState().setData(translated);
            setData(translated);

            // Auto-open timeline editor for the newly uploaded video
            setEditingVideoSubstepId(substepId);
          }
        }
      } catch (err) {
        console.error('[ViewPage] Video upload failed:', err);
      }
    };
  }, [decodedFolderName, adapter, folderName, i18n.language]);

  // ── Video editor dialog state ──
  const [editingVideoSubstepId, setEditingVideoSubstepId] = useState<string | null>(null);

  const videoEditorData = useMemo(() => {
    if (!editingVideoSubstepId || !viewerData) return null;
    const substep = viewerData.substeps[editingVideoSubstepId];
    if (!substep) return null;
    const firstJunctionId = substep.videoSectionRowIds[0];
    if (!firstJunctionId) return null;
    const junction = viewerData.substepVideoSections[firstJunctionId];
    if (!junction?.videoSectionId) return null;
    const section = viewerData.videoSections[junction.videoSectionId];
    if (!section) return null;
    const video = section.videoId ? viewerData.videos[section.videoId] : undefined;
    if (!video) return null;

    const kfRows = section.viewportKeyframeIds
      .map((id) => viewerData.viewportKeyframes[id])
      .filter(Boolean);

    const sectionDuration = section.endFrame - section.startFrame;
    return {
      videoSrc: section.localPath ?? '',
      startFrame: 0,
      endFrame: sectionDuration,
      fps: video.fps,
      viewportKeyframes: kfRows,
      videoAspectRatio: (video.width ?? 16) / (video.height ?? 9),
      contentAspectRatio: section.contentAspectRatio,
      sections: [{ startFrame: 0, endFrame: sectionDuration }],
    };
  }, [editingVideoSubstepId, viewerData]);

  // ── Video annotations dialog state (mode='view') ──
  const [annotatingVideoSubstepId, setAnnotatingVideoSubstepId] = useState<string | null>(null);

  // Stable ref to avoid creating new videoAnnotationData objects when viewerData
  // changes due to drawing updates (which would reset the video element).
  const videoAnnotationDataRef = useRef<{ videoSrc: string; fps: number; durationSeconds: number; contentAspectRatio?: number | null } | null>(null);

  const videoAnnotationData = useMemo(() => {
    if (!annotatingVideoSubstepId || !viewerData) {
      videoAnnotationDataRef.current = null;
      return null;
    }
    const substep = viewerData.substeps[annotatingVideoSubstepId];
    if (!substep) return null;
    const firstJunctionId = substep.videoSectionRowIds[0];
    if (!firstJunctionId) return null;
    const junction = viewerData.substepVideoSections[firstJunctionId];
    if (!junction?.videoSectionId) return null;
    const section = viewerData.videoSections[junction.videoSectionId];
    if (!section) return null;
    const video = section.videoId ? viewerData.videos[section.videoId] : undefined;

    const fps = video?.fps ?? 30;
    const durationFrames = section.endFrame - section.startFrame;
    const videoSrc = section.localPath ?? '';
    const durationSeconds = durationFrames / fps;
    const contentAspectRatio = section.contentAspectRatio;

    // Return the cached object if values haven't changed
    const prev = videoAnnotationDataRef.current;
    if (prev && prev.videoSrc === videoSrc && prev.fps === fps && prev.durationSeconds === durationSeconds && prev.contentAspectRatio === contentAspectRatio) {
      return prev;
    }

    const next = { videoSrc, fps, durationSeconds, contentAspectRatio };
    videoAnnotationDataRef.current = next;
    return next;
  }, [annotatingVideoSubstepId, viewerData]);

  const onAnnotateVideo = useCallback((substepId: string) => {
    setAnnotatingVideoSubstepId(substepId);
  }, []);

  // ── Stable drawing callbacks for VideoEditorDialog (avoid inline arrows) ──
  const onAddVideoDrawing = useCallback((d: DrawingRow) => useEditorStore.getState().addDrawing(d), []);
  const onUpdateVideoDrawing = useCallback((id: string, u: Partial<DrawingRow>) => useEditorStore.getState().updateDrawing(id, u), []);
  const onDeleteVideoDrawing = useCallback((id: string) => useEditorStore.getState().deleteDrawing(id), []);

  // ── Stable close callbacks for dialogs ──
  const closeVideoEditor = useCallback(() => setEditingVideoSubstepId(null), []);
  const closeAnnotationEditor = useCallback(() => setAnnotatingVideoSubstepId(null), []);
  const closePartToolList = useCallback(() => setPartToolListOpen(false), []);

  const onSaveVideoEdits = useCallback((result: VideoEditorResult) => {
    const store = useEditorStore.getState();
    const data = store.data;
    if (!data || !editingVideoSubstepId) return;

    const substep = data.substeps[editingVideoSubstepId];
    if (!substep) return;
    const firstJunctionId = substep.videoSectionRowIds[0];
    if (!firstJunctionId) return;
    const junction = data.substepVideoSections[firstJunctionId];
    if (!junction?.videoSectionId) return;
    const section = data.videoSections[junction.videoSectionId];
    if (!section) return;

    // Update section boundaries
    const firstSection = result.sections[0];
    if (firstSection) {
      store.updateVideoSection(section.id, {
        startFrame: section.startFrame + firstSection.startFrame,
        endFrame: section.startFrame + firstSection.endFrame,
      });
    }

    // Update viewport keyframes
    for (const kfId of section.viewportKeyframeIds) {
      store.deleteViewportKeyframe(kfId);
    }
    for (const kf of result.viewportKeyframes) {
      store.addViewportKeyframe({
        ...kf,
        videoSectionId: section.id,
        versionId: getVersionId(),
      });
    }

    setEditingVideoSubstepId(null);
  }, [editingVideoSubstepId, getVersionId]);

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
    if (!decodedFolderName || !adapter.uploadPartToolImage) {
      console.warn('[ViewPage.onUploadPartToolImage] Guard failed: folder=%s, adapter=%s', decodedFolderName, !!adapter.uploadPartToolImage);
      return;
    }
    const filePath = window.electronAPI?.getFilePath(image);
    if (!filePath) {
      console.warn('[ViewPage.onUploadPartToolImage] Could not resolve file path for:', image.name);
      return;
    }

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

  const createUploadSubstepImage = useCallback((substepId: string) => {
    return async (file: File, crop: NormalizedCrop) => {
      if (!decodedFolderName || !adapter.uploadSubstepImage) {
        console.warn('[ViewPage.onUploadSubstepImage] Guard failed: folder=%s, adapter=%s', decodedFolderName, !!adapter.uploadSubstepImage);
        return;
      }
      const filePath = window.electronAPI?.getFilePath(file);
      if (!filePath) {
        console.warn('[ViewPage.onUploadSubstepImage] Could not resolve file path for:', file.name);
        return;
      }

      const result = await adapter.uploadSubstepImage(
        decodedFolderName,
        substepId,
        { type: 'path', path: filePath },
        crop,
      );

      if (result.success && result.vfaId) {
        const store = useEditorStore.getState();
        // Remove old substep image rows before adding new ones
        const substep = store.data?.substeps?.[substepId];
        if (substep) {
          for (const oldRowId of [...substep.imageRowIds]) {
            const oldRow = store.data?.substepImages?.[oldRowId];
            if (oldRow) {
              store.deleteSubstepImage(oldRowId);
              store.deleteVideoFrameArea(oldRow.videoFrameAreaId);
            }
          }
        }
        const newLocalPath = buildMediaUrl(decodedFolderName!, `media/frames/${result.vfaId}/image`);
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
          type: 'SubstepImage',
          localPath: newLocalPath,
        });
        // Add substep_images junction row to store
        if (result.substepImageId) {
          store.addSubstepImage({
            id: result.substepImageId,
            versionId: getVersionId(),
            substepId,
            videoFrameAreaId: result.vfaId,
            order: 0,
          });
        }
      } else if (!result.success) {
        console.error('[ViewPage.onUploadSubstepImage] Upload failed:', result.error);
      }
    };
  }, [decodedFolderName, adapter, getVersionId]);

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
    onAnnotateVideo,
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
    onReorderAssembly,
    renderAssemblyList,
  }), [
    onSaveDescription, onDeleteDescription, onAddDescription,
    onSaveNote, onDeleteNote, onAddNote, onSaveRepeat, onDeleteRepeat,
    onDeleteSubstep, onDeleteImage, onDeleteTutorial, onAnnotateVideo,
    onUpdatePartTool,
    onAddSubstepPartTool, onUpdateSubstepPartToolAmount, onDeleteSubstepPartTool,
    onReplaceSubstepPartTool, onCreateAndReplacePartTool,
    onAddAssembly, onDeleteAssembly, onRenameAssembly, onMoveStepToAssembly,
    onReorderAssembly, renderAssemblyList,
  ]);

  // Memoized partTools array (avoids new array on every render prop call)
  const allPartToolsList: PartToolRow[] = useMemo(
    () => Object.values(viewerData?.partTools ?? {}),
    [viewerData?.partTools],
  );

  // ── Edit popover render function (captures folderName + catalogs in closure) ──
  const renderEditPopover = useCallback(
    (props: Parameters<typeof SubstepEditPopover>[0] & { substepId?: string }) => {
      const state = useEditorStore.getState();
      const substepImageId = props.substepId
        ? state.data?.substeps?.[props.substepId]?.imageRowIds?.[0] ?? null
        : null;

      return (
        <SubstepEditPopover
          {...props}
          allPartTools={allPartToolsList}
          folderName={decodedFolderName}
          catalogs={safetyIconCatalogs}
          getPreviewUrl={getPartToolPreviewUrl}
          getPartToolImages={getPartToolImages}
          imageCallbacks={imageCallbacks}
          onOpenPartToolList={onOpenPartToolList}
          substepImageId={substepImageId}
          versionId={state.data?.currentVersionId ?? ''}
          drawings={state.data?.drawings ?? {}}
          onAddDrawing={state.addDrawing}
          onUpdateDrawing={state.updateDrawing}
          onDeleteDrawing={state.deleteDrawing}
          onUploadSubstepImage={props.substepId ? createUploadSubstepImage(props.substepId) : undefined}
          onUploadSubstepVideo={props.substepId ? createUploadSubstepVideo(props.substepId) : undefined}
          substepId={props.substepId}
        />
      );
    },
    [decodedFolderName, safetyIconCatalogs, getPartToolPreviewUrl, getPartToolImages, imageCallbacks, allPartToolsList, onOpenPartToolList, createUploadSubstepImage, createUploadSubstepVideo],
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
          allPartTools={allPartToolsList}
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
          onUpdatePartTool={onUpdatePartTool}
          previewImageUrl={previewUrl}
        />
      );
    },
    [imageCallbacks, getPartToolImages, getPartToolPreviewUrl, allPartToolsList, onDeletePartTool, onUpdatePartTool],
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
              {editEnabled && editModeActive && videoEditorData && (
                <VideoEditorDialog
                  open={!!editingVideoSubstepId}
                  onClose={closeVideoEditor}
                  onSave={onSaveVideoEdits}
                  videoData={videoEditorData}
                />
              )}
              {editEnabled && editModeActive && videoAnnotationData && annotatingVideoSubstepId && (
                <VideoEditorDialog
                  mode="view"
                  open={!!annotatingVideoSubstepId}
                  onClose={closeAnnotationEditor}
                  videoData={videoAnnotationData}
                  substepId={annotatingVideoSubstepId}
                  versionId={getVersionId()}
                  drawings={viewerData?.drawings ?? {}}
                  onAddDrawing={onAddVideoDrawing}
                  onUpdateDrawing={onUpdateVideoDrawing}
                  onDeleteDrawing={onDeleteVideoDrawing}
                />
              )}
              {editEnabled && editModeActive && (
                <PartToolListPanel
                  open={partToolListOpen}
                  onClose={closePartToolList}
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
