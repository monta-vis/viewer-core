import { Search, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

interface DashboardSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function DashboardSearchBar({
  value,
  onChange,
  placeholder,
  className,
}: DashboardSearchBarProps) {
  const { t } = useTranslation();

  const handleClear = () => {
    onChange('');
  };

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
        className
      )}
    >
      <Search className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0" />

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? t('dashboard.searchPlaceholder', 'Search by name...')}
        aria-label={t('dashboard.search', 'Search')}
        className={clsx(
          'flex-1 min-w-0',
          'bg-transparent',
          'border-none',
          'outline-none',
          'text-[var(--color-text-base)]',
          'placeholder:text-[var(--color-text-subtle)]',
          'text-sm'
        )}
      />

      {value && (
        <button
          type="button"
          onClick={handleClear}
          aria-label={t('dashboard.clearSearch', 'Clear search')}
          className={clsx(
            'flex-shrink-0',
            'p-1.5',
            'rounded-lg',
            'text-[var(--color-text-muted)]',
            'hover:text-[var(--color-text-base)]',
            'hover:bg-[var(--color-bg-hover)]',
            'active:bg-[var(--color-bg-selected)]',
            'transition-colors duration-150',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-secondary)]/30'
          )}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
