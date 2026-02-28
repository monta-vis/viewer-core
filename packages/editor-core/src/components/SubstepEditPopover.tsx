import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  Pencil, Trash2, Plus, Image, Video, Package,
  GraduationCap, Repeat, StickyNote, AlignLeft, X, Check,
  AlertCircle, AlertTriangle, CheckCircle, Info,
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
  categoryToNoteLevel,
  type NoteLevel,
  type SafetyIconCategory,
} from '@monta-vis/viewer-core';
import { useSessionHistory } from '../hooks/useSessionHistory';
import { SafetyIconPicker } from './SafetyIconPicker';
import { PartToolTable } from './PartToolTable';
import type { SafetyIconCatalog } from '../types';
import { buildIconList, buildAssetsDirMap, getIconUrl as getIconUrlUtil } from '../utils/iconUtils';

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
}

/* ── Note level styling ── */
const NOTE_LEVEL_ICONS = {
  Critical: AlertCircle,
  Warning: AlertTriangle,
  Quality: CheckCircle,
  Info: Info,
} as const;

const NOTE_LEVEL_COLORS: Record<NoteLevel, string> = {
  Critical: 'bg-[var(--color-note-critical-bg)] text-[var(--color-note-critical-text)] border-[var(--color-note-critical-border)]',
  Warning: 'bg-[var(--color-note-warning-bg)] text-white border-[var(--color-note-warning-border)]',
  Quality: 'bg-[var(--color-note-quality-bg)] text-[var(--color-note-quality-text)] border-[var(--color-note-quality-border)]',
  Info: 'bg-[var(--color-note-info-bg)] text-[var(--color-note-info-text)] border-[var(--color-note-info-border)]',
};

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
}

interface NoteAddState {
  kind: 'add-note';
  text: string;
  selectedIconId: string | null;
  selectedCategory: string | null;
}

type InlineEditState = DescriptionEditState | DescriptionAddState | NoteEditState | NoteAddState | null;

/* ── Class constants ── */
const CARD_CLASS = 'rounded-xl border border-[var(--color-border-base)] bg-[var(--color-bg-surface)] flex flex-col';
const CARD_HEADER_CLASS = 'flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border-base)]';
const CARD_TITLE_CLASS = 'text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]';
const CARD_BODY_CLASS = 'flex-1 p-3 flex flex-col gap-1';
const ROW_CLASS = 'flex items-center gap-2 px-2 py-1.5 text-sm text-[var(--color-text-base)] rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors';
const ICON_BTN_CLASS = 'w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0';
const EDIT_BTN_CLASS = `${ICON_BTN_CLASS} hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)]`;
const DELETE_BTN_CLASS = `${ICON_BTN_CLASS} hover:bg-red-500/10 text-red-500`;
const ADD_BTN_HEADER_CLASS = `${ICON_BTN_CLASS} hover:bg-[var(--color-bg-hover)] text-[var(--color-secondary)]`;
const EMPTY_STATE_CLASS = 'flex-1 flex items-center justify-center text-sm italic text-[var(--color-text-muted)] py-4';
const SAVE_BTN_CLASS = `${ICON_BTN_CLASS} hover:bg-[var(--color-secondary)]/20 text-[var(--color-secondary)]`;
const CANCEL_BTN_CLASS = `${ICON_BTN_CLASS} hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)]`;

/* ── SectionCard helper (private) ── */
interface SectionCardProps {
  'data-testid': string;
  icon: ReactNode;
  title: string;
  addButton?: ReactNode;
  emptyText?: string;
  children?: ReactNode;
}

