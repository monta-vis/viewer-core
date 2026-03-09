import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../Button';
import { DialogShell } from '../DialogShell';
import { filterSuggestions } from './filterSuggestions';

export interface TextInputSuggestion {
  id: string;
  label: string;
  sublabel?: string;
  /** Extra text to match against when filtering (not displayed). */
  searchTerms?: string;
}

export interface TextInputModalProps {
  /** Label displayed above the input */
  label: string;
  /** Initial value for the input */
  value: string;
  /** Called with the new value when the user confirms */
  onConfirm: (newValue: string) => void;
  /** Called when the user cancels (Escape, backdrop click, cancel button) */
  onCancel: () => void;
  /** Input type: text (default), number, or textarea */
  inputType?: 'text' | 'number' | 'textarea';
  /** Optional list of suggestions displayed below the input */
  suggestions?: TextInputSuggestion[];
  /** Called when a suggestion is selected (fires instead of onConfirm) */
  onSelect?: (id: string) => void;
  /** Optional second confirm action — renders a second button alongside the primary confirm. */
  onSecondaryConfirm?: (newValue: string) => void;
  /** Label for the secondary confirm button. Required when onSecondaryConfirm is provided. */
  secondaryConfirmLabel?: string;
  /** Override label for the primary confirm button (default: t('common.confirm')). */
  confirmLabel?: string;
}

export function TextInputModal({ label, value, onConfirm, onCancel, inputType = 'text', suggestions, onSelect, onSecondaryConfirm, secondaryConfirmLabel, confirmLabel }: TextInputModalProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState(value);
  const [dirty, setDirty] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const dirtyRef = useRef(false);

  // Show all suggestions until the user edits the input; then filter.
  const filteredSuggestions = useMemo(() => {
    if (!suggestions) return undefined;
    if (!dirty) return [...suggestions];
    return filterSuggestions(suggestions, inputValue);
  }, [suggestions, inputValue, dirty]);

  // Auto-focus and select all on mount.
  // `autoFocus` on the elements handles immediate focus (critical for tablet
  // virtual keyboards which require focus during user gesture / element insertion).
  // The delayed `.focus()` + `.select()` is a fallback that also selects text.
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
      handleConfirm();
    }
    // Stop propagation for all keys so React's synthetic events
    // don't bubble through portals to parent components (e.g. Card role="button"
    // consuming Space, or parent onKeyDown handlers intercepting input).
    e.stopPropagation();
  };

  const inputClassName = 'w-full rounded-lg border border-[var(--color-border-base)] bg-[var(--color-bg-base)] px-3 py-2 text-[var(--color-text-base)] focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]/40';

  return (
    <DialogShell open blur maxWidth={onSecondaryConfirm ? 'max-w-md' : 'max-w-sm'} onClose={onCancel} className="bg-[var(--color-bg-surface)] space-y-4">
      {/* Label */}
      <h3 className="text-base font-medium text-[var(--color-text-base)]">{label}</h3>

      {/* Input */}
      {inputType === 'textarea' ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          aria-label={label}
          autoFocus
          value={inputValue}
          onChange={(e) => { dirtyRef.current = true; setDirty(true); setInputValue(e.target.value); }}
          onKeyDown={handleKeyDown}
          rows={3}
          className={inputClassName}
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          aria-label={label}
          autoFocus
          type={inputType}
          value={inputValue}
          onChange={(e) => { dirtyRef.current = true; setDirty(true); setInputValue(e.target.value); }}
          onKeyDown={handleKeyDown}
          className={inputClassName}
        />
      )}

      {/* Suggestion list */}
      {filteredSuggestions !== undefined && (
        <div data-testid="suggestion-list" className="max-h-48 overflow-y-auto rounded-lg border border-[var(--color-border-muted)]">
          {filteredSuggestions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-[var(--color-text-muted)]">
              {t('common.noResults', 'No results')}
            </div>
          ) : (
            filteredSuggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-[var(--color-bg-elevated)] transition-colors cursor-pointer border-b border-[var(--color-border-muted)] last:border-b-0"
                onClick={() => onSelect?.(s.id)}
              >
                <div className="text-sm font-medium text-[var(--color-text-base)]">{s.label}</div>
                {s.sublabel && (
                  <div className="text-xs text-[var(--color-text-muted)]">{s.sublabel}</div>
                )}
              </button>
            ))
          )}
        </div>
      )}

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
