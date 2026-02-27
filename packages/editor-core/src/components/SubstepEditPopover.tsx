import { useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2, Plus, Image, Video, Package, GraduationCap, Repeat, StickyNote, AlignLeft } from 'lucide-react';
import type {
  SubstepEditCallbacks,
  SubstepDescriptionRow,
  EnrichedSubstepNote,
  EnrichedSubstepPartTool,
} from '@monta-vis/viewer-core';
import { useMenuClose } from '../hooks/useMenuClose';

export interface SubstepEditPopoverProps {
  open: boolean;
  onClose: () => void;
  callbacks: SubstepEditCallbacks;
  descriptions: SubstepDescriptionRow[];
  notes: EnrichedSubstepNote[];
  partTools: EnrichedSubstepPartTool[];
  repeatCount: number;
  repeatLabel?: string | null;
  references: Array<{ kind: string; label: string }>;
  hasImage: boolean;
  hasVideo: boolean;
}

const SECTION_TITLE_CLASS = 'text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] px-3 pt-3 pb-1';
const ROW_CLASS = 'flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--color-text-base)]';
const ICON_BTN_CLASS = 'w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0';
const EDIT_BTN_CLASS = `${ICON_BTN_CLASS} hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)]`;
const DELETE_BTN_CLASS = `${ICON_BTN_CLASS} hover:bg-red-500/10 text-red-500`;
const ADD_BTN_CLASS = 'flex items-center gap-1.5 px-3 py-1.5 text-sm text-[var(--color-secondary)] hover:text-[var(--color-secondary-hover)] transition-colors cursor-pointer';

