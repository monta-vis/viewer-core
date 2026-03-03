import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  Pencil, Trash2, Plus, Image, Video, Package,
  GraduationCap, Repeat, StickyNote, AlignLeft, X,
  Undo2, Redo2,
} from 'lucide-react';
import type {
  SubstepEditCallbacks,
  SubstepDescriptionRow,
  EnrichedSubstepNote,
  EnrichedSubstepPartTool,
  PartToolRow,
  SafetyIconCategory,
  FrameCaptureData,
  ViewportKeyframeRow,
} from '@monta-vis/viewer-core';
import { TextInputModal, Button, SubstepCard, Tooltip } from '@monta-vis/viewer-core';
import { useSessionHistory } from '../hooks/useSessionHistory';
import { ImageCropDialog } from './ImageCropDialog';
import type { NormalizedCrop } from '../persistence/types';
import { PartToolTable, type PartToolTableItem, type PartToolTableImageCallbacks } from './PartToolTable';
import type { PartToolImageItem } from './PartToolImagePicker';
import { SectionCard } from './SectionCard';
import { SafetyIconPicker } from './SafetyIconPicker';
import {
  ICON_BTN_CLASS,
  EDIT_BTN_CLASS,
  DELETE_BTN_CLASS,
  ADD_BTN_CLASS,
} from './editButtonStyles';
import type { SafetyIconCatalog } from '../types';
import { buildIconList, buildAssetsDirMap, getIconUrl as getIconUrlUtil, resolveNoteIconUrl } from '../utils/iconUtils';

export interface SubstepEditPopoverProps {
  open: boolean;
  onClose: () => void;
  callbacks: SubstepEditCallbacks;
  descriptions: SubstepDescriptionRow[];
  notes: EnrichedSubstepNote[];
  partTools: EnrichedSubstepPartTool[];
  repeatCount: number;
  repeatLabel?: string | null;
  tutorials: Array<{ kind: string; label: string }>;
  hasImage: boolean;
  hasVideo: boolean;
  /** Step order number for the SubstepCard preview */
  stepOrder?: number;
  /** Total substeps for the "N/M" badge */
  totalSubsteps?: number;
  /** Image URL for the SubstepCard preview */
  imageUrl?: string | null;
  /** Frame capture data for video thumbnail in the SubstepCard preview */
  frameCaptureData?: FrameCaptureData | null;
  /** Video data for inline playback in the SubstepCard preview */
  videoData?: { videoSrc: string; startFrame: number; endFrame: number; fps: number; viewportKeyframes: ViewportKeyframeRow[]; videoAspectRatio: number; contentAspectRatio?: number | null; sections?: { startFrame: number; endFrame: number }[] } | null;
  /** Title for the SubstepCard preview */
  title?: string | null;
  /** Map of safetyIconId → localized label for note icon tooltips */
  noteIconLabels?: Record<string, string>;
  /** Folder name for resolving safety icon URLs (mvis-media:// protocol). */
  folderName?: string;
  /** Safety icon catalogs loaded from disk. */
  catalogs?: SafetyIconCatalog[];
  /** All substepPartTools across the instruction (for computing "Used" amounts in the table). */
  allSubstepPartTools?: Record<string, { partToolId: string; amount: number }>;
  /** Resolve a partTool ID to a thumbnail URL (or null). */
  getPreviewUrl?: (partToolId: string) => string | null;
  /** Resolve all images for a partTool (for image picker gallery). */
  getPartToolImages?: (partToolId: string) => PartToolImageItem[];
  /** Image upload/delete/set-preview callbacks (enables thumbnail interaction). */
  imageCallbacks?: PartToolTableImageCallbacks;
  /** Called when the user picks + crops a new substep image via the edit-image pencil. */
  onUploadSubstepImage?: (file: File, crop: NormalizedCrop) => void;
  /** Instruction-level partTool catalog for autocomplete suggestions. */
  allPartTools?: PartToolRow[];
  /** Opens the instruction-wide PartTool list editor (PartToolListPanel). */
  onOpenPartToolList?: () => void;
}

/* ── Inline edit state types ── */

