import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Plus, X, Download } from 'lucide-react';
import type { PartToolRow, SubstepPartToolRow, AggregatedPartTool } from '@monta-vis/viewer-core';
import { PartIcon, PartToolDetailContent } from '@monta-vis/viewer-core';
import { sortPartToolRows } from '../utils/partToolHelpers';
import { ICON_BTN_CLASS } from './editButtonStyles';
import { PartToolTable, type PartToolTableItem, type PartToolTableCallbacks, type PartToolTableImageCallbacks } from './PartToolTable';
import type { PartToolImageItem } from './PartToolImagePicker';
import type { NormalizedCrop } from '../persistence/types';
import { PartToolAddPopover } from './PartToolAddPopover';
import type { PartToolIconItem } from './PartToolCatalogGrid';
import { PartToolSidebarForm, EMPTY_SIDEBAR_FORM, type SidebarFormState } from './PartToolSidebarForm';

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
  /** Catalog items for the "Add" popover. */
  catalogItems?: PartToolIconItem[];
  /** Resolve catalog icon URL for display. */
  getCatalogIconUrl?: (item: PartToolIconItem) => string;
}

/** Convert a PartToolRow to SidebarFormState */
function partToolToForm(pt: PartToolRow): SidebarFormState {
  return {
    type: pt.type,
    name: pt.name,
    label: pt.label ?? '',
    partNumber: pt.partNumber ?? '',
    amount: pt.amount,
    unit: pt.unit ?? '',
    material: pt.material ?? '',
    dimension: pt.dimension ?? '',
    description: pt.description ?? '',
  };
}

/** Convert SidebarFormState to Partial<PartToolRow> for add/update */
function formToPartToolPrefill(form: SidebarFormState): Partial<PartToolRow> {
  const prefill: Partial<PartToolRow> = {
    name: form.name.trim(),
    type: form.type,
    amount: form.amount,
  };
  const optionalFields = ['label', 'partNumber', 'unit', 'material', 'dimension', 'description'] as const;
  for (const field of optionalFields) {
    const trimmed = form[field].trim();
    if (trimmed) prefill[field] = trimmed;
    else prefill[field] = null;
  }
  return prefill;
}

/** Returns true if the required name field is non-empty */
function isFormFilled(form: SidebarFormState): boolean {
  return form.name.trim().length > 0;
}

/** Compare two form states for dirty-checking */
function isFormDirty(current: SidebarFormState, snapshot: SidebarFormState): boolean {
  return (
    current.type !== snapshot.type ||
    current.name !== snapshot.name ||
    current.label !== snapshot.label ||
    current.partNumber !== snapshot.partNumber ||
    current.amount !== snapshot.amount ||
    current.unit !== snapshot.unit ||
    current.material !== snapshot.material ||
    current.dimension !== snapshot.dimension ||
    current.description !== snapshot.description
  );
}

