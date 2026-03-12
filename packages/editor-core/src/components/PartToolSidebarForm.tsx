import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Save, Trash2, X } from 'lucide-react';
import { EditInput, EditTextarea } from './EditInput';

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

  const set = useCallback(
    <K extends keyof SidebarFormState>(key: K, value: SidebarFormState[K]) => {
      onChange({ ...values, [key]: value });
    },
    [values, onChange],
  );

  return (
    <div data-testid="sidebar-form" className="flex flex-col h-full">
      {/* Scrollable form content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Type toggle + Deselect row */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">
            {t('editorCore.type', 'Type')}
          </span>
          <button
            type="button"
            data-testid="sidebar-form-type-toggle"
            onClick={() => set('type', values.type === 'Part' ? 'Tool' : 'Part')}
            aria-label={t('editorCore.toggleType', 'Toggle type')}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              values.type === 'Tool'
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
            }`}
          >
            {values.type === 'Part'
              ? t('editorCore.typePart', 'Part')
              : t('editorCore.typeTool', 'Tool')}
          </button>
          {onDeselect && (
            <button
              type="button"
              data-testid="sidebar-form-deselect-btn"
              onClick={onDeselect}
              aria-label={t('editorCore.clearSelection', 'Clear selection')}
              className="ml-auto p-1 rounded hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Name (required) */}
        <label className="block">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">
            {t('editorCore.partToolName', 'Name')} *
          </span>
          <EditInput
            data-testid="sidebar-form-name"
            size="sm"
            placeholder={t('editorCore.partToolName', 'Name')}
            value={values.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </label>

        {/* Label */}
        <label className="block">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">
            {t('editorCore.partToolLabel', 'Label')}
          </span>
          <EditInput
            data-testid="sidebar-form-label"
            size="sm"
            placeholder={t('editorCore.partToolLabel', 'Label')}
            value={values.label}
            onChange={(e) => set('label', e.target.value)}
          />
        </label>

        {/* Part# + Amount row */}
        <div className="flex gap-2">
          <label className="block flex-1">
            <span className="text-xs font-medium text-[var(--color-text-muted)]">
              {t('editorCore.partNumber', 'Part #')}
            </span>
            <EditInput
              data-testid="sidebar-form-partNumber"
              size="sm"
              placeholder={t('editorCore.partNumber', 'Part #')}
              value={values.partNumber}
              onChange={(e) => set('partNumber', e.target.value)}
            />
          </label>
          <label className="block w-16">
            <span className="text-xs font-medium text-[var(--color-text-muted)]">
              {t('editorCore.amount', 'Amount')}
            </span>
            <EditInput
              data-testid="sidebar-form-amount"
              size="sm"
              type="number"
              min={1}
              placeholder={t('editorCore.amount', 'Amount')}
              value={values.amount}
              onChange={(e) => set('amount', Math.max(1, Number(e.target.value)))}
              className="text-center"
            />
          </label>
        </div>

        {/* Unit + Material row */}
        <div className="flex gap-2">
          <label className="block flex-1">
            <span className="text-xs font-medium text-[var(--color-text-muted)]">
              {t('editorCore.unit', 'Unit')}
            </span>
            <EditInput
              data-testid="sidebar-form-unit"
              size="sm"
              placeholder={t('editorCore.unit', 'Unit')}
              value={values.unit}
              onChange={(e) => set('unit', e.target.value)}
            />
          </label>
          <label className="block flex-1">
            <span className="text-xs font-medium text-[var(--color-text-muted)]">
              {t('editorCore.material', 'Material')}
            </span>
            <EditInput
              data-testid="sidebar-form-material"
              size="sm"
              placeholder={t('editorCore.material', 'Material')}
              value={values.material}
              onChange={(e) => set('material', e.target.value)}
            />
          </label>
        </div>

        {/* Dimension */}
        <label className="block">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">
            {t('editorCore.dimension', 'Dimension')}
          </span>
          <EditInput
            data-testid="sidebar-form-dimension"
            size="sm"
            placeholder={t('editorCore.dimension', 'Dimension')}
            value={values.dimension}
            onChange={(e) => set('dimension', e.target.value)}
          />
        </label>

        {/* Description */}
        <label className="block">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">
            {t('editorCore.description', 'Description')}
          </span>
          <EditTextarea
            data-testid="sidebar-form-description"
            size="sm"
            placeholder={t('editorCore.description', 'Description')}
            value={values.description}
            onChange={(e) => set('description', e.target.value)}
            rows={2}
          />
        </label>
      </div>

      {/* Sticky action buttons */}
      <div className="shrink-0 border-t border-[var(--color-border-base)] p-4 space-y-2">
        <div className="flex gap-2">
          <button
            type="button"
            data-testid="sidebar-form-add-btn"
            disabled={!canAdd}
            onClick={onAdd}
            aria-label={t('editorCore.addPartTool', 'Add part/tool')}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-[var(--color-primary)] text-white disabled:opacity-40 disabled:cursor-default hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {t('editorCore.add', 'Add')}
          </button>
          <button
            type="button"
            data-testid="sidebar-form-update-btn"
            disabled={!canUpdate}
            onClick={onUpdate}
            aria-label={t('editorCore.updatePartTool', 'Update part/tool')}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-[var(--color-bg-hover)] text-[var(--color-text-base)] disabled:opacity-40 disabled:cursor-default hover:bg-[var(--color-bg-active)] transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {t('editorCore.update', 'Update')}
          </button>
        </div>
        {onDelete && (
          <button
            type="button"
            data-testid="sidebar-form-delete-btn"
            onClick={onDelete}
            aria-label={t('editorCore.deletePartTool', 'Delete part/tool')}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t('editorCore.delete', 'Delete')}
          </button>
        )}
      </div>
    </div>
  );
}