interface NoteEditState {
  kind: 'edit-note';
  noteRowId: string;
  text: string;
  selectedIconId: string | null;
  selectedCategory: string | null;
  /** Set when user picks a new icon from catalog; null when keeping existing VFA icon. */
  selectedCatalogDirName: string | null;
  /** Original filename of the selected catalog icon (for sourceIconId path resolution). */
  selectedFilename: string | null;
}

interface NoteAddState {
  kind: 'add-note';
  text: string;
  selectedIconId: string | null;
  selectedCategory: string | null;
  /** Set when user picks an icon from catalog. */
  selectedCatalogDirName: string | null;
  /** Original filename of the selected catalog icon (for sourceIconId path resolution). */
  selectedFilename: string | null;
}

type InlineEditState = NoteEditState | NoteAddState | null;

/* ── TextInputModal state for descriptions ── */
interface TextModalState {
  kind: 'edit-desc' | 'add-desc';
  descId?: string;
  label: string;
  value: string;
}

/* ── TextInputModal state for note text ── */
interface NoteTextModalState {
  label: string;
  value: string;
}

/* ── TextInputModal state for repeat fields ── */
interface RepeatModalState {
  field: 'count' | 'label';
  value: string;
}

/* ── Class constants ── */
const ROW_CLASS = 'flex items-center gap-3 px-3 py-2 text-lg text-[var(--color-text-base)] rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors';

