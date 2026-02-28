import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Package, Plus, X, Download } from 'lucide-react';
import type { PartToolRow, SubstepPartToolRow } from '@monta-vis/viewer-core';
import { sortPartToolRows } from '../utils/partToolHelpers';
import { ICON_BTN_CLASS } from './editButtonStyles';
import { PartToolTable, type PartToolTableItem, type PartToolTableCallbacks, type PartToolTableImageCallbacks } from './PartToolTable';
import type { NormalizedCrop } from '../persistence/types';

export interface PartToolListPanelCallbacks {
  onAddPartTool: () => void;
  onUpdatePartTool: (id: string, updates: Partial<PartToolRow>) => void;
  onDeletePartTool: (id: string) => void;
  /** Optional platform feature: import part/tools (e.g. from AI or file). */
  onImportPartTools?: () => void;
  /** Optional platform feature: upload image for a part/tool. */
  onUploadImage?: (partToolId: string, image: File, crop: NormalizedCrop) => void;
  /** Optional platform feature: delete image from a part/tool. */
  onDeleteImage?: (partToolId: string, areaId: string) => void;
  /** Optional platform feature: set preview image for a part/tool. */
  onSetPreviewImage?: (partToolId: string, junctionId: string) => void;
}

export interface PartToolListPanelProps {
  open: boolean;
  onClose: () => void;
  partTools: Record<string, PartToolRow>;
  substepPartTools: Record<string, SubstepPartToolRow>;
  callbacks: PartToolListPanelCallbacks;
  /** Optional image data for thumbnails. */
  getPreviewUrl?: (partToolId: string) => string | null;
  /** Whether an import is currently in progress. */
  isImporting?: boolean;
}


/** Instruction-level part/tool management panel. */
export function PartToolListPanel({
  open,
  onClose,
  partTools,
  substepPartTools,
  callbacks,
  getPreviewUrl,
  isImporting,
}: PartToolListPanelProps) {
  const { t } = useTranslation();

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  // Map Record<string, PartToolRow> → PartToolTableItem[]
  const tableRows: PartToolTableItem[] = useMemo(() => {
    const sorted = sortPartToolRows(partTools);
    return sorted.map((pt) => ({
      rowId: pt.id,
      partTool: pt,
      amount: pt.amount,
    }));
  }, [partTools]);

  // Adapt PartToolListPanelCallbacks → PartToolTableCallbacks
  const tableCallbacks: PartToolTableCallbacks = useMemo(() => ({
    onUpdatePartTool: callbacks.onUpdatePartTool,
    onUpdateAmount: (rowId: string, amount: number) => {
      callbacks.onUpdatePartTool(rowId, { amount });
    },
    onDelete: callbacks.onDeletePartTool,
  }), [callbacks]);

  // Convert substepPartTools for "Used" column
  const allSubstepPartTools = useMemo(() => {
    const result: Record<string, { partToolId: string; amount: number }> = {};
    for (const [id, spt] of Object.entries(substepPartTools)) {
      result[id] = { partToolId: spt.partToolId, amount: spt.amount };
    }
    return result;
  }, [substepPartTools]);

  // Image callbacks (optional)
  const imageCallbacks: PartToolTableImageCallbacks | undefined = useMemo(() => {
    if (!callbacks.onUploadImage) return undefined;
    return {
      onUploadImage: callbacks.onUploadImage,
      onDeleteImage: callbacks.onDeleteImage,
    };
  }, [callbacks.onUploadImage, callbacks.onDeleteImage]);

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      data-testid="parttool-list-panel"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Backdrop */}
      <div
        data-testid="parttool-list-backdrop"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-[95vw] max-w-[72rem] h-[90vh] max-h-[56rem] flex flex-col rounded-2xl bg-[var(--color-bg-elevated)] shadow-xl">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-[var(--color-border-base)]">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-[var(--color-element-muted)]" />
            <h2 className="text-base font-semibold text-[var(--color-text-base)]">
              {t('editorCore.partsToolsList', 'Parts / Tools')}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            {callbacks.onImportPartTools && (
              <button
                type="button"
                data-testid="parttool-list-import"
                aria-label={t('editorCore.importPartTools', 'Import part/tools')}
                disabled={isImporting}
                className={`${ICON_BTN_CLASS} hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] disabled:opacity-30 disabled:cursor-default`}
                onClick={callbacks.onImportPartTools}
              >
                <Download className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              data-testid="parttool-list-add"
              aria-label={t('editorCore.addPartTool', 'Add part/tool')}
              className={`${ICON_BTN_CLASS} hover:bg-[var(--color-bg-hover)] text-[var(--color-secondary)]`}
              onClick={callbacks.onAddPartTool}
            >
              <Plus className="h-4 w-4" />
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

        {/* Body — scrollable table */}
        <div className="flex-1 overflow-y-auto p-4">
          <PartToolTable
            rows={tableRows}
            callbacks={tableCallbacks}
            allSubstepPartTools={allSubstepPartTools}
            getPreviewUrl={getPreviewUrl}
            imageCallbacks={imageCallbacks}
            testIdPrefix="parttool-list-row"
          />
          {tableRows.length === 0 && (
            <div className="flex items-center justify-center text-sm italic text-[var(--color-text-muted)] py-8">
              {t('editorCore.noPartsTools', 'No parts/tools')}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
