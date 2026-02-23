import { SearchX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui';

interface EmptySearchStateProps {
  query: string;
  onClear: () => void;
}

export function EmptySearchState({ query, onClear }: EmptySearchStateProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 rounded-full bg-[var(--color-surface)]/40 p-6 backdrop-blur-md">
        <SearchX className="w-12 h-12 text-[var(--color-text-muted)]" />
      </div>

      <h3 className="mb-2 text-lg font-semibold text-[var(--color-text-base)]">
        {t('dashboard.noResultsForSearch', { query, defaultValue: `No results for "${query}"` })}
      </h3>

      <p className="mb-6 text-sm text-[var(--color-text-muted)] max-w-sm">
        {t(
          'dashboard.tryDifferentSearch',
          'Try a different search or clear the search filter.'
        )}
      </p>

      <Button onClick={onClear} variant="secondary">
        {t('dashboard.clearSearch', 'Clear search')}
      </Button>
    </div>
  );
}