export function SubstepEditPopover({
  open,
  onClose,
  callbacks,
  descriptions,
  notes,
  partTools,
  repeatCount,
  repeatLabel,
  tutorials,
  hasImage,
  hasVideo,
  stepOrder = 1,
  totalSubsteps,
  imageUrl,
  frameCaptureData,
  videoData,
  title,
  noteIconLabels,
  folderName,
  catalogs = [],
  allSubstepPartTools,
  getPreviewUrl,
  getPartToolImages,
  imageCallbacks,
  onUploadSubstepImage,
  allPartTools,
  onOpenPartToolList,
}: SubstepEditPopoverProps) {
  const { t, i18n } = useTranslation();
  const { canUndo, canRedo, captureSnapshot, undo, redo, reset } = useSessionHistory();

  // Inline edit state — only one row editable at a time (notes only)
  const [editState, setEditState] = useState<InlineEditState>(null);

  // ── TextInputModal state for note text ──
  const [noteTextModal, setNoteTextModal] = useState<NoteTextModalState | null>(null);

  // ── TextInputModal state for descriptions ──
  const [textModal, setTextModal] = useState<TextModalState | null>(null);

  // ── TextInputModal state for repeat fields ──
  const [repeatModal, setRepeatModal] = useState<RepeatModalState | null>(null);

  // ── File-upload + crop state for substep image replacement ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFileRef = useRef<File | null>(null);
  const [cropDialogSrc, setCropDialogSrc] = useState<string | null>(null);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    pendingFileRef.current = file;
    setCropDialogSrc(URL.createObjectURL(file));
    e.target.value = '';
  }, []);

  const handleCropConfirm = useCallback((crop: NormalizedCrop) => {
    const file = pendingFileRef.current;
    if (file && onUploadSubstepImage) {
      onUploadSubstepImage(file, crop);
      captureSnapshot();
    }
    if (cropDialogSrc) URL.revokeObjectURL(cropDialogSrc);
    setCropDialogSrc(null);
    pendingFileRef.current = null;
  }, [onUploadSubstepImage, captureSnapshot, cropDialogSrc]);

  const handleCropCancel = useCallback(() => {
    if (cropDialogSrc) URL.revokeObjectURL(cropDialogSrc);
    setCropDialogSrc(null);
    pendingFileRef.current = null;
  }, [cropDialogSrc]);

  // Build icon list and URL resolver for note editing
  const icons = useMemo(() => buildIconList(catalogs, i18n.language), [catalogs, i18n.language]);

  const assetsDirMap = useMemo(() => buildAssetsDirMap(catalogs), [catalogs]);

  const getIconUrl = useCallback(
    (icon: Parameters<typeof getIconUrlUtil>[0]) => getIconUrlUtil(icon, assetsDirMap, folderName),
    [assetsDirMap, folderName],
  );

  // Memoized icon lookup map for O(1) access per note row
  const iconLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const icon of icons) {
      if (icon.label) map.set(icon.id, icon.label);
    }
    return map;
  }, [icons]);

  // Reset edit state when popover closes
  useEffect(() => {
    if (!open) {
      setEditState(null);
      setNoteTextModal(null);
      setTextModal(null);
      setRepeatModal(null);
      reset();
    }
  }, [open, reset]);

  // Keep refs so the Escape listener doesn't re-register on every keystroke
  // (inline assignment — no useEffect needed)
  const editStateRef = useRef<InlineEditState>(null);
  editStateRef.current = editState;
  const noteTextModalRef = useRef<NoteTextModalState | null>(null);
  noteTextModalRef.current = noteTextModal;
  const textModalRef = useRef<TextModalState | null>(null);
  textModalRef.current = textModal;
  const repeatModalRef = useRef<RepeatModalState | null>(null);
  repeatModalRef.current = repeatModal;

  // Escape handling: if a TextInputModal is open, let it handle Escape;
  // if note editing, cancel edit; otherwise close popover
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Let TextInputModal handle its own Escape
        if (textModalRef.current || repeatModalRef.current || noteTextModalRef.current) return;
        if (editStateRef.current) {
          e.stopPropagation();
          setEditState(null);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  /** Fire a callback and capture a snapshot for undo (no auto-close) */
  const fire = useCallback(
    (fn: (() => void) | undefined) => {
      fn?.();
      captureSnapshot();
    },
    [captureSnapshot],
  );

  /** Fire a callback with an argument and capture a snapshot (no auto-close) */
  const fireWithArg = useCallback(
    <T,>(fn: ((arg: T) => void) | undefined, arg: T) => {
      fn?.(arg);
      captureSnapshot();
    },
    [captureSnapshot],
  );

  // ── PartToolTable rows + callbacks (memoized to avoid re-renders) ──
  const partToolTableRows: PartToolTableItem[] = useMemo(
    () => partTools.map((spt) => ({ rowId: spt.id, partTool: spt.partTool, amount: spt.amount })),
    [partTools],
  );

  const partToolCallbacks = useMemo(() => ({
    onUpdatePartTool: (ptId: string, updates: Partial<PartToolRow>) => {
      callbacks.onUpdatePartTool?.(ptId, updates);
      captureSnapshot();
    },
    onUpdateAmount: (sptId: string, amount: number) => {
      callbacks.onUpdateSubstepPartToolAmount?.(sptId, amount);
      captureSnapshot();
    },
    onDelete: (sptId: string) => {
      callbacks.onDeleteSubstepPartTool?.(sptId);
      captureSnapshot();
    },
    onSelectPartTool: (sptId: string, partToolId: string) => {
      callbacks.onReplaceSubstepPartTool?.(sptId, partToolId);
      captureSnapshot();
    },
    onCreateAndReplacePartTool: callbacks.onCreateAndReplacePartTool
      ? (sptId: string, field: 'name' | 'label' | 'partNumber', value: string) => {
          callbacks.onCreateAndReplacePartTool!(sptId, field, value);
          captureSnapshot();
        }
      : undefined,
  }), [callbacks, captureSnapshot]);

  const handleAddPartTool = useCallback(() => {
    callbacks.onAddSubstepPartTool?.();
    captureSnapshot();
  }, [callbacks, captureSnapshot]);

  // ── Description editing via TextInputModal ──

  const openEditDesc = useCallback((descId: string, currentText: string) => {
    setTextModal({ kind: 'edit-desc', descId, label: t('editorCore.editDescription', 'Edit description'), value: currentText });
  }, [t]);

  const openAddDesc = useCallback(() => {
    setTextModal({ kind: 'add-desc', label: t('editorCore.addDescription', 'Add description'), value: '' });
  }, [t]);

  const handleTextModalConfirm = useCallback((newValue: string) => {
    if (!textModal) return;
    const trimmed = newValue.trim();
    if (textModal.kind === 'edit-desc') {
      if (trimmed) {
        callbacks.onSaveDescription?.(textModal.descId!, trimmed);
        captureSnapshot();
      }
    } else if (textModal.kind === 'add-desc') {
      if (trimmed) {
        callbacks.onAddDescription?.(trimmed);
        captureSnapshot();
      }
    }
    setTextModal(null);
  }, [textModal, callbacks, captureSnapshot]);

  const handleTextModalCancel = useCallback(() => {
    setTextModal(null);
  }, []);

  // ── Inline note editing ──

  const startEditNote = useCallback((noteRowId: string, currentText: string, iconId: string | null, iconCategory: string | null) => {
    setEditState({ kind: 'edit-note', noteRowId, text: currentText, selectedIconId: iconId, selectedCategory: iconCategory, selectedCatalogDirName: null, selectedFilename: null });
  }, []);

  const startAddNote = useCallback(() => {
    setEditState({ kind: 'add-note', text: '', selectedIconId: null, selectedCategory: null, selectedCatalogDirName: null, selectedFilename: null });
  }, []);

  const saveNoteEdit = useCallback(() => {
    if (!editState) return;
    if (editState.kind !== 'edit-note' && editState.kind !== 'add-note') return;

    const { selectedIconId, selectedCategory } = editState;
    if (!selectedIconId || !selectedCategory) {
      setEditState(null);
      return;
    }

    const trimmed = editState.text.trim();
    const category = selectedCategory as SafetyIconCategory;
    // Build sourceIconId only when a new icon was picked from catalog
    const sourceIconId = editState.selectedCatalogDirName && editState.selectedFilename
      ? `${editState.selectedCatalogDirName}/${editState.selectedFilename}`
      : undefined;

    if (editState.kind === 'edit-note') {
      callbacks.onSaveNote?.(editState.noteRowId, trimmed, selectedIconId, category, sourceIconId);
    } else {
      callbacks.onAddNote?.(trimmed, selectedIconId, category, sourceIconId);
    }
    captureSnapshot();
    setEditState(null);
  }, [editState, callbacks, captureSnapshot]);

  // ── Repeat editing via TextInputModal ──

  const openRepeatCount = useCallback(() => {
    setRepeatModal({ field: 'count', value: String(repeatCount) });
  }, [repeatCount]);

  const openRepeatLabel = useCallback(() => {
    setRepeatModal({ field: 'label', value: repeatLabel ?? '' });
  }, [repeatLabel]);

  const handleRepeatModalConfirm = useCallback((newValue: string) => {
    if (!repeatModal) return;
    if (repeatModal.field === 'count') {
      const count = Math.max(2, parseInt(newValue, 10) || 2);
      callbacks.onSaveRepeat?.(count, repeatLabel?.trim() || null);
    } else {
      const label = newValue.trim() || null;
      callbacks.onSaveRepeat?.(repeatCount, label);
    }
    captureSnapshot();
    setRepeatModal(null);
  }, [repeatModal, callbacks, repeatCount, repeatLabel, captureSnapshot]);

  const handleRepeatModalCancel = useCallback(() => {
    setRepeatModal(null);
  }, []);

  // ── Note text editing via TextInputModal ──

  const openNoteTextModal = useCallback(() => {
    if (!editState) return;
    const label = editState.kind === 'edit-note'
      ? t('editorCore.editNote', 'Edit note')
      : t('editorCore.addNote', 'Add note');
    setNoteTextModal({ label, value: editState.text });
  }, [editState, t]);

  const handleNoteTextModalConfirm = useCallback((newValue: string) => {
    if (!editState) return;
    setEditState({ ...editState, text: newValue });
    setNoteTextModal(null);
  }, [editState]);

  const handleNoteTextModalCancel = useCallback(() => {
    setNoteTextModal(null);
  }, []);

  if (!open) return null;

  const hasMedia = hasImage || hasVideo;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div
        className="relative w-[95vw] h-[90vh] flex flex-col rounded-2xl bg-[var(--color-bg-elevated)] shadow-xl"
      >
        {/* ── Header ── */}
        <div className="shrink-0 flex items-center justify-between px-6 py-5 border-b border-[var(--color-border-base)]">
          <h2 className="text-xl font-semibold text-[var(--color-text-base)]">
            {t('editorCore.editSubstep', 'Edit substep')}
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={t('editorCore.undo', 'Undo')}
              disabled={!canUndo}
              className={`${ICON_BTN_CLASS} hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] disabled:opacity-30 disabled:cursor-default`}
              onClick={undo}
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={t('editorCore.redo', 'Redo')}
              disabled={!canRedo}
              className={`${ICON_BTN_CLASS} hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] disabled:opacity-30 disabled:cursor-default`}
              onClick={redo}
            >
              <Redo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={t('common.close', 'Close')}
              className={`${ICON_BTN_CLASS} hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)]`}
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Body — two-column layout ── */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-[20rem_1fr] gap-6">

            {/* ── Left column: Media preview ── */}
            <div className="flex flex-col gap-3 min-w-0" data-testid="popover-col-sidebar">
              <SectionCard
                data-testid="section-media"
                icon={<Image className="h-4 w-4" />}
                title={t('editorCore.media', 'Media')}
                emptyText={t('editorCore.noMedia', 'No media')}
              >
                {hasMedia ? (
                  <div className="flex flex-col gap-2">
                    {/* SubstepCard preview (read-only) */}
                    <div data-testid="media-preview">
                      <SubstepCard
                        stepOrder={stepOrder}
                        totalSubsteps={totalSubsteps}
                        imageUrl={imageUrl}
                        frameCaptureData={frameCaptureData}
                        videoData={videoData}
                        title={title ?? null}
                        descriptions={[]}
                        notes={notes}
                        partTools={partTools}
                        repeatCount={repeatCount}
                        repeatLabel={repeatLabel}
                        tutorials={tutorials.map((r) => ({ kind: r.kind as 'see' | 'tutorial', label: r.label }))}
                        noteIconLabels={noteIconLabels}
                        folderName={folderName}
                        hideFooter
                      />
                    </div>

                    {/* Image row */}
                    {hasImage && (
                      <div className={ROW_CLASS} data-testid="media-image-row">
                        <Image className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                        <span className="flex-1 truncate">{t('editorCore.image', 'Image')}</span>
                        <button type="button" aria-label={t('editorCore.editImage', 'Edit image')} className={EDIT_BTN_CLASS} onClick={handleUploadClick}>
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" aria-label={t('editorCore.deleteImage', 'Delete image')} className={DELETE_BTN_CLASS} onClick={() => fire(callbacks.onDeleteImage)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          data-testid="substep-image-file-input"
                          onChange={handleFileSelect}
                        />
                        {cropDialogSrc && (
                          <ImageCropDialog
                            open
                            imageSrc={cropDialogSrc}
                            onConfirm={handleCropConfirm}
                            onCancel={handleCropCancel}
                          />
                        )}
                      </div>
                    )}
                    {/* Video row */}
                    {hasVideo && (
                      <div className={ROW_CLASS} data-testid="media-video-row">
                        <Video className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                        <span className="flex-1 truncate">{t('editorCore.video', 'Video')}</span>
                        <button type="button" aria-label={t('editorCore.editVideo', 'Edit video')} className={EDIT_BTN_CLASS} onClick={() => fire(callbacks.onEditVideo)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" aria-label={t('editorCore.deleteVideo', 'Delete video')} className={DELETE_BTN_CLASS} onClick={() => fire(callbacks.onDeleteVideo)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : undefined}
              </SectionCard>
            </div>

            {/* ── Right column: Section cards ── */}
            <div className="flex-1 flex flex-col gap-4 min-w-0" data-testid="popover-col-content">

              {/* Descriptions */}
              <SectionCard
                data-testid="section-descriptions"
                icon={<AlignLeft className="h-4 w-4" />}
                title={t('editorCore.descriptions', 'Descriptions')}
                addButton={
                  <button type="button" data-testid="popover-add-description" aria-label={t('editorCore.addDescription', 'Add description')} className={ADD_BTN_CLASS} onClick={openAddDesc}>
                    <Plus className="h-4 w-4" />
                  </button>
                }
                emptyText={undefined}
              >
                {descriptions.length > 0 ? (
                  <>
                    {descriptions.map((desc) => (
                      <div key={desc.id} className={ROW_CLASS} data-testid={`popover-desc-${desc.id}`}>
                        <button type="button" className="flex-1 truncate cursor-pointer text-left" onClick={() => openEditDesc(desc.id, desc.text)}>
                          <span className="text-[var(--color-text-muted)] mr-1.5">•</span>{desc.text}
                        </button>
                        <button type="button" aria-label={t('editorCore.deleteDescription', 'Delete description')} className={DELETE_BTN_CLASS} onClick={() => fireWithArg(callbacks.onDeleteDescription, desc.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </>
                ) : undefined}
              </SectionCard>

              {/* TextInputModal for descriptions */}
              {textModal && (
                <TextInputModal
                  label={textModal.label}
                  value={textModal.value}
                  inputType="textarea"
                  onConfirm={handleTextModalConfirm}
                  onCancel={handleTextModalCancel}
                />
              )}

              {/* Notes — with level badges + inline editing */}
              <SectionCard
                data-testid="section-notes"
                icon={<StickyNote className="h-4 w-4" />}
                title={t('editorCore.notes', 'Notes')}
                addButton={
                  <button type="button" data-testid="popover-add-note" aria-label={t('editorCore.addNote', 'Add note')} className={ADD_BTN_CLASS} onClick={startAddNote}>
                    <Plus className="h-4 w-4" />
                  </button>
                }
                emptyText={undefined}
              >
                {notes.length > 0 || editState?.kind === 'add-note' || editState?.kind === 'edit-note' ? (
                  <>
                    {notes.map((noteRow) => {
                      const noteIconUrl = resolveNoteIconUrl(noteRow.note.safetyIconId, icons, getIconUrl, folderName);
                      const isEditing = editState?.kind === 'edit-note' && editState.noteRowId === noteRow.id;

                      if (isEditing) {
                        const editIconUrl = editState.selectedIconId
                          ? resolveNoteIconUrl(editState.selectedIconId, icons, getIconUrl, folderName)
                          : null;
                        return (
                          <div
                            key={noteRow.id}
                            className="flex flex-col gap-2 px-2 py-1.5"
                            data-testid={`popover-note-${noteRow.id}`}
                          >
                            <div className="flex items-center gap-2">
                              {editIconUrl ? (
                                <img src={editIconUrl} alt="" className="h-5 w-5 shrink-0 object-contain" />
                              ) : (
                                <StickyNote className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                              )}
                              <button
                                type="button"
                                data-testid={`note-text-btn-${noteRow.id}`}
                                className="flex-1 min-w-0 text-left text-lg truncate cursor-pointer hover:bg-[var(--color-bg-hover)] rounded px-1 transition-colors"
                                onClick={openNoteTextModal}
                              >
                                <span className={editState.text ? 'text-[var(--color-text-base)]' : 'text-[var(--color-text-muted)]'}>
                                  {editState.text || t('editorCore.enterNote', 'Enter note...')}
                                </span>
                              </button>
                            </div>
                            <div data-testid="inline-icon-picker">
                              <SafetyIconPicker
                                icons={icons}
                                getIconUrl={getIconUrl}
                                selectedIconId={editState.selectedIconId}
                                onSelect={(icon) => setEditState({ ...editState, selectedIconId: icon.id, selectedCategory: icon.category, selectedCatalogDirName: icon.catalogDirName ?? null, selectedFilename: icon.filename })}
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" data-testid="note-cancel-btn" onClick={() => setEditState(null)}>
                                {t('common.cancel', 'Cancel')}
                              </Button>
                              <Button variant="primary" size="sm" data-testid="note-save-btn" onClick={saveNoteEdit}>
                                {t('common.save', 'Save')}
                              </Button>
                            </div>
                          </div>
                        );
                      }

                      const iconTitle = iconLabelMap.get(noteRow.note.safetyIconId) ?? noteRow.note.safetyIconCategory;

                      return (
                        <div key={noteRow.id} className={ROW_CLASS} data-testid={`popover-note-${noteRow.id}`}>
                          <button
                            type="button"
                            className="flex flex-1 items-center gap-2 min-w-0 cursor-pointer text-left"
                            onClick={() => startEditNote(noteRow.id, noteRow.note.text, noteRow.note.safetyIconId, noteRow.note.safetyIconCategory)}
                          >
                            {noteIconUrl ? (
                              <img src={noteIconUrl} alt="" title={iconTitle} className="h-5 w-5 shrink-0 object-contain" />
                            ) : (
                              <StickyNote className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                            )}
                            <span className="flex-1 truncate">{noteRow.note.text}</span>
                          </button>
                          <button type="button" aria-label={t('editorCore.deleteNote', 'Delete note')} className={DELETE_BTN_CLASS} onClick={() => fireWithArg(callbacks.onDeleteNote, noteRow.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}

                    {/* Inline add note */}
                    {editState?.kind === 'add-note' && (() => {
                      const addIconUrl = editState.selectedIconId
                        ? resolveNoteIconUrl(editState.selectedIconId, icons, getIconUrl, folderName)
                        : null;
                      return (
                        <div
                          className="flex flex-col gap-2 px-2 py-1.5"
                          data-testid="inline-add-note"
                        >
                          <div className="flex items-center gap-2">
                            {addIconUrl ? (
                              <img src={addIconUrl} alt="" className="h-5 w-5 shrink-0 object-contain" />
                            ) : (
                              <StickyNote className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                            )}
                            <button
                              type="button"
                              data-testid="note-text-btn-add"
                              className="flex-1 min-w-0 text-left text-lg truncate cursor-pointer hover:bg-[var(--color-bg-hover)] rounded px-1 transition-colors"
                              onClick={openNoteTextModal}
                            >
                              <span className={editState.text ? 'text-[var(--color-text-base)]' : 'text-[var(--color-text-muted)]'}>
                                {editState.text || t('editorCore.enterNote', 'Enter note...')}
                              </span>
                            </button>
                          </div>
                          <div data-testid="inline-icon-picker-add">
                            <SafetyIconPicker
                              icons={icons}
                              getIconUrl={getIconUrl}
                              selectedIconId={editState.selectedIconId}
                              onSelect={(icon) => setEditState({ ...editState, selectedIconId: icon.id, selectedCategory: icon.category, selectedCatalogDirName: icon.catalogDirName ?? null, selectedFilename: icon.filename })}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" data-testid="note-cancel-btn" onClick={() => setEditState(null)}>
                              {t('common.cancel', 'Cancel')}
                            </Button>
                            <Button variant="primary" size="sm" data-testid="note-save-btn" onClick={saveNoteEdit}>
                              {t('common.save', 'Save')}
                            </Button>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                ) : undefined}
              </SectionCard>

              {/* Repeat */}
              <SectionCard
                data-testid="section-repeat"
                icon={<Repeat className="h-4 w-4" />}
                title={t('editorCore.repeat', 'Repeat')}
                addButton={
                  repeatCount > 1 ? (
                    <Tooltip content={t('editorCore.repeatAlreadyExists', 'Substep already has a repeat element')}>
                      <button type="button" data-testid="popover-add-repeat" aria-label={t('editorCore.addRepeat', 'Add repeat')} className={`${ADD_BTN_CLASS} disabled:opacity-40 disabled:cursor-not-allowed`} disabled>
                        <Plus className="h-4 w-4" />
                      </button>
                    </Tooltip>
                  ) : (
                    <button type="button" data-testid="popover-add-repeat" aria-label={t('editorCore.addRepeat', 'Add repeat')} className={ADD_BTN_CLASS} onClick={() => { callbacks.onSaveRepeat?.(2, null); captureSnapshot(); }}>
                      <Plus className="h-4 w-4" />
                    </button>
                  )
                }
                emptyText={undefined}
              >
                {repeatCount > 1 ? (
                  <div
                    className="flex items-center gap-3 px-3 py-2"
                    data-testid="popover-repeat-row"
                  >
                    <Repeat className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                    <button
                      type="button"
                      data-testid="repeat-count-btn"
                      className="text-lg font-semibold text-[var(--color-text-base)] cursor-pointer hover:bg-[var(--color-bg-hover)] rounded px-1 transition-colors"
                      onClick={openRepeatCount}
                    >
                      {repeatCount}×
                    </button>
                    <button
                      type="button"
                      data-testid="repeat-label-btn"
                      className="flex-1 min-w-0 text-left text-lg truncate cursor-pointer hover:bg-[var(--color-bg-hover)] rounded px-1 transition-colors"
                      onClick={openRepeatLabel}
                    >
                      <span className={repeatLabel ? 'text-[var(--color-text-base)]' : 'text-[var(--color-text-muted)]'}>
                        {repeatLabel || t('editorCore.repeatLabel', 'Label (optional)')}
                      </span>
                    </button>
                    <button type="button" aria-label={t('editorCore.deleteRepeat', 'Delete repeat')} className={DELETE_BTN_CLASS} onClick={() => fire(callbacks.onDeleteRepeat)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : undefined}
              </SectionCard>

              {/* TextInputModal for repeat fields */}
              {repeatModal && (
                <TextInputModal
                  label={repeatModal.field === 'count'
                    ? t('editorCore.repeatCount', 'Repeat count')
                    : t('editorCore.repeatLabel', 'Label (optional)')}
                  value={repeatModal.value}
                  inputType={repeatModal.field === 'count' ? 'number' : 'text'}
                  onConfirm={handleRepeatModalConfirm}
                  onCancel={handleRepeatModalCancel}
                />
              )}

              {/* TextInputModal for note text */}
              {noteTextModal && (
                <TextInputModal
                  label={noteTextModal.label}
                  value={noteTextModal.value}
                  inputType="text"
                  onConfirm={handleNoteTextModalConfirm}
                  onCancel={handleNoteTextModalCancel}
                />
              )}

              {/* Tutorials */}
              <SectionCard
                data-testid="section-tutorials"
                icon={<GraduationCap className="h-4 w-4" />}
                title={t('editorCore.tutorials', 'Tutorials')}
                addButton={
                  <Tooltip content={t('editorCore.comingSoon', 'Coming soon')}>
                    <button type="button" data-testid="popover-add-tutorial" aria-label={t('editorCore.addTutorial', 'Add tutorial')} className={`${ADD_BTN_CLASS} disabled:opacity-40 disabled:cursor-not-allowed`} disabled>
                      <Plus className="h-4 w-4" />
                    </button>
                  </Tooltip>
                }
                emptyText={undefined}
              >
                {tutorials.length > 0 ? tutorials.map((ref, idx) => (
                  <div key={`${ref.kind}-${idx}`} className={ROW_CLASS} data-testid={`popover-tutorial-${idx}`}>
                    <GraduationCap className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                    <button type="button" className="flex-1 truncate cursor-pointer text-left" onClick={() => fireWithArg(callbacks.onEditTutorial, idx)}>{ref.label}</button>
                    <button type="button" aria-label={t('editorCore.deleteTutorial', 'Delete tutorial')} className={DELETE_BTN_CLASS} onClick={() => fireWithArg(callbacks.onDeleteTutorial, idx)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )) : undefined}
              </SectionCard>

            </div>{/* end right column */}
          </div>{/* end two-column grid */}

          {/* Parts/Tools — full-width inline-editable table */}
          <div className="mt-4">
          <SectionCard
            data-testid="section-parts"
            icon={<Package className="h-4 w-4" />}
            title={t('editorCore.partsTools', 'Parts/Tools')}
            addButton={
              <>
                {onOpenPartToolList && (
                  <button type="button" data-testid="parttool-list-open" aria-label={t('editorCore.editPartToolList', 'Edit part/tool list')} className={EDIT_BTN_CLASS} onClick={onOpenPartToolList}>
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
                <button type="button" data-testid="parttool-add" aria-label={t('editorCore.addPartTool', 'Add part/tool')} className={ADD_BTN_CLASS} onClick={handleAddPartTool}>
                  <Plus className="h-4 w-4" />
                </button>
              </>
            }
            emptyText={t('editorCore.noPartsTools', 'No parts/tools')}
          >
            {partToolTableRows.length > 0 ? (
              <PartToolTable
                rows={partToolTableRows}
                callbacks={partToolCallbacks}
                allSubstepPartTools={allSubstepPartTools}
                allPartTools={allPartTools}
                getPreviewUrl={getPreviewUrl}
                getPartToolImages={getPartToolImages}
                imageCallbacks={imageCallbacks}
              />
            ) : undefined}
          </SectionCard>
          </div>{/* end mt-4 wrapper */}
        </div>{/* end body */}

      </div>{/* end panel */}
    </div>,
    document.body,
  );
}
