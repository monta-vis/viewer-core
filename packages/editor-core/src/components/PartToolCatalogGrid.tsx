import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SearchInput, fuzzySearch } from '@monta-vis/viewer-core';

/** Resolved/localized icon item for display (parallel to SafetyIconItem). */
export interface PartToolIconItem {
  id: string;
  filename: string;
  category: string;
  label: string;
  tags: string[];
  itemType: 'Part' | 'Tool';
  matchTerms?: string[];
  catalogName?: string;
  catalogDirName?: string;
}

export interface PartToolCatalogGridProps {
  items: PartToolIconItem[];
  getIconUrl: (item: PartToolIconItem) => string;
  selectedId: string | null;
  onSelect: (item: PartToolIconItem) => void;
}

export function PartToolCatalogGrid({
  items,
  getIconUrl,
  selectedId,
  onSelect,
}: PartToolCatalogGridProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string | null>(null);

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    return fuzzySearch(
      items,
      search,
      (item) => [item.label, item.filename, ...item.tags],
    ).map((m) => m.item);
  }, [items, search]);

  // Unique categories from filtered items (preserve order of appearance)
  const categories = useMemo(() => {
    const seen = new Set<string>();
    const cats: string[] = [];
    for (const item of filtered) {
      if (!seen.has(item.category)) {
        seen.add(item.category);
        cats.push(item.category);
      }
    }
    return cats;
  }, [filtered]);

  // Resolve active tab
  const currentTab = activeTab && categories.includes(activeTab)
    ? activeTab
    : categories[0] ?? null;

  // Items for active tab
  const tabItems = useMemo(
    () => (currentTab ? filtered.filter((i) => i.category === currentTab) : []),
    [filtered, currentTab],
  );

  return (
    <div className="flex flex-col gap-2">
      {/* Search */}
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder={t('editorCore.searchCatalog', 'Search catalog...')}
        aria-label={t('editorCore.searchCatalog', 'Search catalog...')}
      />

      {/* Category tabs */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {categories.map((category) => {
            const isActive = category === currentTab;
            return (
              <button
                key={category}
                onClick={() => setActiveTab(category)}
                aria-label={category}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)]'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      )}

      {/* Icon grid */}
      <div className="max-h-72 overflow-y-auto pr-1">
        {tabItems.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)] text-center py-4">
            {t('editorCore.noCatalogResults', 'No catalog items found')}
          </p>
        )}

        <div className="grid grid-cols-8 gap-1.5">
          {tabItems.map((item) => {
            const isSelected = item.id === selectedId;
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                title={item.label}
                aria-label={item.label}
                className={`relative flex flex-col items-center gap-0.5 rounded-lg border-2 p-1.5 transition-all hover:scale-105 ${
                  isSelected
                    ? 'border-[var(--color-primary)] bg-blue-100 dark:bg-blue-900/40 ring-2 ring-[var(--color-primary)]'
                    : 'border-transparent hover:border-[var(--color-border)]'
                }`}
              >
                <div className="w-full aspect-square flex items-center justify-center">
                  <img
                    src={getIconUrl(item)}
                    alt={item.label}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </div>
                <span className="text-[0.625rem] leading-tight text-[var(--color-text-muted)] truncate w-full text-center">
                  {item.label}
                </span>
                {/* Type badge */}
                <span className={`absolute top-0.5 right-0.5 text-[0.5rem] font-bold px-1 rounded ${
                  item.itemType === 'Tool'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                }`}>
                  {item.itemType === 'Tool' ? 'T' : 'P'}
                </span>
                {isSelected && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 6l3 3 5-5" />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
