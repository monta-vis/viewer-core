import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Plus, X, Download, Replace } from 'lucide-react';
import type { PartToolRow, SubstepPartToolRow, AggregatedPartTool } from '@monta-vis/viewer-core';
import { PartIcon, PartToolDetailContent } from '@monta-vis/viewer-core';
import { sortPartToolRows, isUnknownPartTool } from '../utils/partToolHelpers';
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
  /** Optional: global merge — reassign ALL substep junctions from source → target, delete source. */
  onGlobalReplace?: (sourcePartToolId: string, targetPartToolId: string) => void;
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
  /** Pre-highlight this partTool in the table (current substep's assignment). */
  highlightPartToolId?: string | null;
  /** Called when user confirms replacing the substep's partTool with a different one. */
  onSubstepReplace?: (newPartToolId: string) => void;
  /** Pre-select this partTool for editing when the panel opens. */
  initialEditPartToolId?: string | null;
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

/** Aggregate a partTool's amounts from substep assignments. */
function aggregatePartTool(
  pt: PartToolRow,
  substepPartTools: Record<string, SubstepPartToolRow>,
): AggregatedPartTool {
  const amountsPerSubstep = new Map<string, number>();
  let totalAmount = 0;
  for (const spt of Object.values(substepPartTools)) {
    if (spt.partToolId === pt.id) {
      amountsPerSubstep.set(spt.substepId, spt.amount);
      totalAmount += spt.amount;
    }
  }
  if (totalAmount === 0) totalAmount = pt.amount;
  return { partTool: pt, totalAmount, amountsPerSubstep };
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
  highlightPartToolId,
  onSubstepReplace,
  initialEditPartToolId,
}: PartToolListPanelProps) {
  const { t } = useTranslation();

  // ── State ──
  const [selectedPartToolId, setSelectedPartToolId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [addPopoverOpen, setAddPopoverOpen] = useState(false);
  const [sidebarForm, setSidebarForm] = useState<SidebarFormState>(EMPTY_SIDEBAR_FORM);
  const snapshotRef = useRef<SidebarFormState>(EMPTY_SIDEBAR_FORM);

  // Detail dialog state (row click opens detail; optionally shows Replace button)
  const [detailTarget, setDetailTarget] = useState<PartToolTableItem | null>(null);
  // Discard unsaved changes dialog state
  const [discardTarget, setDiscardTarget] = useState<{ row: PartToolTableItem } | null>(null);

  // Reset selection if item was deleted
  useEffect(() => {
    if (selectedPartToolId && !partTools[selectedPartToolId]) {
      setSelectedPartToolId(null);
      setSidebarForm(EMPTY_SIDEBAR_FORM);
      snapshotRef.current = EMPTY_SIDEBAR_FORM;
    }
  }, [selectedPartToolId, partTools]);

  // Pre-select a partTool when panel opens with initialEditPartToolId
  const prevOpenRef = useRef(false);
  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;
    if (!justOpened || !initialEditPartToolId) return;
    const pt = partTools[initialEditPartToolId];
    if (!pt) return;
    setSelectedPartToolId(initialEditPartToolId);
    const form = partToolToForm(pt);
    setSidebarForm(form);
    snapshotRef.current = form;
  }, [open, initialEditPartToolId, partTools]);

  // Escape to close (only when add popover is closed and no dialog is open)
  useEffect(() => {
    if (!open || addPopoverOpen || detailTarget || discardTarget) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose, addPopoverOpen, detailTarget, discardTarget]);

  // ── Row click → show detail dialog (optionally with Replace button) ──
  const handleRowClick = useCallback((row: PartToolTableItem) => {
    setDetailTarget(row);
  }, []);

  const handleDetailClose = useCallback(() => {
    setDetailTarget(null);
  }, []);

  const handleDetailReplace = useCallback(() => {
    if (!detailTarget) return;
    if (highlightPartToolId && onSubstepReplace) {
      // Substep-scoped: replace only the current substep junction
      onSubstepReplace(detailTarget.rowId);
    } else if (selectedPartToolId && callbacks.onGlobalReplace) {
      // Global merge: reassign all junctions from selected → clicked row
      callbacks.onGlobalReplace(selectedPartToolId, detailTarget.rowId);
      setSelectedPartToolId(null);
      setSidebarForm(EMPTY_SIDEBAR_FORM);
      snapshotRef.current = EMPTY_SIDEBAR_FORM;
    }
    setDetailTarget(null);
  }, [detailTarget, highlightPartToolId, onSubstepReplace, selectedPartToolId, callbacks]);

  // ── Edit icon click (switch sidebar to that partTool) ──
  const handleEditClick = useCallback((row: PartToolTableItem) => {
    // If already editing this partTool, do nothing
    if (selectedPartToolId === row.rowId) return;

    // Check for unsaved changes
    const dirty = isFormDirty(sidebarForm, snapshotRef.current);
    if (dirty && selectedPartToolId) {
      setDiscardTarget({ row });
      return;
    }

    // Load new partTool into sidebar
    setSelectedPartToolId(row.rowId);
    const form = partToolToForm(row.partTool);
    setSidebarForm(form);
    snapshotRef.current = form;
  }, [selectedPartToolId, sidebarForm]);

  // ── Discard dialog handlers ──
  const handleDiscardConfirm = useCallback(() => {
    if (discardTarget) {
      setSelectedPartToolId(discardTarget.row.rowId);
      const form = partToolToForm(discardTarget.row.partTool);
      setSidebarForm(form);
      snapshotRef.current = form;
    }
    setDiscardTarget(null);
  }, [discardTarget]);

  const handleDiscardCancel = useCallback(() => {
    setDiscardTarget(null);
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
  // PartToolSidebarForm handles its own confirmation dialog,
  // so this handler fires the actual delete directly.
  const handleDelete = useCallback(() => {
    if (selectedPartToolId) {
      callbacks.onDeletePartTool(selectedPartToolId);
      setSelectedPartToolId(null);
      setSidebarForm(EMPTY_SIDEBAR_FORM);
      snapshotRef.current = EMPTY_SIDEBAR_FORM;
    }
  }, [selectedPartToolId, callbacks]);

  // ── Sorted + filtered table rows (split into named / unknown) ──
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

  const namedRows = useMemo(
    () => filteredTableRows.filter((r) => !isUnknownPartTool(r.partTool)),
    [filteredTableRows],
  );
  const unknownRows = useMemo(
    () => filteredTableRows.filter((r) => isUnknownPartTool(r.partTool)),
    [filteredTableRows],
  );

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
    return aggregatePartTool(pt, substepPartTools);
  }, [selectedPartToolId, partTools, substepPartTools]);

  // ── Aggregated item for detail dialog ──
  const detailTargetAggregated: AggregatedPartTool | null = useMemo(() => {
    if (!detailTarget) return null;
    return aggregatePartTool(detailTarget.partTool, substepPartTools);
  }, [detailTarget, substepPartTools]);

  // Highlight: highlightPartToolId (from substep context) or sidebar-selected item
  const effectiveHighlightId = highlightPartToolId ?? selectedPartToolId;

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
              {(() => {
                const sharedTableProps = {
                  callbacks: tableCallbacks,
                  getPreviewUrl,
                  imageCallbacks,
                  getPartToolImages,
                  testIdPrefix: 'parttool-list-row' as const,
                  compact: true,
                  selectedRowId: effectiveHighlightId,
                  onRowClick: handleRowClick,
                  onEditClick: handleEditClick,
                };
                return (
                  <>
                    <PartToolTable rows={namedRows} {...sharedTableProps} />
                    {unknownRows.length > 0 && (
                      <>
                        <div className="flex items-center gap-2 px-2 pt-4 pb-2" data-testid="unassigned-divider">
                          <div className="flex-1 border-t border-[var(--color-border-base)]" />
                          <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                            {t('editorCore.unassigned', 'Unassigned')}
                          </span>
                          <div className="flex-1 border-t border-[var(--color-border-base)]" />
                        </div>
                        <PartToolTable rows={unknownRows} {...sharedTableProps} />
                      </>
                    )}
                  </>
                );
              })()}
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
                <div className="relative bg-black overflow-hidden aspect-square">
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

      {/* Detail Dialog (optionally shows Replace when editing a different partTool) */}
      {detailTarget && detailTargetAggregated && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="parttool-detail-dialog"
          className="fixed inset-0 z-[60] flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-black/40" onClick={handleDetailClose} />
          <div className="relative w-[28rem] max-h-[80vh] flex flex-col rounded-2xl bg-[var(--color-bg-elevated)] shadow-xl overflow-hidden">
            <PartToolDetailContent
              item={detailTargetAggregated}
              previewImageUrl={getPreviewUrl?.(detailTarget.rowId) ?? null}
              compact
            />
            <div className="flex gap-2 p-4 border-t border-[var(--color-border-base)]">
              {(highlightPartToolId ?? selectedPartToolId) != null &&
               detailTarget.rowId !== (highlightPartToolId ?? selectedPartToolId) &&
               (highlightPartToolId ? onSubstepReplace : callbacks.onGlobalReplace) && (
                <button
                  type="button"
                  data-testid="replace-confirm-btn"
                  onClick={handleDetailReplace}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <Replace className="w-3.5 h-3.5" />
                  {t('editorCore.replace', 'Replace')}
                </button>
              )}
              <button
                type="button"
                data-testid="detail-close-btn"
                onClick={handleDetailClose}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-[var(--color-bg-hover)] text-[var(--color-text-base)] hover:bg-[var(--color-bg-active)] transition-colors cursor-pointer"
              >
                {t('common.close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discard Unsaved Changes Dialog */}
      {discardTarget && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="discard-confirm-dialog"
          className="fixed inset-0 z-[60] flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-black/40" onClick={handleDiscardCancel} />
          <div className="relative w-[24rem] flex flex-col rounded-2xl bg-[var(--color-bg-elevated)] shadow-xl overflow-hidden p-6">
            <p className="text-base text-[var(--color-text-base)] mb-4">
              {t('editorCore.discardChanges', 'Discard unsaved changes?')}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                data-testid="discard-confirm-btn"
                onClick={handleDiscardConfirm}
                className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity cursor-pointer"
              >
                {t('editorCore.discard', 'Discard')}
              </button>
              <button
                type="button"
                data-testid="discard-cancel-btn"
                onClick={handleDiscardCancel}
                className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-[var(--color-bg-hover)] text-[var(--color-text-base)] hover:bg-[var(--color-bg-active)] transition-colors cursor-pointer"
              >
                {t('common.cancel', 'Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
