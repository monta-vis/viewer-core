import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Save, Trash2, X } from 'lucide-react';
import { Button, ConfirmDeleteDialog, IconButton, TextInputModal } from '@monta-vis/viewer-core';

export interface SidebarFormState {
  type: 'Part' | 'Tool';
  name: string;
  label: string;
  partNumber: string;
  amount: number;
  unit: string;
  material: string;
  dimension: string;
  description: string;
}

export const EMPTY_SIDEBAR_FORM: SidebarFormState = {
  type: 'Part',
  name: '',
  label: '',
  partNumber: '',
  amount: 1,
  unit: '',
  material: '',
  dimension: '',
  description: '',
};

export interface PartToolSidebarFormProps {
  values: SidebarFormState;
  onChange: (values: SidebarFormState) => void;
  canAdd: boolean;
  canUpdate: boolean;
  onAdd: () => void;
  onUpdate: () => void;
  onDelete?: () => void;
  onDeselect?: () => void;
}

interface EditingField {
  key: keyof SidebarFormState;
  label: string;
  inputType: 'text' | 'number' | 'textarea';
}

interface BoxedFieldProps {
  label: string;
  value: string;
  onClick: () => void;
  'data-testid'?: string;
  className?: string;
}

function BoxedField({ label, value, onClick, 'data-testid': testId, className }: BoxedFieldProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={testId}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className={`relative text-left border border-solid border-[var(--color-border-base)] rounded-lg pt-3.5 pb-1 px-2 cursor-pointer hover:border-[var(--color-secondary)] transition-colors min-h-[2.5rem] ${className ?? ''}`}
    >
      <span className="absolute top-0.5 left-2 text-[0.5625rem] text-[var(--color-text-muted)]">
        {label}
      </span>
      <span data-testid="boxed-field-value" className="text-sm text-[var(--color-text-base)] block truncate">
        {value || '\u00A0'}
      </span>
    </div>
  );
}

