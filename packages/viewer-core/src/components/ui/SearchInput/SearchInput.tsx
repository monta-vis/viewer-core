import { Search, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

export interface SearchInputProps {
  /** Current search value. */
  value: string;
  /** Called with the new value on change or clear. */
  onChange: (value: string) => void;
  /** Placeholder text. */
  placeholder?: string;
  /** Whether to show the clear button when value is non-empty (default: true). */
  showClear?: boolean;
  /** Additional class names for the wrapper. */
  className?: string;
  /** Accessible label for the input. */
  'aria-label'?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  showClear = true,
  className,
  'aria-label': ariaLabel,
}: SearchInputProps) {
  const { t } = useTranslation();
  return (
    <div
      className={clsx(
        'relative flex items-center gap-3',
        'h-11 px-4',
        'bg-[var(--color-bg-surface)]',
        'rounded-xl',
        'shadow-sm shadow-black/8',
        'focus-within:shadow-md focus-within:shadow-black/12',
        'focus-within:ring-2 focus-within:ring-[var(--color-secondary)]/20',
        'hover:shadow-md hover:shadow-black/10',
        'transition-all duration-150',
        className,
      )}
    >
      <Search className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0" />

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={clsx(
          'flex-1 min-w-0',
          'bg-transparent',
          'border-none',
          'outline-none',
          'text-[var(--color-text-base)]',
          'placeholder:text-[var(--color-text-subtle)]',
          'text-sm',
        )}
      />

      {showClear && value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={t('common.clearSearch', 'Clear search')}
          className={clsx(
            'flex-shrink-0',
            'p-1.5',
            'rounded-lg',
            'text-[var(--color-text-muted)]',
            'hover:text-[var(--color-text-base)]',
            'hover:bg-[var(--color-bg-hover)]',
            'active:bg-[var(--color-bg-selected)]',
            'transition-colors duration-150',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-secondary)]/30',
          )}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
