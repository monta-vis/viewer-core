import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../Button';
import { DialogShell } from '../DialogShell';

export interface TextInputSuggestion {
  id: string;
  label: string;
  sublabel?: string;
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
}

export function TextInputModal({ label, value, onConfirm, onCancel, inputType = 'text', suggestions, onSelect }: TextInputModalProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Filter suggestions by input value (case-insensitive, matches label + sublabel)
  const filteredSuggestions = useMemo(() => {
    if (!suggestions) return undefined;
    const query = inputValue.toLowerCase();
    if (!query) return suggestions;
    return suggestions.filter((s) =>
      s.label.toLowerCase().includes(query) ||
      (s.sublabel?.toLowerCase().includes(query) ?? false)
    );
  }, [suggestions, inputValue]);

  // Auto-focus and select all on mount
  useEffect(() => {
    const el = inputRef.current;
    if (el) {
      el.focus();
      el.select();
    }
  }, []);

  const handleConfirm = () => {
    onConfirm(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputType !== 'textarea') {
      e.preventDefault();
      handleConfirm();
    }
  };

  const inputClassName = 'w-full rounded-lg border border-[var(--color-border-base)] bg-[var(--color-bg-base)] px-3 py-2 text-[var(--color-text-base)] focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]/40';

  return (
    <DialogShell open blur maxWidth="max-w-sm" onClose={onCancel} className="bg-[var(--color-bg-surface)] border-[var(--color-border-muted)] space-y-4">
      {/* Label */}
      <h3 className="text-base font-medium text-[var(--color-text-base)]">{label}</h3>

      {/* Input */}
      {inputType === 'textarea' ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          aria-label={label}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          className={inputClassName}
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          aria-label={label}
          type={inputType}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
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
        <Button variant="primary" size="sm" onClick={handleConfirm} aria-label={t('common.confirm', 'Confirm')}>
          {t('common.confirm', 'Confirm')}
        </Button>
      </div>
    </DialogShell>
  );
}
