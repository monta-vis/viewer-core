import { useTranslation } from 'react-i18next';
import { SearchInput } from '@/components/ui/SearchInput';

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

  return (
    <SearchInput
      value={value}
      onChange={onChange}
      placeholder={placeholder ?? t('dashboard.searchPlaceholder', 'Search by name...')}
      aria-label={t('dashboard.search', 'Search')}
      className={className}
    />
  );
}