export function PartToolSidebarForm({
  values,
  onChange,
  canAdd,
  canUpdate,
  onAdd,
  onUpdate,
  onDelete,
  onDeselect,
}: PartToolSidebarFormProps) {
  const { t } = useTranslation();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [editingField, setEditingField] = useState<EditingField | null>(null);

  const set = useCallback(
    <K extends keyof SidebarFormState>(key: K, value: SidebarFormState[K]) => {
      onChange({ ...values, [key]: value });
    },
    [values, onChange],
  );

  const openField = (key: keyof SidebarFormState, label: string, inputType: 'text' | 'number' | 'textarea' = 'text') => {
    setEditingField({ key, label, inputType });
  };

  const handleConfirm = (newValue: string) => {
    if (!editingField) return;
    if (editingField.inputType === 'number') {
      set(editingField.key, Math.max(1, Number(newValue)) as SidebarFormState[typeof editingField.key]);
    } else {
      set(editingField.key, newValue as SidebarFormState[typeof editingField.key]);
    }
    setEditingField(null);
  };

  return (
    <div data-testid="sidebar-form" className="flex flex-col h-full">
      {/* Scrollable form content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* Top-right action icons */}
        <div className="flex justify-end gap-1" data-testid="sidebar-form-top-actions">
          {onDelete && (
            <IconButton
              icon={<Trash2 />}
              aria-label={t('editorCore.deletePartTool', 'Delete part/tool')}
              variant="danger"
              size="sm"
              data-testid="sidebar-form-delete-btn"
              onClick={() => setConfirmDeleteOpen(true)}
            />
          )}
          {onDeselect && (
            <IconButton
              icon={<X />}
              aria-label={t('editorCore.clearSelection', 'Clear selection')}
              variant="ghost"
              size="sm"
              data-testid="sidebar-form-deselect-btn"
              onClick={onDeselect}
            />
          )}
        </div>

        {/* Row 1: Name + Amount */}
        <div className="flex gap-2">
          <BoxedField
            label={`${t('editorCore.partToolName', 'Name')} *`}
            value={values.name}
            data-testid="sidebar-form-name"
            onClick={() => openField('name', t('editorCore.partToolName', 'Name'))}
            className="flex-1 min-w-0"
          />
          <BoxedField
            label={t('editorCore.amount', 'Amount')}
            value={String(values.amount)}
            data-testid="sidebar-form-amount"
            onClick={() => openField('amount', t('editorCore.amount', 'Amount'), 'number')}
            className="w-[3rem] shrink-0 text-center"
          />
        </div>

        {/* Row 2: Type + Label */}
        <div className="flex gap-2">
          {/* Type toggle in boxed shell */}
          <div className="relative border border-solid border-[var(--color-border-base)] rounded-lg pt-3.5 pb-1 px-2 w-[4.75rem] shrink-0 min-h-[2.5rem]">
            <span className="absolute top-0.5 left-2 text-[0.5625rem] text-[var(--color-text-muted)]">
              {t('editorCore.type', 'Type')}
            </span>
            <button
              type="button"
              data-testid="sidebar-form-type-toggle"
              onClick={() => set('type', values.type === 'Part' ? 'Tool' : 'Part')}
              aria-label={t('editorCore.toggleType', 'Toggle type')}
              className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                values.type === 'Tool'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
              }`}
            >
              {values.type === 'Part'
                ? t('editorCore.typePart', 'Part')
                : t('editorCore.typeTool', 'Tool')}
            </button>
          </div>
          <BoxedField
            label={t('editorCore.partToolLabel', 'Label')}
            value={values.label}
            data-testid="sidebar-form-label"
            onClick={() => openField('label', t('editorCore.partToolLabel', 'Label'))}
            className="flex-1 min-w-0"
          />
        </div>

        {/* Row 3: Part # (full width) */}
        <BoxedField
          label={t('editorCore.partNumber', 'Part #')}
          value={values.partNumber}
          data-testid="sidebar-form-partNumber"
          onClick={() => openField('partNumber', t('editorCore.partNumber', 'Part #'))}
        />

        {/* Row 4: Unit + Material */}
        <div className="flex gap-2">
          <BoxedField
            label={t('editorCore.unit', 'Unit')}
            value={values.unit}
            data-testid="sidebar-form-unit"
            onClick={() => openField('unit', t('editorCore.unit', 'Unit'))}
            className="flex-1 min-w-0"
          />
          <BoxedField
            label={t('editorCore.material', 'Material')}
            value={values.material}
            data-testid="sidebar-form-material"
            onClick={() => openField('material', t('editorCore.material', 'Material'))}
            className="flex-1 min-w-0"
          />
        </div>

        {/* Row 5: Dimension (full width) */}
        <BoxedField
          label={t('editorCore.dimension', 'Dimension')}
          value={values.dimension}
          data-testid="sidebar-form-dimension"
          onClick={() => openField('dimension', t('editorCore.dimension', 'Dimension'))}
        />

        {/* Row 6: Description (full width) */}
        <BoxedField
          label={t('editorCore.description', 'Description')}
          value={values.description}
          data-testid="sidebar-form-description"
          onClick={() => openField('description', t('editorCore.description', 'Description'), 'textarea')}
        />
      </div>

      {/* Sticky action buttons */}
      <div className="shrink-0 border-t border-[var(--color-border-base)] p-4">
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            disabled={!canAdd}
            onClick={onAdd}
            aria-label={t('editorCore.addPartTool', 'Add part/tool')}
            data-testid="sidebar-form-add-btn"
            className="flex-1"
          >
            <Plus className="w-4 h-4" />
            {t('editorCore.add', 'Add')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={!canUpdate}
            onClick={onUpdate}
            aria-label={t('editorCore.updatePartTool', 'Update part/tool')}
            data-testid="sidebar-form-update-btn"
            className="flex-1"
          >
            <Save className="w-4 h-4" />
            {t('editorCore.update', 'Update')}
          </Button>
        </div>
      </div>

      {/* TextInputModal for field editing */}
      {editingField && (
        <TextInputModal
          label={editingField.label}
          value={String(values[editingField.key])}
          inputType={editingField.inputType}
          onConfirm={handleConfirm}
          onCancel={() => setEditingField(null)}
        />
      )}

      {/* Delete confirmation dialog */}
      {onDelete && (
        <ConfirmDeleteDialog
          open={confirmDeleteOpen}
          onClose={() => setConfirmDeleteOpen(false)}
          onConfirm={onDelete}
          title={t('editorCore.deletePartTool', 'Delete part/tool?')}
          message={t('editorCore.deletePartToolConfirm', 'This action cannot be undone.')}
        />
      )}
    </div>
  );
}
