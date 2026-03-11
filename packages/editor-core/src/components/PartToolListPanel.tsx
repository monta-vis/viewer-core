import { useEffect, useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Plus, X, Download } from 'lucide-react';
import type { PartToolRow, SubstepPartToolRow } from '@monta-vis/viewer-core';
import { PartIcon } from '@monta-vis/viewer-core';
import { sortPartToolRows } from '../utils/partToolHelpers';
import { ICON_BTN_CLASS } from './editButtonStyles';
import { PartToolTable, type PartToolTableItem, type PartToolTableCallbacks, type PartToolTableImageCallbacks } from './PartToolTable';
import type { PartToolImageItem } from './PartToolImagePicker';
import type { NormalizedCrop } from '../persistence/types';
import { PartToolCatalogGrid, type PartToolIconItem } from './PartToolCatalogGrid';
import { PartToolAddForm, type PartToolAddFormValues } from './PartToolAddForm';

export interface PartToolListPanelCallbacks {
  onAddPartTool: (prefill?: Partial<PartToolRow>) => void;
  onUpdatePartTool: (id: string, updates: Partial<PartToolRow>) => void;
  onDeletePartTool: (id: string) => void;
  /** Optional platform feature: import part/tools (e.g. from AI or file). */
  onImportPartTools?: () => void;
  /** Optional platform feature: upload image for a part/tool. */
  onUploadImage?: (partToolId: string, image: File, crop: NormalizedCrop) => void;
  /** Optional platform feature: delete image from a part/tool. */
  onDeleteImage?: (partToolId: string, areaId: string) => void;
  /** Optional platform feature: set preview image for a part/tool. */
  onSetPreviewImage?: (partToolId: string, junctionId: string, areaId: string) => void;
}

export interface PartToolListPanelProps {
  open: boolean;
  onClose: () => void;
  partTools: Record<string, PartToolRow>;
  substepPartTools: Record<string, SubstepPartToolRow>;
  callbacks: PartToolListPanelCallbacks;
  /** Optional image data for thumbnails. */
  getPreviewUrl?: (partToolId: string) => string | null;
  /** Resolve all images for a partTool (for image picker gallery). */
  getPartToolImages?: (partToolId: string) => PartToolImageItem[];
  /** Whether an import is currently in progress. */
  isImporting?: boolean;
  /** Catalog items for the "Add" tab. When provided, tabs are shown. */
  catalogItems?: PartToolIconItem[];
  /** Resolve catalog icon URL for display. */
  getCatalogIconUrl?: (item: PartToolIconItem) => string;
}

const INITIAL_FORM: PartToolAddFormValues = {
  name: '',
  type: 'Part',
  amount: 1,
  partNumber: '',
};