/** Instruction-level part/tool management panel — Table + Inline Sidebar Form layout. */
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

  // ── State ──
  const [selectedPartToolId, setSelectedPartToolId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [addPopoverOpen, setAddPopoverOpen] = useState(false);
  const [sidebarForm, setSidebarForm] = useState<SidebarFormState>(EMPTY_SIDEBAR_FORM);
  const snapshotRef = useRef<SidebarFormState>(EMPTY_SIDEBAR_FORM);

  // Reset selection if item was deleted
  useEffect(() => {
    if (selectedPartToolId && !partTools[selectedPartToolId]) {
      setSelectedPartToolId(null);
      setSidebarForm(EMPTY_SIDEBAR_FORM);
      snapshotRef.current = EMPTY_SIDEBAR_FORM;
    }
  }, [selectedPartToolId, partTools]);

  // Escape to close (only when add popover is closed)
  useEffect(() => {
    if (!open || addPopoverOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose, addPopoverOpen]);

  // ── Row click → select for sidebar ──
  const handleRowClick = useCallback((row: PartToolTableItem) => {
    setSelectedPartToolId(row.rowId);
    const pt = row.partTool;
    const form = partToolToForm(pt);
    setSidebarForm(form);
    snapshotRef.current = form;
  }, []);

  // ── Deselect → switch to add mode ──
  const handleDeselect = useCallback(() => {
    setSelectedPartToolId(null);
    setSidebarForm(EMPTY_SIDEBAR_FORM);
    snapshotRef.current = EMPTY_SIDEBAR_FORM;
  }, []);

  // ── Add popover handlers ──
  const handleAddClick = useCallback(() => {
    setAddPopoverOpen(true);
  }, []);

  const handleAddPopoverClose = useCallback(() => {
    setAddPopoverOpen(false);
  }, []);

  const handleAddConfirm = useCallback(
    (prefill?: Partial<PartToolRow>) => callbacks.onAddPartTool(prefill),
    [callbacks.onAddPartTool],
  );

  // ── Dirty / enable logic ──
  const hasSelection = selectedPartToolId !== null;
  const dirty = isFormDirty(sidebarForm, snapshotRef.current);
  const filled = isFormFilled(sidebarForm);

  // Add: enabled when form has content AND (no selection, or selection + dirty)
  const canAdd = filled && (!hasSelection || dirty);
  // Update: enabled when item selected AND form is dirty AND name is non-empty
  const canUpdate = hasSelection && dirty && filled;

  // ── Add from sidebar form ──
  const handleSidebarAdd = useCallback(() => {
    if (!filled) return;
    callbacks.onAddPartTool(formToPartToolPrefill(sidebarForm));
    // Reset form after add
    setSidebarForm(EMPTY_SIDEBAR_FORM);
    snapshotRef.current = EMPTY_SIDEBAR_FORM;
    setSelectedPartToolId(null);
  }, [sidebarForm, filled, callbacks]);

  // ── Update existing item ──
  const handleSidebarUpdate = useCallback(() => {
    if (!selectedPartToolId || !dirty) return;
    callbacks.onUpdatePartTool(selectedPartToolId, formToPartToolPrefill(sidebarForm));
    // Update snapshot to reflect saved state
    snapshotRef.current = sidebarForm;
  }, [selectedPartToolId, sidebarForm, dirty, callbacks]);

  // ── Delete handler ──
  const handleDelete = useCallback(() => {
    if (selectedPartToolId) {
      callbacks.onDeletePartTool(selectedPartToolId);
      setSelectedPartToolId(null);
      setSidebarForm(EMPTY_SIDEBAR_FORM);
      snapshotRef.current = EMPTY_SIDEBAR_FORM;
    }
  }, [selectedPartToolId, callbacks]);

  // ── Sorted + filtered table rows ──
  const allTableRows: PartToolTableItem[] = useMemo(() => {
    const sorted = sortPartToolRows(partTools);
    return sorted.map((pt) => ({
      rowId: pt.id,
      partTool: pt,
      amount: pt.amount,
    }));
  }, [partTools]);

  const filteredTableRows = useMemo(() => {
    if (!searchQuery.trim()) return allTableRows;
    const q = searchQuery.toLowerCase();
    return allTableRows.filter((row) => {
      const pt = row.partTool;
      return (
        pt.name.toLowerCase().includes(q) ||
        (pt.label?.toLowerCase().includes(q) ?? false) ||
        (pt.partNumber?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [allTableRows, searchQuery]);

  // ── Table callbacks adapter ──
  const tableCallbacks: PartToolTableCallbacks = useMemo(() => ({
    onUpdatePartTool: callbacks.onUpdatePartTool,
    onUpdateAmount: (rowId: string, amount: number) => {
      callbacks.onUpdatePartTool(rowId, { amount });
    },
    onDelete: callbacks.onDeletePartTool,
  }), [callbacks.onUpdatePartTool, callbacks.onDeletePartTool]);

  // ── Image callbacks (optional) ──
  const imageCallbacks: PartToolTableImageCallbacks | undefined = useMemo(() => {
    if (!callbacks.onUploadImage) return undefined;
    return {
      onUploadImage: callbacks.onUploadImage,
      onDeleteImage: callbacks.onDeleteImage,
      onSetPreviewImage: callbacks.onSetPreviewImage,
    };
  }, [callbacks.onUploadImage, callbacks.onDeleteImage, callbacks.onSetPreviewImage]);

  // ── Preview URL for sidebar ──
  const sidebarPreviewUrl = useMemo(() => {
    if (!selectedPartToolId || !getPreviewUrl) return null;
    return getPreviewUrl(selectedPartToolId);
  }, [selectedPartToolId, getPreviewUrl]);

  // ── Aggregated item for PartToolDetailContent ──
  const selectedAggregated: AggregatedPartTool | null = useMemo(() => {
    if (!selectedPartToolId) return null;
    const pt = partTools[selectedPartToolId];
    if (!pt) return null;
    const amountsPerSubstep = new Map<string, number>();
    let totalAmount = 0;
    for (const spt of Object.values(substepPartTools)) {
      if (spt.partToolId === selectedPartToolId) {
        amountsPerSubstep.set(spt.substepId, spt.amount);
        totalAmount += spt.amount;
      }
    }
    // Fallback: if no substep entries, use the partTool's own amount
    if (totalAmount === 0) totalAmount = pt.amount;
    return { partTool: pt, totalAmount, amountsPerSubstep };
  }, [selectedPartToolId, partTools, substepPartTools]);

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
              onClick={handleAddClick}
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

        {/* Body: Table (left) + Sidebar Form (right) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Search + Table */}
          <div className="flex-[3] flex flex-col overflow-hidden border-r border-[var(--color-border-base)]">
            {/* Search */}
            <div className="shrink-0 px-4 py-3">
              <input
                data-testid="parttool-list-search"
                type="text"
                aria-label={t('editorCore.searchPartTools', 'Search parts and tools')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('editorCore.searchPartTools', 'Search...')}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border-base)] bg-[var(--color-bg-base)] text-[var(--color-text-base)] text-sm placeholder:text-[var(--color-text-subtle)] outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <PartToolTable
                rows={filteredTableRows}
                callbacks={tableCallbacks}
                getPreviewUrl={getPreviewUrl}
                imageCallbacks={imageCallbacks}
                getPartToolImages={getPartToolImages}
                testIdPrefix="parttool-list-row"
                compact
                selectedRowId={selectedPartToolId}
                onRowClick={handleRowClick}
              />
            </div>
          </div>

          {/* Right: Detail Card + Inline Sidebar Form */}
          <div className="flex-[2] overflow-y-auto flex flex-col">
            {selectedAggregated ? (
              <div className="shrink-0">
                <PartToolDetailContent
                  item={selectedAggregated}
                  previewImageUrl={sidebarPreviewUrl}
                  compact
                />
              </div>
            ) : (
              <div className="shrink-0" data-testid="sidebar-hero-placeholder">
                <div className="relative bg-[var(--color-bg-base)] aspect-square sm:aspect-[4/3]">
                  <div className="w-full h-full flex items-center justify-center">
                    <PartIcon className="w-24 h-24 opacity-20" style={{ color: 'var(--color-element-part)' }} />
                  </div>
                </div>
              </div>
            )}
            <PartToolSidebarForm
              values={sidebarForm}
              onChange={setSidebarForm}
              canAdd={canAdd}
              canUpdate={canUpdate}
              onAdd={handleSidebarAdd}
              onUpdate={handleSidebarUpdate}
              onDelete={hasSelection ? handleDelete : undefined}
              onDeselect={hasSelection ? handleDeselect : undefined}
            />
          </div>
        </div>
      </div>

      {/* Add Popover */}
      <PartToolAddPopover
        open={addPopoverOpen}
        onClose={handleAddPopoverClose}
        onAdd={handleAddConfirm}
        catalogItems={catalogItems}
        getCatalogIconUrl={getCatalogIconUrl}
      />
    </div>,
    document.body,
  );
}
