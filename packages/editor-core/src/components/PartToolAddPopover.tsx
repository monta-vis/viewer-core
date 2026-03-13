import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import type { PartToolRow } from '@monta-vis/viewer-core';
import { EditInput, EditTextarea } from './EditInput';
import { PartToolCatalogGrid, type PartToolIconItem } from './PartToolCatalogGrid';
import { PartToolAddForm, type PartToolAddFormValues } from './PartToolAddForm';

export interface PartToolAddPopoverProps {
  open: boolean;
  onClose: () => void;
  onAdd: (prefill: Partial<PartToolRow>) => void;
  catalogItems?: PartToolIconItem[];
  getCatalogIconUrl?: (item: PartToolIconItem) => string;
}

type TabId = 'manual' | 'catalog';

interface ManualFormState {
  type: 'Part' | 'Tool';
  name: string;
  position: string;
  partNumber: string;
  amount: number;
  unit: string;
  material: string;
  dimension: string;
  description: string;
}

const INITIAL_MANUAL: ManualFormState = {
  type: 'Part',
  name: '',
  position: '',
  partNumber: '',
  amount: 1,
  unit: '',
  material: '',
  dimension: '',
  description: '',
};

const INITIAL_CATALOG_FORM: PartToolAddFormValues = {
  name: '',
  type: 'Part',
  amount: 1,
  partNumber: '',
  iconId: undefined,
};

export function PartToolAddPopover({
  open,
  onClose,
  onAdd,
  catalogItems,
  getCatalogIconUrl,
}: PartToolAddPopoverProps) {
  const { t } = useTranslation();
  const hasCatalog = Boolean(catalogItems && catalogItems.length > 0 && getCatalogIconUrl);
  const [activeTab, setActiveTab] = useState<TabId>('manual');
  const [manual, setManual] = useState<ManualFormState>(INITIAL_MANUAL);
  const [catalogForm, setCatalogForm] = useState<PartToolAddFormValues>(INITIAL_CATALOG_FORM);
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);

  // Reset state when popover opens
  useEffect(() => {
    if (open) {
      setActiveTab('manual');
      setManual(INITIAL_MANUAL);
      setCatalogForm(INITIAL_CATALOG_FORM);
      setSelectedCatalogId(null);
    }
  }, [open]);

  // Escape key handler
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const handleManualSubmit = useCallback(() => {
    if (!manual.name.trim()) return;
    const prefill: Partial<PartToolRow> = {
      name: manual.name.trim(),
      type: manual.type,
      amount: manual.amount,
    };
    const optionalFields = ['position', 'partNumber', 'unit', 'material', 'dimension', 'description'] as const;
    for (const field of optionalFields) {
      const trimmed = manual[field].trim();
      if (trimmed) prefill[field] = trimmed;
    }
    onAdd(prefill);
    setManual(INITIAL_MANUAL);
  }, [manual, onAdd]);

  const handleCatalogSelect = useCallback((item: PartToolIconItem) => {
    setSelectedCatalogId(item.id);
    setCatalogForm((prev) => ({
      ...prev,
      name: item.label,
      type: item.itemType,
      iconId: item.id,
    }));
  }, []);

  const handleCatalogSubmit = useCallback(() => {
    if (!catalogForm.name.trim()) return;
    const prefill: Partial<PartToolRow> = {
      name: catalogForm.name.trim(),
      type: catalogForm.type,
      amount: catalogForm.amount,
      iconId: catalogForm.iconId ?? null,
    };
    if (catalogForm.partNumber.trim()) prefill.partNumber = catalogForm.partNumber.trim();
    onAdd(prefill);
    setCatalogForm(INITIAL_CATALOG_FORM);
    setSelectedCatalogId(null);
  }, [catalogForm, onAdd]);

  if (!open) return null;

  const canManualSubmit = manual.name.trim().length > 0;

  const content = (
    <>
      {/* Backdrop */}
      <div
        data-testid="parttool-add-backdrop"
        className="fixed inset-0 z-50 bg-black/30"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        data-testid="parttool-add-popover"
        role="dialog"
        aria-modal="true"
        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[24rem] max-h-[80vh] overflow-y-auto rounded-xl border border-[var(--color-border-base)] bg-[var(--color-bg-base)] shadow-xl"
      >
        {/* Tabs (only if catalog available) */}
        {hasCatalog && (
          <div className="flex border-b border-[var(--color-border-base)]">
            <button
              type="button"
              data-testid="parttool-add-tab-manual"
              onClick={() => setActiveTab('manual')}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'manual'
                  ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-base)]'
              }`}
            >
              {t('editorCore.manualTab', 'Manual')}
            </button>
            <button
              type="button"
              data-testid="parttool-add-tab-catalog"
              onClick={() => setActiveTab('catalog')}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'catalog'
                  ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-base)]'
              }`}
            >
              {t('editorCore.catalogTab', 'Catalog')}
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-4">
          {activeTab === 'manual' ? (
            <ManualTab
              values={manual}
              onChange={setManual}
              onSubmit={handleManualSubmit}
              canSubmit={canManualSubmit}
            />
          ) : (
            catalogItems && getCatalogIconUrl && (
              <div className="flex flex-col gap-3">
                <PartToolCatalogGrid
                  items={catalogItems}
                  getIconUrl={getCatalogIconUrl}
                  selectedId={selectedCatalogId}
                  onSelect={handleCatalogSelect}
                />
                <PartToolAddForm
                  values={catalogForm}
                  onChange={setCatalogForm}
                  onSubmit={handleCatalogSubmit}
                  canSubmit={catalogForm.name.trim().length > 0}
                  previewUrl={
                    selectedCatalogId && catalogItems
                      ? getCatalogIconUrl(
                          catalogItems.find((i) => i.id === selectedCatalogId) ?? catalogItems[0],
                        )
                      : null
                  }
                />
              </div>
            )
          )}
        </div>
      </div>
    </>
  );

  return createPortal(content, document.body);
}

