import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import {
  getCategoryPriority,
  getCategoryColor,
  SAFETY_ICON_CATEGORIES,
} from '@monta-vis/viewer-core';

export interface SafetyIconItem {
  id: string;
  filename: string;
  category: string;
  label: string;
}

export interface SafetyIconPickerProps {
  icons: SafetyIconItem[];
  getIconUrl: (icon: SafetyIconItem) => string;
  selectedIconId: string | null;
  onSelect: (icon: SafetyIconItem) => void;
}

export function SafetyIconPicker({
  icons,
  getIconUrl,
  selectedIconId,
  onSelect,
}: SafetyIconPickerProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string | null>(null);

  // Filter icons by search term
  const filtered = useMemo(() => {
    if (!search.trim()) return icons;
    const q = search.toLowerCase();
    return icons.filter(
      (icon) =>
        icon.label.toLowerCase().includes(q) ||
        icon.filename.toLowerCase().includes(q),
    );
  }, [icons, search]);

  // Get sorted categories from filtered icons
  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const icon of filtered) cats.add(icon.category);
    return [...cats].sort(
      (a, b) => getCategoryPriority(a) - getCategoryPriority(b),
    );
  }, [filtered]);

  // Auto-select first category when categories change
  const currentTab = activeTab && categories.includes(activeTab)
    ? activeTab
    : categories[0] ?? null;

  // Icons for the active tab
  const tabIcons = useMemo(
    () => (currentTab ? filtered.filter((i) => i.category === currentTab) : []),
    [filtered, currentTab],
  );

  return (
    <div className="flex flex-col gap-2">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('editorCore.searchIcons', 'Search icons...')}
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-base)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        />
      </div>

      {/* Category tabs */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {categories.map((category) => {
            const catConfig = SAFETY_ICON_CATEGORIES[category as keyof typeof SAFETY_ICON_CATEGORIES];
            const label = catConfig ? t(catConfig.label, category) : category;
            const isActive = category === currentTab;

            return (
              <button
                key={category}
                onClick={() => setActiveTab(category)}
                aria-label={label}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)]'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: getCategoryColor(category) }}
                />
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Icon grid */}
      <div className="h-72 overflow-y-auto pr-1">
        {tabIcons.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)] text-center py-4">
            {t('editorCore.noIconsFound', 'No icons found')}
          </p>
        )}

        <div className="grid grid-cols-10 gap-1">
          {tabIcons.map((icon) => {
            const isSelected = icon.id === selectedIconId;
            return (
              <button
                key={icon.id}
                onClick={() => onSelect(icon)}
                title={icon.label}
                aria-label={icon.label}
                className={`relative aspect-square rounded-lg border-2 p-1 transition-all hover:scale-105 ${
                  isSelected
                    ? 'border-[var(--color-primary)] bg-blue-100 dark:bg-blue-900/40 ring-2 ring-[var(--color-primary)]'
                    : 'border-transparent hover:border-[var(--color-border)]'
                }`}
              >
                <img
                  src={getIconUrl(icon)}
                  alt={icon.label}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
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
