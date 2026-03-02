import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  Pencil, Trash2, Plus, Image, Video, Package,
  GraduationCap, Repeat, StickyNote, AlignLeft, X, Check,
  Undo2, Redo2,
} from 'lucide-react';
import type {
  SubstepEditCallbacks,
  SubstepDescriptionRow,
  EnrichedSubstepNote,
  EnrichedSubstepPartTool,
  PartToolRow,
} from '@monta-vis/viewer-core';
import {
  type SafetyIconCategory,
} from '@monta-vis/viewer-core';
import { useSessionHistory } from '../hooks/useSessionHistory';
import { ImageCropDialog } from './ImageCropDialog';
import type { NormalizedCrop } from '../persistence/types';
import { PartToolTable, type PartToolTableItem, type PartToolTableImageCallbacks } from './PartToolTable';
import type { PartToolImageItem } from './PartToolImagePicker';
import { SectionCard } from './SectionCard';
import { SafetyIconPicker } from './SafetyIconPicker';
import { EditInput, EditTextarea } from './EditInput';
import {
  ICON_BTN_CLASS,
  EDIT_BTN_CLASS,
  DELETE_BTN_CLASS,
  ADD_BTN_CLASS,
  CANCEL_BTN_CLASS,
  SAVE_BTN_CLASS,
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
  /** Pre-rendered media preview (image / video frame capture) from SubstepCard */
  mediaPreview?: ReactNode;
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

interface DescriptionEditState {
  kind: 'edit-desc';
  descId: string;
  text: string;
}

interface DescriptionAddState {
  kind: 'add-desc';
  text: string;
}

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

type InlineEditState = DescriptionEditState | DescriptionAddState | NoteEditState | NoteAddState | null;

/* ── Class constants ── */
const ROW_CLASS = 'flex items-center gap-2 px-2 py-1.5 text-sm text-[var(--color-text-base)] rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors';

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
  mediaPreview,
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

  // Inline edit state — only one row editable at a time
  const [editState, setEditState] = useState<InlineEditState>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ref to prevent blur-save when Cancel or Confirm is clicked
  const cancellingRef = useRef(false);

  const handleBlurSave = useCallback((saveFn: () => void) => {
    setTimeout(() => {
      if (!cancellingRef.current) saveFn();
      cancellingRef.current = false;
    }, 0);
  }, []);

  const handleCancel = useCallback(() => {
    cancellingRef.current = true;
    setEditState(null);
  }, []);


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

  // Focus textarea/input when entering edit mode
  useEffect(() => {
    if (!editState) return;
    const timer = setTimeout(() => {
      if (editState.kind === 'edit-desc' || editState.kind === 'add-desc') {
        textareaRef.current?.focus();
      } else if (editState.kind === 'add-note' || editState.kind === 'edit-note') {
        inputRef.current?.focus();
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [editState]);

  // Reset edit state when popover closes
  useEffect(() => {
    if (!open) {
      setEditState(null);
      reset();
    }
  }, [open, reset]);

  // Keep a ref to editState so the Escape listener doesn't re-register on every keystroke
  const editStateRef = useRef<InlineEditState>(null);
  useEffect(() => { editStateRef.current = editState; }, [editState]);

  // Escape handling: if editing, cancel edit; otherwise close popover
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
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
  }), [callbacks, captureSnapshot]);

  const handleAddPartTool = useCallback(() => {
    callbacks.onAddSubstepPartTool?.();
    captureSnapshot();
  }, [callbacks, captureSnapshot]);

  // ── Inline description editing ──

  const startEditDesc = useCallback((descId: string, currentText: string) => {
    setEditState({ kind: 'edit-desc', descId, text: currentText });
  }, []);

  const startAddDesc = useCallback(() => {
    setEditState({ kind: 'add-desc', text: '' });
  }, []);

  const saveDescEdit = useCallback(() => {
    if (!editState) return;
    if (editState.kind === 'edit-desc') {
      const trimmed = editState.text.trim();
      if (trimmed) {
        callbacks.onSaveDescription?.(editState.descId, trimmed);
        captureSnapshot();
      }
    } else if (editState.kind === 'add-desc') {
      const trimmed = editState.text.trim();
      if (trimmed) {
        callbacks.onAddDescription?.(trimmed);
        captureSnapshot();
      }
    }
    setEditState(null);
  }, [editState, callbacks, captureSnapshot]);

  // ── Inline note editing ──

  const startEditNote = useCallback((noteRowId: string, currentText: string, iconId: string | null, iconCategory: string | null) => {
    setEditState({ kind: 'edit-note', noteRowId, text: currentText, selectedIconId: iconId, selectedCategory: iconCategory, selectedCatalogDirName: null, selectedFilename: null });
  }, []);

  const startAddNote = useCallback(() => {
    setEditState({ kind: 'add-note', text: '', selectedIconId: null, selectedCategory: null, selectedCatalogDirName: null, selectedFilename: null });
  }, []);

  const saveNoteEdit = useCallback(() => {
    if (!editState) return;
    if (editState.kind === 'edit-note') {
      const trimmed = editState.text.trim();
      if (editState.selectedIconId && editState.selectedCategory) {
        // Build sourceIconId only when a new icon was picked from catalog
        const sourceIconId = editState.selectedCatalogDirName && editState.selectedFilename
          ? `${editState.selectedCatalogDirName}/${editState.selectedFilename}`
          : undefined;
        callbacks.onSaveNote?.(editState.noteRowId, trimmed, editState.selectedIconId, editState.selectedCategory as SafetyIconCategory, sourceIconId);
        captureSnapshot();
      }
      setEditState(null);
      return;
    }
    if (editState.kind === 'add-note') {
      if (!editState.selectedIconId || !editState.selectedCategory) {
        setEditState(null);
        return;
      }
      const trimmed = editState.text.trim();
      const sourceIconId = editState.selectedCatalogDirName && editState.selectedFilename
        ? `${editState.selectedCatalogDirName}/${editState.selectedFilename}`
        : undefined;
      callbacks.onAddNote?.(trimmed, editState.selectedIconId, editState.selectedCategory as SafetyIconCategory, sourceIconId);
      captureSnapshot();
      setEditState(null);
    }
  }, [editState, callbacks, captureSnapshot]);

  // ── Inline repeat editing ──

  /** Confirm save — suppress blur-save then call save directly */
  const handleConfirmDesc = useCallback(() => {
    cancellingRef.current = true;
    saveDescEdit();
  }, [saveDescEdit]);

  const handleConfirmNote = useCallback(() => {
    cancellingRef.current = true;
    saveNoteEdit();
  }, [saveNoteEdit]);

  // Keyboard handler for inline editors
  const handleInlineKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      setEditState(null);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (editState?.kind === 'edit-desc' || editState?.kind === 'add-desc') {
        saveDescEdit();
      } else if (editState?.kind === 'add-note' || editState?.kind === 'edit-note') {
        saveNoteEdit();
      }
    }
  }, [editState, saveDescEdit, saveNoteEdit]);

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
        className="relative w-[95vw] max-w-[72rem] h-[90vh] max-h-[56rem] flex flex-col rounded-2xl bg-[var(--color-bg-elevated)] shadow-xl"
      >
        {/* ── Header ── */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-[var(--color-border-base)]">
          <h2 className="text-base font-semibold text-[var(--color-text-base)]">
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
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 md:grid-cols-[15rem_1fr] gap-4">

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
                    {/* Media preview area */}
                    {mediaPreview && (
                      <div
                        data-testid="media-preview"
                        className="relative w-full aspect-square rounded-lg overflow-hidden bg-black"
                      >
                        {mediaPreview}
                      </div>
                    )}

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
                  <button type="button" data-testid="popover-add-description" aria-label={t('editorCore.addDescription', 'Add description')} className={ADD_BTN_CLASS} onClick={startAddDesc}>
                    <Plus className="h-4 w-4" />
                  </button>
                }
                emptyText={undefined}
              >
                {descriptions.length > 0 || editState?.kind === 'add-desc' ? (
                  <>
                    {descriptions.map((desc) => {
                      const isEditing = editState?.kind === 'edit-desc' && editState.descId === desc.id;

                      if (isEditing) {
                        return (
                          <div key={desc.id} className="flex flex-col gap-1 px-2 py-1.5" data-testid={`popover-desc-${desc.id}`}>
                            <EditTextarea
                              ref={textareaRef}
                              data-testid={`inline-edit-desc-${desc.id}`}
                              value={editState.text}
                              onChange={(e) => setEditState({ ...editState, text: e.target.value })}
                              onKeyDown={handleInlineKeyDown}
                              onBlur={() => handleBlurSave(saveDescEdit)}
                              className="resize-none"
                              rows={2}
                            />
                            <div className="flex justify-end gap-1">
                              <button type="button" aria-label={t('common.confirm', 'Confirm')} className={SAVE_BTN_CLASS} onClick={handleConfirmDesc}>
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button type="button" aria-label={t('common.cancel', 'Cancel')} className={CANCEL_BTN_CLASS} onClick={handleCancel}>
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={desc.id} className={ROW_CLASS} data-testid={`popover-desc-${desc.id}`}>
                          <AlignLeft className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                          <button type="button" className="flex-1 truncate cursor-pointer text-left" onClick={() => startEditDesc(desc.id, desc.text)}>{desc.text}</button>
                          <button type="button" aria-label={t('editorCore.deleteDescription', 'Delete description')} className={DELETE_BTN_CLASS} onClick={() => fireWithArg(callbacks.onDeleteDescription, desc.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}

                    {/* Inline add description */}
                    {editState?.kind === 'add-desc' && (
                      <div className="flex flex-col gap-1 px-2 py-1.5" data-testid="inline-add-desc">
                        <EditTextarea
                          ref={textareaRef}
                          data-testid="inline-add-desc-input"
                          value={editState.text}
                          onChange={(e) => setEditState({ ...editState, text: e.target.value })}
                          onKeyDown={handleInlineKeyDown}
                          onBlur={() => handleBlurSave(saveDescEdit)}
                          placeholder={t('editorCore.enterDescription', 'Enter description...')}
                          className="resize-none"
                          rows={2}
                        />
                        <div className="flex justify-end gap-1">
                          <button type="button" aria-label={t('common.confirm', 'Confirm')} className={SAVE_BTN_CLASS} onClick={handleConfirmDesc}>
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" aria-label={t('common.cancel', 'Cancel')} className={CANCEL_BTN_CLASS} onClick={handleCancel}>
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : undefined}
              </SectionCard>

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
                          <div key={noteRow.id} className="flex flex-col gap-2 px-2 py-1.5" data-testid={`popover-note-${noteRow.id}`}>
                            <div className="flex items-center gap-2">
                              {editIconUrl ? (
                                <img src={editIconUrl} alt="" className="h-5 w-5 shrink-0 object-contain" />
                              ) : (
                                <StickyNote className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                              )}
                              <EditInput
                                ref={inputRef}
                                type="text"
                                data-testid={`inline-edit-note-${noteRow.id}`}
                                value={editState.text}
                                onChange={(e) => setEditState({ ...editState, text: e.target.value })}
                                onKeyDown={handleInlineKeyDown}
                                onBlur={() => handleBlurSave(saveNoteEdit)}
                                className="flex-1"
                              />
                              <button type="button" aria-label={t('common.confirm', 'Confirm')} className={SAVE_BTN_CLASS} onClick={handleConfirmNote}>
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button type="button" aria-label={t('common.cancel', 'Cancel')} className={CANCEL_BTN_CLASS} onClick={handleCancel}>
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
                            <div data-testid="inline-icon-picker" onMouseDown={() => { cancellingRef.current = true; }}>
                              <SafetyIconPicker
                                icons={icons}
                                getIconUrl={getIconUrl}
                                selectedIconId={editState.selectedIconId}
                                onSelect={(icon) => setEditState({ ...editState, selectedIconId: icon.id, selectedCategory: icon.category, selectedCatalogDirName: icon.catalogDirName ?? null, selectedFilename: icon.filename })}
                              />
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={noteRow.id} className={ROW_CLASS} data-testid={`popover-note-${noteRow.id}`}>
                          <button
                            type="button"
                            className="flex flex-1 items-center gap-2 min-w-0 cursor-pointer text-left"
                            onClick={() => startEditNote(noteRow.id, noteRow.note.text, noteRow.note.safetyIconId, noteRow.note.safetyIconCategory)}
                          >
                            {noteIconUrl ? (
                              <img src={noteIconUrl} alt="" className="h-5 w-5 shrink-0 object-contain" />
                            ) : (
                              <StickyNote className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                            )}
                            <span className="flex-1 truncate">{noteRow.note.text}</span>
                          </button>
                          <span className="shrink-0 text-xs text-[var(--color-text-muted)]">{noteRow.note.safetyIconCategory}</span>
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
                        <div className="flex flex-col gap-2 px-2 py-1.5" data-testid="inline-add-note">
                          <div className="flex items-center gap-2">
                            {addIconUrl ? (
                              <img src={addIconUrl} alt="" className="h-5 w-5 shrink-0 object-contain" />
                            ) : (
                              <StickyNote className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                            )}
                            <EditInput
                              ref={inputRef}
                              type="text"
                              data-testid="inline-add-note-input"
                              value={editState.text}
                              onChange={(e) => setEditState({ ...editState, text: e.target.value })}
                              onKeyDown={handleInlineKeyDown}
                              onBlur={() => handleBlurSave(saveNoteEdit)}
                              placeholder={t('editorCore.enterNote', 'Enter note...')}
                              className="flex-1"
                            />
                            <button type="button" aria-label={t('common.confirm', 'Confirm')} className={SAVE_BTN_CLASS} onClick={handleConfirmNote}>
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" aria-label={t('common.cancel', 'Cancel')} className={CANCEL_BTN_CLASS} onClick={handleCancel}>
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
                          <div data-testid="inline-icon-picker-add" onMouseDown={() => { cancellingRef.current = true; }}>
                            <SafetyIconPicker
                              icons={icons}
                              getIconUrl={getIconUrl}
                              selectedIconId={editState.selectedIconId}
                              onSelect={(icon) => setEditState({ ...editState, selectedIconId: icon.id, selectedCategory: icon.category, selectedCatalogDirName: icon.catalogDirName ?? null, selectedFilename: icon.filename })}
                            />
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
                  <button type="button" data-testid="popover-add-repeat" aria-label={t('editorCore.addRepeat', 'Add repeat')} className={ADD_BTN_CLASS} onClick={() => { callbacks.onSaveRepeat?.(2, null); captureSnapshot(); }}>
                    <Plus className="h-4 w-4" />
                  </button>
                }
                emptyText={undefined}
              >
                {repeatCount > 1 ? (
                  <div
                    className="flex items-center gap-2 px-2 py-1.5"
                    data-testid="popover-repeat-row"
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        const count = Math.max(2, repeatCount);
                        const label = repeatLabel?.trim() || null;
                        callbacks.onSaveRepeat?.(count, label);
                        captureSnapshot();
                      }
                    }}
                  >
                    <Repeat className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                    <EditInput
                      type="number"
                      min={2}
                      max={99}
                      data-testid="inline-edit-repeat-count"
                      value={repeatCount}
                      onChange={(e) => callbacks.onSaveRepeat?.(Math.max(2, parseInt(e.target.value, 10) || 2), repeatLabel ?? null)}
                      className="!w-12 shrink-0"
                    />
                    <EditInput
                      type="text"
                      data-testid="inline-edit-repeat-label"
                      value={repeatLabel ?? ''}
                      onChange={(e) => callbacks.onSaveRepeat?.(repeatCount, e.target.value || null)}
                      placeholder={t('editorCore.repeatLabel', 'Label (optional)')}
                      className="!w-auto flex-1 min-w-0"
                    />
                    <button type="button" aria-label={t('editorCore.deleteRepeat', 'Delete repeat')} className={DELETE_BTN_CLASS} onClick={() => fire(callbacks.onDeleteRepeat)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : undefined}
              </SectionCard>

              {/* Tutorials */}
              <SectionCard
                data-testid="section-tutorials"
                icon={<GraduationCap className="h-4 w-4" />}
                title={t('editorCore.tutorials', 'Tutorials')}
                addButton={
                  <button type="button" data-testid="popover-add-tutorial" aria-label={t('editorCore.addTutorial', 'Add tutorial')} className={`${ADD_BTN_CLASS} opacity-50 cursor-not-allowed`} disabled>
                    <Plus className="h-4 w-4" />
                  </button>
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