/* ------------------------------------------------------------------ */
/*  Manual tab sub-component                                          */
/* ------------------------------------------------------------------ */

interface ManualTabProps {
  values: ManualFormState;
  onChange: (values: ManualFormState) => void;
  onSubmit: () => void;
  canSubmit: boolean;
}

function ManualTab({ values, onChange, onSubmit, canSubmit }: ManualTabProps) {
  const { t } = useTranslation();

  const set = <K extends keyof ManualFormState>(key: K, value: ManualFormState[K]) =>
    onChange({ ...values, [key]: value });

  return (
    <div className="flex flex-col gap-3">
      {/* Type toggle */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          data-testid="parttool-add-manual-type"
          onClick={() => set('type', values.type === 'Part' ? 'Tool' : 'Part')}
          aria-label={t('editorCore.toggleType', 'Toggle type')}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            values.type === 'Tool'
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
          }`}
        >
          {values.type === 'Part' ? t('editorCore.typePart', 'Part') : t('editorCore.typeTool', 'Tool')}
        </button>
      </div>

      {/* Name (required) */}
      <EditInput
        data-testid="parttool-add-manual-name"
        size="sm"
        placeholder={t('editorCore.partToolName', 'Name') + ' *'}
        value={values.name}
        onChange={(e) => set('name', e.target.value)}
      />

      {/* Position */}
      <EditInput
        data-testid="parttool-add-manual-position"
        size="sm"
        placeholder={t('editorCore.partToolPosition', 'Position')}
        value={values.position}
        onChange={(e) => set('position', e.target.value)}
      />

      {/* Part# + Amount row */}
      <div className="flex gap-2">
        <EditInput
          data-testid="parttool-add-manual-partNumber"
          size="sm"
          placeholder={t('editorCore.partNumber', 'Part #')}
          value={values.partNumber}
          onChange={(e) => set('partNumber', e.target.value)}
          className="flex-1"
        />
        <EditInput
          data-testid="parttool-add-manual-amount"
          size="sm"
          type="number"
          min={1}
          placeholder={t('editorCore.amount', 'Amount')}
          value={values.amount}
          onChange={(e) => set('amount', Math.max(1, Number(e.target.value)))}
          className="w-16 text-center"
        />
      </div>

      {/* Unit + Material row */}
      <div className="flex gap-2">
        <EditInput
          data-testid="parttool-add-manual-unit"
          size="sm"
          placeholder={t('editorCore.unit', 'Unit')}
          value={values.unit}
          onChange={(e) => set('unit', e.target.value)}
          className="flex-1"
        />
        <EditInput
          data-testid="parttool-add-manual-material"
          size="sm"
          placeholder={t('editorCore.material', 'Material')}
          value={values.material}
          onChange={(e) => set('material', e.target.value)}
          className="flex-1"
        />
      </div>

      {/* Dimension */}
      <EditInput
        data-testid="parttool-add-manual-dimension"
        size="sm"
        placeholder={t('editorCore.dimension', 'Dimension')}
        value={values.dimension}
        onChange={(e) => set('dimension', e.target.value)}
      />

      {/* Description */}
      <EditTextarea
        data-testid="parttool-add-manual-description"
        size="sm"
        placeholder={t('editorCore.description', 'Description')}
        value={values.description}
        onChange={(e) => set('description', e.target.value)}
        rows={2}
      />

      {/* Submit */}
      <button
        type="button"
        data-testid="parttool-add-manual-submit"
        disabled={!canSubmit}
        onClick={onSubmit}
        className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--color-primary)] text-white disabled:opacity-40 disabled:cursor-default hover:opacity-90 transition-opacity"
      >
        <Plus className="w-4 h-4" />
        {t('editorCore.addToInstruction', 'Add')}
      </button>
    </div>
  );
}