export function SubstepEditPopover({
  open,
  onClose,
  callbacks,
  descriptions,
  notes,
  partTools,
  repeatCount,
  repeatLabel,
  references,
  hasImage,
  hasVideo,
}: SubstepEditPopoverProps) {
  const { t } = useTranslation();
  const popoverRef = useRef<HTMLDivElement>(null);
  useMenuClose(popoverRef, onClose, open);

  const fireAndClose = useCallback(
    (fn: (() => void) | undefined) => {
      fn?.();
      onClose();
    },
    [onClose],
  );

  const fireWithArgAndClose = useCallback(
    <T,>(fn: ((arg: T) => void) | undefined, arg: T) => {
      fn?.(arg);
      onClose();
    },
    [onClose],
  );

  if (!open) return null;

  return (
    <div
      ref={popoverRef}
      role="menu"
      className="absolute right-0 top-full mt-1 z-50 w-72 max-h-[25rem] overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-xl"
    >
      {/* ── Media ── */}
      <div className={SECTION_TITLE_CLASS}>{t('editorCore.media', 'Media')}</div>
      {hasImage && (
        <div className={ROW_CLASS} data-testid="media-image-row">
          <Image className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
          <span className="flex-1 truncate">{t('editorCore.image', 'Image')}</span>
          <button type="button" aria-label={t('editorCore.editImage', 'Edit image')} className={EDIT_BTN_CLASS} onClick={() => fireAndClose(callbacks.onEditImage)}>
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button type="button" aria-label={t('editorCore.deleteImage', 'Delete image')} className={DELETE_BTN_CLASS} onClick={() => fireAndClose(callbacks.onDeleteImage)}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {hasVideo && (
        <div className={ROW_CLASS} data-testid="media-video-row">
          <Video className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
          <span className="flex-1 truncate">{t('editorCore.video', 'Video')}</span>
          <button type="button" aria-label={t('editorCore.editVideo', 'Edit video')} className={EDIT_BTN_CLASS} onClick={() => fireAndClose(callbacks.onEditVideo)}>
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button type="button" aria-label={t('editorCore.deleteVideo', 'Delete video')} className={DELETE_BTN_CLASS} onClick={() => fireAndClose(callbacks.onDeleteVideo)}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Descriptions ── */}
      <div className={SECTION_TITLE_CLASS}>{t('editorCore.descriptions', 'Descriptions')}</div>
      {descriptions.map((desc) => (
        <div key={desc.id} className={ROW_CLASS} data-testid={`popover-desc-${desc.id}`}>
          <AlignLeft className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
          <span className="flex-1 truncate">{desc.text}</span>
          <button type="button" aria-label={t('editorCore.editDescription', 'Edit description')} className={EDIT_BTN_CLASS} onClick={() => fireWithArgAndClose(callbacks.onEditDescription, desc.id)}>
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button type="button" aria-label={t('editorCore.deleteDescription', 'Delete description')} className={DELETE_BTN_CLASS} onClick={() => fireWithArgAndClose(callbacks.onDeleteDescription, desc.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button type="button" data-testid="popover-add-description" className={ADD_BTN_CLASS} onClick={() => fireAndClose(callbacks.onAddDescription)}>
        <Plus className="h-3.5 w-3.5" />
        <span>{t('editorCore.addDescription', 'Add description')}</span>
      </button>

      {/* ── Notes ── */}
      <div className={SECTION_TITLE_CLASS}>{t('editorCore.notes', 'Notes')}</div>
      {notes.map((noteRow) => (
        <div key={noteRow.id} className={ROW_CLASS} data-testid={`popover-note-${noteRow.id}`}>
          <StickyNote className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
          <span className="flex-1 truncate">{noteRow.note.text}</span>
          <button type="button" aria-label={t('editorCore.editNote', 'Edit note')} className={EDIT_BTN_CLASS} onClick={() => fireWithArgAndClose(callbacks.onEditNote, noteRow.id)}>
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button type="button" aria-label={t('editorCore.deleteNote', 'Delete note')} className={DELETE_BTN_CLASS} onClick={() => fireWithArgAndClose(callbacks.onDeleteNote, noteRow.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button type="button" data-testid="popover-add-note" className={ADD_BTN_CLASS} onClick={() => fireAndClose(callbacks.onAddNote)}>
        <Plus className="h-3.5 w-3.5" />
        <span>{t('editorCore.addNote', 'Add note')}</span>
      </button>

      {/* ── Repeat ── */}
      <div className={SECTION_TITLE_CLASS}>{t('editorCore.repeat', 'Repeat')}</div>
      {repeatCount > 1 ? (
        <div className={ROW_CLASS} data-testid="popover-repeat-row">
          <Repeat className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
          <span className="flex-1 truncate">
            ×{repeatCount}
            {repeatLabel && <span className="ml-1 text-[var(--color-text-muted)]">({repeatLabel})</span>}
          </span>
          <button type="button" aria-label={t('editorCore.editRepeat', 'Edit repeat')} className={EDIT_BTN_CLASS} onClick={() => fireAndClose(callbacks.onEditRepeat)}>
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button type="button" aria-label={t('editorCore.deleteRepeat', 'Delete repeat')} className={DELETE_BTN_CLASS} onClick={() => fireAndClose(callbacks.onDeleteRepeat)}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button type="button" data-testid="popover-add-repeat" className={ADD_BTN_CLASS} onClick={() => fireAndClose(callbacks.onEditRepeat)}>
          <Plus className="h-3.5 w-3.5" />
          <span>{t('editorCore.addRepeat', 'Add repeat')}</span>
        </button>
      )}

      {/* ── References ── */}
      <div className={SECTION_TITLE_CLASS}>{t('editorCore.references', 'References')}</div>
      {references.map((ref, idx) => (
        <div key={idx} className={ROW_CLASS} data-testid={`popover-ref-${idx}`}>
          <GraduationCap className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
          <span className="flex-1 truncate">{ref.label}</span>
          <button type="button" aria-label={t('editorCore.editReference', 'Edit reference')} className={EDIT_BTN_CLASS} onClick={() => fireWithArgAndClose(callbacks.onEditReference, idx)}>
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button type="button" aria-label={t('editorCore.deleteReference', 'Delete reference')} className={DELETE_BTN_CLASS} onClick={() => fireWithArgAndClose(callbacks.onDeleteReference, idx)}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button type="button" data-testid="popover-add-reference" className={ADD_BTN_CLASS} onClick={() => fireAndClose(callbacks.onAddReference)}>
        <Plus className="h-3.5 w-3.5" />
        <span>{t('editorCore.addReference', 'Add reference')}</span>
      </button>

      {/* ── Parts/Tools ── */}
      <div className={SECTION_TITLE_CLASS}>{t('editorCore.partsTools', 'Parts/Tools')}</div>
      {partTools.length > 0 ? (
        <div className={ROW_CLASS} data-testid="popover-parts-row">
          <Package className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
          <span className="flex-1 truncate">
            {partTools.length} {t('editorCore.partsTools', 'Parts/Tools')}
          </span>
          <button type="button" aria-label={t('editorCore.editPartsTools', 'Edit parts/tools')} className={EDIT_BTN_CLASS} onClick={() => fireAndClose(callbacks.onEditPartTools)}>
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button type="button" data-testid="popover-add-parts" className={ADD_BTN_CLASS} onClick={() => fireAndClose(callbacks.onEditPartTools)}>
          <Plus className="h-3.5 w-3.5" />
          <span>{t('editorCore.addPartsTools', 'Add parts/tools')}</span>
        </button>
      )}

      {/* ── Danger zone ── */}
      <div className="border-t border-[var(--color-border)] mt-2 pt-2 pb-2 px-3">
        <button
          type="button"
          data-testid="popover-delete-substep"
          className="flex items-center gap-1.5 w-full px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
          onClick={() => fireAndClose(callbacks.onDeleteSubstep)}
        >
          <Trash2 className="h-4 w-4" />
          <span>{t('editorCore.deleteSubstep', 'Delete substep')}</span>
        </button>
      </div>
    </div>
  );
}
