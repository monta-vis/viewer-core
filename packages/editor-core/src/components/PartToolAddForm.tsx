import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { EditInput } from './EditInput';

export interface PartToolAddFormValues {
  name: string;
  type: 'Part' | 'Tool';
  amount: number;
  partNumber: string;
  iconId?: string;
}

export interface PartToolAddFormProps {
  values: PartToolAddFormValues;
  onChange: (values: PartToolAddFormValues) => void;
  onSubmit: () => void;
  canSubmit: boolean;
  previewUrl?: string | null;
}

export function PartToolAddForm({
  values,
  onChange,
  onSubmit,
  canSubmit,
  previewUrl,
}: PartToolAddFormProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-bg-base)] border border-[var(--color-border-base)]">
      {/* Icon preview */}
      <div className="shrink-0 w-10 h-10 rounded border border-[var(--color-border-base)] bg-[var(--color-bg-elevated)] flex items-center justify-center overflow-hidden">
        {previewUrl ? (
          <img
            data-testid="add-form-preview"
            src={previewUrl}
            alt=""
            className="w-full h-full object-contain"
          />
        ) : (
          <span className="text-[var(--color-text-subtle)] text-xs">—</span>
        )}
      </div>

      {/* Name */}
      <EditInput
        data-testid="add-form-name"
        size="sm"
        placeholder={t('editorCore.partToolName', 'Name')}
        value={values.name}
        onChange={(e) => onChange({ ...values, name: e.target.value })}
        className="flex-1 min-w-0"
      />

      {/* Type toggle */}
      <button
        type="button"
        data-testid="add-form-type"
        onClick={() => onChange({ ...values, type: values.type === 'Part' ? 'Tool' : 'Part' })}
        className={`shrink-0 px-2 py-1 rounded text-xs font-medium transition-colors ${
          values.type === 'Tool'
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
        }`}
      >
        {values.type}
      </button>

      {/* Amount */}
      <EditInput
        data-testid="add-form-amount"
        size="sm"
        type="number"
        min={1}
        value={values.amount}
        onChange={(e) => onChange({ ...values, amount: Math.max(1, Number(e.target.value)) })}
        className="w-14 text-center"
      />

      {/* Part number */}
      <EditInput
        data-testid="add-form-partNumber"
        size="sm"
        placeholder={t('editorCore.partNumber', 'Part #')}
        value={values.partNumber}
        onChange={(e) => onChange({ ...values, partNumber: e.target.value })}
        className="w-28"
      />

      {/* Submit */}
      <button
        type="button"
        data-testid="add-form-submit"
        disabled={!canSubmit}
        onClick={onSubmit}
        className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-primary)] text-white disabled:opacity-40 disabled:cursor-default hover:opacity-90 transition-opacity"
      >
        <Plus className="w-3.5 h-3.5" />
        {t('editorCore.addToInstruction', 'Add')}
      </button>
    </div>
  );
}
