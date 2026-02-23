import { ArrowUp, ArrowDown, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

export type SortOption = 'name' | 'created_at' | 'updated_at' | 'status';
export type SortDirection = 'asc' | 'desc';

interface DashboardSortControlProps {
  sortBy: SortOption;
  sortDirection: SortDirection;
  onSortChange: (sortBy: SortOption, direction: SortDirection) => void;
  className?: string;
}

export function DashboardSortControl({
  sortBy,
  sortDirection,
  onSortChange,
  className,
}: DashboardSortControlProps) {
  const { t } = useTranslation();

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'name', label: t('dashboard.sortByName', 'Name') },
    { value: 'updated_at', label: t('dashboard.sortByModified', 'Last modified') },
    { value: 'created_at', label: t('dashboard.sortByCreated', 'Creation date') },
    { value: 'status', label: t('dashboard.sortByStatus', 'Status') },
  ];

  const handleSortByChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSortChange(e.target.value as SortOption, sortDirection);
  };

  const toggleDirection = () => {
    const newDirection: SortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    onSortChange(sortBy, newDirection);
  };

  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <div className="relative">
        <select
          value={sortBy}
          onChange={handleSortByChange}
          aria-label={t('dashboard.sort', 'Sort')}
          className={clsx(
            'h-11 pl-3 pr-9 appearance-none',
            'bg-[var(--color-bg-surface)]',
            'rounded-xl',
            'shadow-sm shadow-black/8',
            'text-sm text-[var(--color-text-base)]',
            'focus:shadow-md focus:shadow-black/12',
            'focus:ring-2 focus:ring-[var(--color-secondary)]/20',
            'focus:outline-none',
            'hover:shadow-md hover:shadow-black/10',
            'transition-all duration-150',
            'cursor-pointer'
          )}
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none" />
      </div>

      <button
        type="button"
        onClick={toggleDirection}
        aria-label={
          sortDirection === 'asc'
            ? t('dashboard.sortAscending', 'Ascending')
            : t('dashboard.sortDescending', 'Descending')
        }
        className={clsx(
          'flex items-center justify-center',
          'w-11 h-11',
          'bg-[var(--color-bg-surface)]',
          'rounded-xl',
          'shadow-sm shadow-black/8',
          'text-[var(--color-text-base)]',
          'focus:shadow-md focus:shadow-black/12',
          'focus:ring-2 focus:ring-[var(--color-secondary)]/20',
          'focus:outline-none',
          'hover:shadow-md hover:shadow-black/10',
          'hover:bg-[var(--color-bg-hover)]',
          'active:bg-[var(--color-bg-selected)]',
          'transition-all duration-150',
          'cursor-pointer'
        )}
      >
        {sortDirection === 'asc' ? (
          <ArrowUp className="w-4 h-4" />
        ) : (
          <ArrowDown className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}