/** Instruction-level part/tool management panel. */
export function PartToolListPanel({
  open,
  onClose,
  partTools,
  substepPartTools,
  callbacks,
  getPreviewUrl,
  getPartToolImages,
  isImporting,
  catalogItems,
  getCatalogIconUrl,
}: PartToolListPanelProps) {
  const { t } = useTranslation();
  const hasCatalog = !!catalogItems && catalogItems.length > 0 && !!getCatalogIconUrl;

  // Tab state
  const [activeTab, setActiveTab] = useState<'instruction' | 'add'>('instruction');

  // Add-form state
  const [formValues, setFormValues] = useState<PartToolAddFormValues>(INITIAL_FORM);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<PartToolIconItem | null>(null);

  // Reset form when switching tabs
  const resetForm = useCallback(() => {
    setFormValues(INITIAL_FORM);
    setSelectedCatalogItem(null);
  }, []);

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

  // All partTools as array for autocomplete suggestions
  const allPartToolsArray = useMemo(
    () => Object.values(partTools),
    [partTools],
  );

  // Adapt PartToolListPanelCallbacks → PartToolTableCallbacks
  const tableCallbacks: PartToolTableCallbacks = useMemo(() => ({
    onUpdatePartTool: callbacks.onUpdatePartTool,
    onUpdateAmount: (rowId: string, amount: number) => {
      callbacks.onUpdatePartTool(rowId, { amount });
    },
    onDelete: callbacks.onDeletePartTool,
    onSelectPartTool: (rowId: string, partToolId: string) => {
      const source = partTools[partToolId];
      if (!source) return;
      // Copy all fields except amount from the selected partTool
      callbacks.onUpdatePartTool(rowId, {
        name: source.name,
        label: source.label,
        type: source.type,
        partNumber: source.partNumber,
        unit: source.unit,
        material: source.material,
        dimension: source.dimension,
        description: source.description,
        previewImageId: source.previewImageId,
        iconId: source.iconId,
      });
    },
  }), [callbacks, partTools]);

  // Convert substepPartTools for "Used" column (narrow to the fields PartToolTable needs)
  const allSubstepPartTools = useMemo(
    () => Object.fromEntries(
      Object.entries(substepPartTools).map(([id, spt]) => [id, { partToolId: spt.partToolId, amount: spt.amount }]),
    ),
    [substepPartTools],
  );

  // Image callbacks (optional)
  const imageCallbacks: PartToolTableImageCallbacks | undefined = useMemo(() => {
    if (!callbacks.onUploadImage) return undefined;
    return {
      onUploadImage: callbacks.onUploadImage,
      onDeleteImage: callbacks.onDeleteImage,
      onSetPreviewImage: callbacks.onSetPreviewImage,
    };
  }, [callbacks.onUploadImage, callbacks.onDeleteImage, callbacks.onSetPreviewImage]);

  // Catalog selection handler
  const handleCatalogSelect = useCallback((item: PartToolIconItem) => {
    setSelectedCatalogItem(item);
    setFormValues({
      name: item.label,
      type: item.itemType,
      amount: 1,
      partNumber: item.matchTerms?.find(t => t.toUpperCase().startsWith('DIN')) ?? '',
      iconId: item.id,
    });
  }, []);

  // Add form submit
  const handleAddSubmit = useCallback(() => {
    const prefill: Partial<PartToolRow> = {
      name: formValues.name,
      type: formValues.type,
      amount: formValues.amount,
      partNumber: formValues.partNumber || null,
      iconId: formValues.iconId ?? null,
    };
    callbacks.onAddPartTool(prefill);
    resetForm();
  }, [formValues, callbacks, resetForm]);

  const canSubmit = formValues.name.trim().length > 0;

  // Catalog icon preview URL
  const previewUrl = selectedCatalogItem && getCatalogIconUrl
    ? getCatalogIconUrl(selectedCatalogItem)
    : null;

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
      <div className="relative w-[95vw] h-[90vh] flex flex-col rounded-2xl bg-[var(--color-bg-elevated)] shadow-xl">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-5 border-b border-[var(--color-border-base)]">
          <div className="flex items-center gap-2">
            <PartIcon className="h-4 w-4 text-[var(--color-element-muted)]" />
            <h2 className="text-xl font-semibold text-[var(--color-text-base)]">
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
              onClick={() => callbacks.onAddPartTool()}
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

        {/* Tab bar (only when catalog available) */}
        {hasCatalog && (
          <div className="shrink-0 flex gap-1 px-6 pt-3 pb-1">
            <button
              type="button"
              data-testid="parttool-list-tab-instruction"
              onClick={() => setActiveTab('instruction')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'instruction'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]'
              }`}
            >
              {t('editorCore.tabInstruction', 'Instruction')}
            </button>
            <button
              type="button"
              data-testid="parttool-list-tab-add"
              onClick={() => { setActiveTab('add'); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'add'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]'
              }`}
            >
              {t('editorCore.tabAdd', 'Add from Catalog')}
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'instruction' || !hasCatalog ? (
            /* Instruction tab — existing table */
            <PartToolTable
              rows={tableRows}
              callbacks={tableCallbacks}
              allSubstepPartTools={allSubstepPartTools}
              allPartTools={allPartToolsArray}
              getPreviewUrl={getPreviewUrl}
              imageCallbacks={imageCallbacks}
              getPartToolImages={getPartToolImages}
              testIdPrefix="parttool-list-row"
            />
          ) : (
            /* Add tab — form + catalog grid */
            <div className="flex flex-col gap-4">
              <PartToolAddForm
                values={formValues}
                onChange={setFormValues}
                onSubmit={handleAddSubmit}
                canSubmit={canSubmit}
                previewUrl={previewUrl}
              />
              <PartToolCatalogGrid
                items={catalogItems!}
                getIconUrl={getCatalogIconUrl!}
                selectedId={selectedCatalogItem?.id ?? null}
                onSelect={handleCatalogSelect}
              />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