function SectionCard({ 'data-testid': testId, icon, title, addButton, emptyText, children }: SectionCardProps) {
  const hasChildren = children !== undefined && children !== null && children !== false;

  return (
    <div className={CARD_CLASS} data-testid={testId}>
      <div className={CARD_HEADER_CLASS}>
        <span className="text-[var(--color-element-muted)]">{icon}</span>
        <span className={`${CARD_TITLE_CLASS} flex-1`}>{title}</span>
        {addButton}
      </div>
      <div className={CARD_BODY_CLASS}>
        {hasChildren ? children : (
          <div className={EMPTY_STATE_CLASS}>{emptyText}</div>
        )}
      </div>
    </div>
  );
}

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
}: SubstepEditPopoverProps) {
  const { t, i18n } = useTranslation();
  const { canUndo, canRedo, captureSnapshot, undo, redo, reset } = useSessionHistory();

  // Inline edit state — only one row editable at a time
  const [editState, setEditState] = useState<InlineEditState>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      } else {
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

  // Escape handling: if editing, cancel edit; otherwise close popover
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editState) {
          e.stopPropagation();
          setEditState(null);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose, editState]);

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

  // ── PartToolTable callbacks (memoized to avoid re-renders) ──
  const partToolCallbacks = useMemo(() => ({
    onUpdatePartTool: (ptId: string, updates: Partial<PartToolRow>) => {
      callbacks.onUpdatePartTool?.(ptId, updates);
      captureSnapshot();
    },
    onUpdateAmount: (sptId: string, amount: number) => {
      callbacks.onUpdateSubstepPartToolAmount?.(sptId, amount);
      captureSnapshot();
    },
    onAdd: () => {
      callbacks.onAddSubstepPartTool?.();
      captureSnapshot();
    },
    onDelete: (sptId: string) => {
      callbacks.onDeleteSubstepPartTool?.(sptId);
      captureSnapshot();
    },
  }), [callbacks, captureSnapshot]);

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
    setEditState({ kind: 'edit-note', noteRowId, text: currentText, selectedIconId: iconId, selectedCategory: iconCategory });
  }, []);

  const startAddNote = useCallback(() => {
    setEditState({ kind: 'add-note', text: '', selectedIconId: null, selectedCategory: null });
  }, []);

  const saveNoteEdit = useCallback(() => {
    if (!editState) return;
    if (editState.kind === 'edit-note' || editState.kind === 'add-note') {
      const trimmed = editState.text.trim();
      if (!trimmed && !editState.selectedIconId) {
        setEditState(null);
        return;
      }
      const category = editState.selectedCategory ?? 'Sonstige';
      const level = categoryToNoteLevel(category as SafetyIconCategory);
      if (editState.kind === 'edit-note') {
        callbacks.onSaveNote?.(editState.noteRowId, trimmed, level, editState.selectedIconId, editState.selectedCategory);
      } else {
        callbacks.onAddNote?.(trimmed, level, editState.selectedIconId, editState.selectedCategory);
      }
      captureSnapshot();
    }
    setEditState(null);
  }, [editState, callbacks, captureSnapshot]);

  // Keyboard handler for inline editors
  const handleInlineKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      setEditState(null);
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (editState?.kind === 'edit-desc' || editState?.kind === 'add-desc') {
        saveDescEdit();
      } else {
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
        className="relative w-[95vw] sm:w-[90vw] max-w-[72rem] h-[90vh] max-h-[56rem] flex flex-col rounded-2xl bg-[var(--color-bg-elevated)] shadow-xl"
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
          <div className="flex flex-col sm:flex-row gap-5 h-full">

            {/* ── Left column: Media preview ── */}
            <div className="sm:w-[40%] shrink-0 flex flex-col gap-3" data-testid="popover-left-column">
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
                        <button type="button" aria-label={t('editorCore.editImage', 'Edit image')} className={EDIT_BTN_CLASS} onClick={() => fire(callbacks.onEditImage)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" aria-label={t('editorCore.deleteImage', 'Delete image')} className={DELETE_BTN_CLASS} onClick={() => fire(callbacks.onDeleteImage)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
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
            <div className="flex-1 flex flex-col gap-4 min-w-0" data-testid="popover-right-column">

              {/* Descriptions */}
              <SectionCard
                data-testid="section-descriptions"
                icon={<AlignLeft className="h-4 w-4" />}
                title={t('editorCore.descriptions', 'Descriptions')}
                addButton={
                  <button type="button" data-testid="popover-add-description" aria-label={t('editorCore.addDescription', 'Add description')} className={ADD_BTN_HEADER_CLASS} onClick={startAddDesc}>
                    <Plus className="h-4 w-4" />
                  </button>
                }
                emptyText={editState?.kind === 'add-desc' ? undefined : t('editorCore.noDescriptions', 'No descriptions')}
              >
                {descriptions.length > 0 || editState?.kind === 'add-desc' ? (
                  <>
                    {descriptions.map((desc) => {
                      const isEditing = editState?.kind === 'edit-desc' && editState.descId === desc.id;

                      if (isEditing) {
                        return (
                          <div key={desc.id} className="flex flex-col gap-1 px-2 py-1.5" data-testid={`popover-desc-${desc.id}`}>
                            <textarea
                              ref={textareaRef}
                              data-testid={`inline-edit-desc-${desc.id}`}
                              value={editState.text}
                              onChange={(e) => setEditState({ ...editState, text: e.target.value })}
                              onKeyDown={handleInlineKeyDown}
                              className="w-full px-2 py-1.5 rounded-lg text-sm border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-base)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
                              rows={2}
                            />
                            <div className="flex justify-end gap-1">
                              <button type="button" aria-label={t('common.cancel', 'Cancel')} className={CANCEL_BTN_CLASS} onClick={() => setEditState(null)}>
                                <X className="h-3.5 w-3.5" />
                              </button>
                              <button type="button" aria-label={t('common.save', 'Save')} data-testid={`save-desc-${desc.id}`} className={SAVE_BTN_CLASS} onClick={saveDescEdit}>
                                <Check className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={desc.id} className={ROW_CLASS} data-testid={`popover-desc-${desc.id}`}>
                          <AlignLeft className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                          <span className="flex-1 truncate">{desc.text}</span>
                          <button type="button" aria-label={t('editorCore.editDescription', 'Edit description')} className={EDIT_BTN_CLASS} onClick={() => startEditDesc(desc.id, desc.text)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" aria-label={t('editorCore.deleteDescription', 'Delete description')} className={DELETE_BTN_CLASS} onClick={() => fireWithArg(callbacks.onDeleteDescription, desc.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}

                    {/* Inline add description */}
                    {editState?.kind === 'add-desc' && (
                      <div className="flex flex-col gap-1 px-2 py-1.5" data-testid="inline-add-desc">
                        <textarea
                          ref={textareaRef}
                          data-testid="inline-add-desc-input"
                          value={editState.text}
                          onChange={(e) => setEditState({ ...editState, text: e.target.value })}
                          onKeyDown={handleInlineKeyDown}
                          placeholder={t('editorCore.enterDescription', 'Enter description...')}
                          className="w-full px-2 py-1.5 rounded-lg text-sm border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-base)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
                          rows={2}
                        />
                        <div className="flex justify-end gap-1">
                          <button type="button" aria-label={t('common.cancel', 'Cancel')} className={CANCEL_BTN_CLASS} onClick={() => setEditState(null)}>
                            <X className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" aria-label={t('common.save', 'Save')} data-testid="save-add-desc" className={SAVE_BTN_CLASS} onClick={saveDescEdit}>
                            <Check className="h-3.5 w-3.5" />
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
                  <button type="button" data-testid="popover-add-note" aria-label={t('editorCore.addNote', 'Add note')} className={ADD_BTN_HEADER_CLASS} onClick={startAddNote}>
                    <Plus className="h-4 w-4" />
                  </button>
                }
                emptyText={editState?.kind === 'add-note' ? undefined : t('editorCore.noNotes', 'No notes')}
              >
                {notes.length > 0 || editState?.kind === 'add-note' ? (
                  <>
                    {notes.map((noteRow) => {
                      const level = noteRow.note.level as NoteLevel;
                      const LevelIcon = NOTE_LEVEL_ICONS[level] ?? Info;
                      const badgeColors = NOTE_LEVEL_COLORS[level] ?? NOTE_LEVEL_COLORS.Info;
                      const isEditing = editState?.kind === 'edit-note' && editState.noteRowId === noteRow.id;

                      if (isEditing) {
                        return (
                          <div key={noteRow.id} className="flex flex-col gap-2 px-2 py-1.5 rounded-lg bg-[var(--color-bg-hover)]" data-testid={`popover-note-${noteRow.id}`}>
                            <input
                              ref={inputRef}
                              type="text"
                              data-testid={`inline-edit-note-${noteRow.id}`}
                              value={editState.text}
                              onChange={(e) => setEditState({ ...editState, text: e.target.value })}
                              onKeyDown={handleInlineKeyDown}
                              placeholder={t('editorCore.enterNote', 'Enter note...')}
                              className="w-full px-2 py-1.5 rounded-lg text-sm border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-base)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                            />
                            <div className="max-h-40 overflow-y-auto" data-testid="inline-icon-picker">
                              <SafetyIconPicker
                                icons={icons}
                                getIconUrl={getIconUrl}
                                selectedIconId={editState.selectedIconId}
                                onSelect={(icon) => setEditState({ ...editState, selectedIconId: icon.id, selectedCategory: icon.category })}
                              />
                            </div>
                            <div className="flex justify-end gap-1">
                              <button type="button" aria-label={t('common.cancel', 'Cancel')} className={CANCEL_BTN_CLASS} onClick={() => setEditState(null)}>
                                <X className="h-3.5 w-3.5" />
                              </button>
                              <button type="button" aria-label={t('common.save', 'Save')} data-testid={`save-note-${noteRow.id}`} className={SAVE_BTN_CLASS} onClick={saveNoteEdit}>
                                <Check className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={noteRow.id} className={ROW_CLASS} data-testid={`popover-note-${noteRow.id}`}>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${badgeColors}`}>
                            <LevelIcon className="h-3 w-3" />
                            {level}
                          </span>
                          <span className="flex-1 truncate">{noteRow.note.text}</span>
                          <button type="button" aria-label={t('editorCore.editNote', 'Edit note')} className={EDIT_BTN_CLASS} onClick={() => startEditNote(noteRow.id, noteRow.note.text, noteRow.note.safetyIconId, noteRow.note.safetyIconCategory ?? null)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" aria-label={t('editorCore.deleteNote', 'Delete note')} className={DELETE_BTN_CLASS} onClick={() => fireWithArg(callbacks.onDeleteNote, noteRow.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}

                    {/* Inline add note */}
                    {editState?.kind === 'add-note' && (
                      <div className="flex flex-col gap-2 px-2 py-1.5 rounded-lg bg-[var(--color-bg-hover)]" data-testid="inline-add-note">
                        <input
                          ref={inputRef}
                          type="text"
                          data-testid="inline-add-note-input"
                          value={editState.text}
                          onChange={(e) => setEditState({ ...editState, text: e.target.value })}
                          onKeyDown={handleInlineKeyDown}
                          placeholder={t('editorCore.enterNote', 'Enter note...')}
                          className="w-full px-2 py-1.5 rounded-lg text-sm border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-base)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                        />
                        <div className="max-h-40 overflow-y-auto" data-testid="inline-icon-picker-add">
                          <SafetyIconPicker
                            icons={icons}
                            getIconUrl={getIconUrl}
                            selectedIconId={editState.selectedIconId}
                            onSelect={(icon) => setEditState({ ...editState, selectedIconId: icon.id, selectedCategory: icon.category })}
                          />
                        </div>
                        <div className="flex justify-end gap-1">
                          <button type="button" aria-label={t('common.cancel', 'Cancel')} className={CANCEL_BTN_CLASS} onClick={() => setEditState(null)}>
                            <X className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" aria-label={t('common.save', 'Save')} data-testid="save-add-note" className={SAVE_BTN_CLASS} onClick={saveNoteEdit}>
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : undefined}
              </SectionCard>

              {/* Repeat */}
              <SectionCard
                data-testid="section-repeat"
                icon={<Repeat className="h-4 w-4" />}
                title={t('editorCore.repeat', 'Repeat')}
                emptyText={t('editorCore.noRepeat', 'No repeat')}
              >
                {repeatCount > 1 ? (
                  <div className={ROW_CLASS} data-testid="popover-repeat-row">
                    <Repeat className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                    <span className="flex-1 truncate">
                      ×{repeatCount}
                      {repeatLabel && <span className="ml-1 text-[var(--color-text-muted)]">({repeatLabel})</span>}
                    </span>
                    <button type="button" aria-label={t('editorCore.editRepeat', 'Edit repeat')} className={EDIT_BTN_CLASS} onClick={() => fire(callbacks.onEditRepeat)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" aria-label={t('editorCore.deleteRepeat', 'Delete repeat')} className={DELETE_BTN_CLASS} onClick={() => fire(callbacks.onDeleteRepeat)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button type="button" data-testid="popover-add-repeat" className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-[var(--color-secondary)] hover:text-[var(--color-secondary-hover)] transition-colors cursor-pointer" onClick={() => fire(callbacks.onEditRepeat)}>
                    <Plus className="h-3.5 w-3.5" />
                    <span>{t('editorCore.addRepeat', 'Add repeat')}</span>
                  </button>
                )}
              </SectionCard>

              {/* Tutorials */}
              <SectionCard
                data-testid="section-tutorials"
                icon={<GraduationCap className="h-4 w-4" />}
                title={t('editorCore.tutorials', 'Tutorials')}
                addButton={
                  <button type="button" data-testid="popover-add-tutorial" aria-label={t('editorCore.addTutorial', 'Add tutorial')} className={ADD_BTN_HEADER_CLASS} onClick={() => fire(callbacks.onAddTutorial)}>
                    <Plus className="h-4 w-4" />
                  </button>
                }
                emptyText={t('editorCore.noTutorials', 'No tutorials')}
              >
                {tutorials.length > 0 ? (
                  <>
                    {tutorials.map((ref, idx) => (
                      <div key={`${ref.kind}-${idx}`} className={ROW_CLASS} data-testid={`popover-tutorial-${idx}`}>
                        <GraduationCap className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                        <span className="flex-1 truncate">{ref.label}</span>
                        <button type="button" aria-label={t('editorCore.editTutorial', 'Edit tutorial')} className={EDIT_BTN_CLASS} onClick={() => fireWithArg(callbacks.onEditTutorial, idx)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" aria-label={t('editorCore.deleteTutorial', 'Delete tutorial')} className={DELETE_BTN_CLASS} onClick={() => fireWithArg(callbacks.onDeleteTutorial, idx)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </>
                ) : undefined}
              </SectionCard>


            </div>{/* end right column */}
          </div>{/* end two-column flex */}

          {/* Parts/Tools — full-width inline-editable table */}
          <SectionCard
            data-testid="section-parts"
            icon={<Package className="h-4 w-4" />}
            title={t('editorCore.partsTools', 'Parts/Tools')}
            emptyText={t('editorCore.noPartsTools', 'No parts/tools')}
          >
            <PartToolTable partTools={partTools} callbacks={partToolCallbacks} />
          </SectionCard>
        </div>{/* end body */}

        {/* ── Danger Zone Footer ── */}
        <div className="shrink-0 flex items-center justify-end px-5 py-3 border-t border-[var(--color-border-base)]" data-testid="danger-zone">
          <button
            type="button"
            data-testid="popover-delete-substep"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-[var(--color-text-danger)] hover:bg-red-500/10 transition-colors cursor-pointer"
            onClick={() => fire(callbacks.onDeleteSubstep)}
          >
            <Trash2 className="h-4 w-4" />
            <span>{t('editorCore.deleteSubstep', 'Delete substep')}</span>
          </button>
        </div>
      </div>{/* end panel */}
    </div>,
    document.body,
  );
}
