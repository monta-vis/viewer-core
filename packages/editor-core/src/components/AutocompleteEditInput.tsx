import { useState, useCallback, useMemo, useRef } from 'react';
import { EditInput, type EditInputProps } from './EditInput';

export interface AutocompleteSuggestion {
  id: string;
  label: string;
  sublabel?: string;
}

export interface AutocompleteEditInputProps extends Omit<EditInputProps, 'onSelect'> {
  suggestions: AutocompleteSuggestion[];
  onSelectSuggestion: (id: string) => void;
  /** Minimum characters before showing suggestions (default 1). */
  minChars?: number;
}

export function AutocompleteEditInput({
  suggestions,
  onSelectSuggestion,
  minChars = 1,
  value,
  onChange,
  onBlur,
  onKeyDown,
  ...inputProps
}: AutocompleteEditInputProps) {
  const [focused, setFocused] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const strValue = String(value ?? '');

  const filtered = useMemo(() => {
    if (strValue.length < minChars) return [];
    const query = strValue.toLowerCase();
    return suggestions.filter(
      (s) =>
        s.label.toLowerCase().includes(query) ||
        (s.sublabel && s.sublabel.toLowerCase().includes(query)),
    );
  }, [suggestions, strValue, minChars]);

  const showDropdown = focused && filtered.length > 0;

  const handleFocus = useCallback(() => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setFocused(true);
    setHighlightIndex(-1);
  }, []);

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      // Delay to allow click on dropdown item
      blurTimeoutRef.current = setTimeout(() => {
        setFocused(false);
        setHighlightIndex(-1);
      }, 150);
      onBlur?.(e);
    },
    [onBlur],
  );

  const handleSelect = useCallback(
    (id: string) => {
      onSelectSuggestion(id);
      setFocused(false);
      setHighlightIndex(-1);
    },
    [onSelectSuggestion],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (showDropdown) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setHighlightIndex((prev) => (prev + 1) % filtered.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setHighlightIndex((prev) => (prev <= 0 ? filtered.length - 1 : prev - 1));
          return;
        }
        if (e.key === 'Enter' && highlightIndex >= 0) {
          e.preventDefault();
          handleSelect(filtered[highlightIndex].id);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setFocused(false);
          setHighlightIndex(-1);
          return;
        }
      }
      onKeyDown?.(e);
    },
    [showDropdown, filtered, highlightIndex, handleSelect, onKeyDown],
  );

  return (
    <div ref={containerRef} className="relative">
      <EditInput
        {...inputProps}
        value={value}
        onChange={onChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
      {showDropdown && (
        <ul
          role="listbox"
          className="absolute left-0 bottom-full z-50 mb-0.5 w-max min-w-full max-h-[10rem] overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-lg text-[0.65rem]"
        >
          {filtered.map((s, i) => (
            <li
              key={s.id}
              role="option"
              aria-selected={i === highlightIndex}
              className={`cursor-pointer px-2 py-1 ${
                i === highlightIndex
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'hover:bg-[var(--color-bg-hover)]'
              }`}
              onMouseDown={(e) => {
                e.preventDefault(); // prevent blur
                handleSelect(s.id);
              }}
            >
              <span className="font-medium">{s.label}</span>
              {s.sublabel && (
                <span className="ml-1 text-[var(--color-text-muted)]">{s.sublabel}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
