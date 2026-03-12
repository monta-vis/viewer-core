import { useEffect, useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Plus, X, Download, Pencil, Trash2 } from 'lucide-react';
import type { PartToolRow, SubstepPartToolRow, AggregatedPartTool } from '@monta-vis/viewer-core';
import { PartIcon, PartToolDetailContent } from '@monta-vis/viewer-core';
import { sortPartToolRows } from '../utils/partToolHelpers';
import { ICON_BTN_CLASS } from './editButtonStyles';
import { PartToolTable, type PartToolTableItem, type PartToolTableCallbacks, type PartToolTableImageCallbacks } from './PartToolTable';
import type { PartToolImageItem } from './PartToolImagePicker';
import type { NormalizedCrop } from '../persistence/types';
import { PartToolAddPopover } from './PartToolAddPopover';
import type { PartToolIconItem } from './PartToolCatalogGrid';
import { PartToolDetailEditor } from './PartToolDetailEditor';

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
  /** Project folder name for sidebar image resolution. */
  folderName?: string;
  /** PartTool-VideoFrameArea junction records for sidebar preview. */
  partToolVideoFrameAreas?: Record<string, { partToolId: string; videoFrameAreaId: string; isPreviewImage: boolean; order: number }>;
  /** Whether to use blurred media variants. */
  useBlurred?: boolean;
  /** VideoFrameArea records for localPath fallback. */
  videoFrameAreas?: Record<string, { localPath?: string | null }>;
}

/** Instruction-level part/tool management panel — Table + Preview Sidebar layout. */
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
  folderName,
  partToolVideoFrameAreas,
  useBlurred,
  videoFrameAreas,
}: PartToolListPanelProps) {
  const { t } = useTranslation();

  // ── State ──
  const [selectedPartToolId, setSelectedPartToolId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [addPopoverOpen, setAddPopoverOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Reset selection if item was deleted
  useEffect(() => {
    if (selectedPartToolId && !partTools[selectedPartToolId]) {
      setSelectedPartToolId(null);
    }
  }, [selectedPartToolId, partTools]);

  // Escape to close (only when add popover and edit dialog are closed)
  useEffect(() => {
    if (!open || addPopoverOpen || editDialogOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose, addPopoverOpen, editDialogOpen]);

  // ── Row click → select for sidebar ──
  const handleRowClick = useCallback((row: PartToolTableItem) => {
    setSelectedPartToolId(row.rowId);
  }, []);

  // ── Add popover handlers ──
  const handleAddClick = useCallback(() => {
    setAddPopoverOpen(true);
  }, []);

  const handleAddPopoverClose = useCallback(() => {
    setAddPopoverOpen(false);
  }, []);

  const handleAddConfirm = callbacks.onAddPartTool;

  // ── Edit dialog handlers ──
  const handleEditClick = useCallback(() => {
    setEditDialogOpen(true);
  }, []);

  const handleEditClose = useCallback(() => {
    setEditDialogOpen(false);
  }, []);

  // ── Delete handler ──
  const handleDelete = useCallback(() => {
    if (selectedPartToolId) {
      callbacks.onDeletePartTool(selectedPartToolId);
      setSelectedPartToolId(null);
    }
  }, [selectedPartToolId, callbacks]);

  // ── Editor dialog callbacks (stable refs) ──
  const handleEditorEditAmount = useCallback((partToolId: string, newAmount: string) => {
    const num = parseInt(newAmount, 10);
    if (!isNaN(num) && num > 0) {
      callbacks.onUpdatePartTool(partToolId, { amount: num });
    }
  }, [callbacks]);

  const handleEditorDelete = useCallback((partToolId: string) => {
    callbacks.onDeletePartTool(partToolId);
    setSelectedPartToolId(null);
    setEditDialogOpen(false);
  }, [callbacks]);

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

  // ── Build AggregatedPartTool for sidebar ──
  const selectedPt = selectedPartToolId ? partTools[selectedPartToolId] : null;

  const selectedAggregated: AggregatedPartTool | null = useMemo(() => {
    if (!selectedPt) return null;
    const amountsPerSubstep = new Map<string, number>();
    for (const spt of Object.values(substepPartTools)) {
      if (spt.partToolId === selectedPt.id) {
        amountsPerSubstep.set(spt.substepId, (amountsPerSubstep.get(spt.substepId) ?? 0) + spt.amount);
      }
    }
    return { partTool: selectedPt, totalAmount: selectedPt.amount, amountsPerSubstep };
  }, [selectedPt, substepPartTools]);

  // ── Preview URL for sidebar ──
  const sidebarPreviewUrl = useMemo(() => {
    if (!selectedPartToolId || !getPreviewUrl) return null;
    return getPreviewUrl(selectedPartToolId);
  }, [selectedPartToolId, getPreviewUrl]);

  // ── Memoized action slot for sidebar ──
  const sidebarActionSlot = useMemo(() => (
    <div className="flex items-center gap-2 pt-2">
      <button
        type="button"
        data-testid="parttool-list-edit-btn"
        aria-label={t('editorCore.editPartTool', 'Edit part/tool')}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--color-bg-hover)] text-[var(--color-text-base)] hover:bg-[var(--color-bg-active)] transition-colors cursor-pointer"
        onClick={handleEditClick}
      >
        <Pencil className="h-3.5 w-3.5" />
        {t('editorCore.edit', 'Edit')}
      </button>
      <button
        type="button"
        data-testid="parttool-list-delete-btn"
        aria-label={t('editorCore.deletePartTool', 'Delete part/tool')}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
        onClick={handleDelete}
      >
        <Trash2 className="h-3.5 w-3.5" />
        {t('editorCore.delete', 'Delete')}
      </button>
    </div>
  ), [t, handleEditClick, handleDelete]);

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

        {/* Body: Table (left) + Sidebar (right) */}
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

          {/* Right: Sidebar preview */}
          <div className="flex-[2] overflow-y-auto">
            {selectedAggregated ? (
              <PartToolDetailContent
                item={selectedAggregated}
                folderName={folderName}
                partToolVideoFrameAreas={partToolVideoFrameAreas}
                useBlurred={useBlurred}
                videoFrameAreas={videoFrameAreas}
                previewImageUrl={sidebarPreviewUrl}
                actionSlot={sidebarActionSlot}
              />
            ) : (
              <div
                data-testid="parttool-list-sidebar-empty"
                className="h-full flex items-center justify-center text-[var(--color-text-muted)] text-sm"
              >
                {t('editorCore.selectPartTool', 'Select a part or tool to view details')}
              </div>
            )}
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

      {/* Edit Dialog */}
      {editDialogOpen && selectedAggregated && selectedPartToolId && (
        <div data-testid="parttool-list-edit-dialog">
          <PartToolDetailEditor
            partToolId={selectedPartToolId}
            item={selectedAggregated}
            onClose={handleEditClose}
            imageCallbacks={imageCallbacks}
            getPartToolImages={getPartToolImages}
            onEditPartToolAmount={handleEditorEditAmount}
            onDeletePartTool={handleEditorDelete}
            onUpdatePartTool={callbacks.onUpdatePartTool}
            previewImageUrl={sidebarPreviewUrl}
          />
        </div>
      )}
    </div>,
    document.body,
  );
}
