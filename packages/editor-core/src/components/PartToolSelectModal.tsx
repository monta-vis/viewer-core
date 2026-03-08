import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, DialogShell, filterSuggestions, type TextInputSuggestion } from '@monta-vis/viewer-core';
import { PartToolSelectList, type PartToolSelectItem } from './PartToolSelectList';

export interface PartToolSelectModalProps {
  label: string;
  value: string;
  onConfirm: (newValue: string) => void;
  onCancel: () => void;
  inputType?: 'text' | 'number';
  /** PartTool items to show as selectable rows */
  items: PartToolSelectItem[];
  /** Called when a row is selected */
  onSelect: (id: string) => void;
  /** Resolve thumbnail URL for each item */
  getPreviewUrl?: (item: PartToolSelectItem) => string | null;
  /** Optional secondary confirm (e.g. "Create new") */
  onSecondaryConfirm?: (newValue: string) => void;
  secondaryConfirmLabel?: string;
  confirmLabel?: string;
}

/**
 * Modal combining a text input with a PartToolSelectList table below.
 * Replaces TextInputModal for catalog suggestion fields (name, label, partNumber).
 */
export function PartToolSelectModal({
  label,
  value,
  onConfirm,
  onCancel,
  inputType = 'text',
  items,
  onSelect,
  getPreviewUrl,
  onSecondaryConfirm,
  secondaryConfirmLabel,
  confirmLabel,
}: PartToolSelectModalProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState(value);
  const [dirty, setDirty] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dirtyRef = useRef(false);

  // Filter items using filterSuggestions: convert to TextInputSuggestion, filter, map back
  const filteredItems = useMemo(() => {
    if (!dirty) return items;
    const asSuggestions: TextInputSuggestion[] = items.map((item) => ({
      id: item.id,
      label: item.name,
      sublabel: item.partNumber ?? undefined,
      searchTerms: item.partNumber ?? undefined,
    }));
    const filtered = filterSuggestions(asSuggestions, inputValue);
    const ids = new Set(filtered.map((s) => s.id));
    return items.filter((item) => ids.has(item.id));
  }, [items, inputValue, dirty]);

  // Auto-focus and select all on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const el = inputRef.current;
      if (el) {
        el.focus();
        if (!dirtyRef.current) el.select();
      }
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleConfirm = () => {
    onConfirm(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleConfirm();
    }
  };

  const inputClassName = 'w-full rounded-lg border border-[var(--color-border-base)] bg-[var(--color-bg-base)] px-3 py-2 text-[var(--color-text-base)] focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]/40';

  return (
    <DialogShell open blur maxWidth="max-w-xl" onClose={onCancel} className="bg-[var(--color-bg-surface)] space-y-4">
      {/* Label */}
      <h3 className="text-base font-medium text-[var(--color-text-base)]">{label}</h3>

      {/* Input */}
      <input
        ref={inputRef}
        aria-label={label}
        autoFocus
        type={inputType}
        value={inputValue}
        onChange={(e) => { dirtyRef.current = true; setDirty(true); setInputValue(e.target.value); }}
        onKeyDown={handleKeyDown}
        className={inputClassName}
      />

      {/* PartToolSelectList */}
      <div data-testid="parttool-select-list" className="max-h-48 overflow-y-auto rounded-lg border border-[var(--color-border-muted)]">
        <PartToolSelectList
          items={filteredItems}
          onSelect={(item) => onSelect(item.id)}
          getPreviewUrl={getPreviewUrl}
        />
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} aria-label={t('common.cancel', 'Cancel')}>
          {t('common.cancel', 'Cancel')}
        </Button>
        {onSecondaryConfirm && (
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => onSecondaryConfirm(inputValue)} aria-label={secondaryConfirmLabel ?? ''}>
            {secondaryConfirmLabel}
          </Button>
        )}
        <Button variant="primary" size="sm" className={onSecondaryConfirm ? 'text-xs' : undefined} onClick={handleConfirm} aria-label={confirmLabel ?? t('common.confirm', 'Confirm')}>
          {confirmLabel ?? t('common.confirm', 'Confirm')}
        </Button>
      </div>
    </DialogShell>
  );
}
