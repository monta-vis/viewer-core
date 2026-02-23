import { clsx } from 'clsx';
import { DashboardSearchBar } from './DashboardSearchBar';
import { DashboardSortControl, type SortOption, type SortDirection } from './DashboardSortControl';

interface DashboardToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: SortOption;
  sortDirection: SortDirection;
  onSortChange: (sortBy: SortOption, direction: SortDirection) => void;
  className?: string;
}

export function DashboardToolbar({
  searchQuery,
  onSearchChange,
  sortBy,
  sortDirection,
  onSortChange,
  className,
}: DashboardToolbarProps) {
  return (
    <div className={clsx('flex flex-col sm:flex-row items-stretch sm:items-center gap-3', className)}>
      <div className="flex-1 min-w-0">
        <DashboardSearchBar value={searchQuery} onChange={onSearchChange} />
      </div>

      <DashboardSortControl
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSortChange={onSortChange}
      />
    </div>
  );
}
