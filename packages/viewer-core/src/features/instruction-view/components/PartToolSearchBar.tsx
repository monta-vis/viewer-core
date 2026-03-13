import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { PartIcon, ToolIcon } from '@/lib/icons';
import { clsx } from 'clsx';

import type { PartToolRow } from '@/features/instruction';
import { SearchInput } from '@/components/ui';
import { fuzzySearch } from '@/lib/fuzzySearch';

interface PartToolSearchBarProps {
  partTools: PartToolRow[];
  selectedPartTool: PartToolRow | null;
  onSelect: (partToolId: string) => void;
  onClear: () => void;
}

const MAX_RESULTS = 6;

function getSearchFields(pt: PartToolRow): string[] {
  return [pt.name, pt.position ?? '', pt.partNumber ?? ''];
}

export function PartToolSearchBar({ partTools, selectedPartTool, onSelect, onClear }: PartToolSearchBarProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => query.trim()
    ? fuzzySearch(partTools, query, getSearchFields).slice(0, MAX_RESULTS)
    : partTools.map((item) => ({ item, score: 0 })),
  [query, partTools]);

  const handleSelect = useCallback((partToolId: string) => {
    setQuery('');
    setIsOpen(false);
    setActiveIndex(-1);
    onSelect(partToolId);
  }, [onSelect]);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    setIsOpen(true);
    setActiveIndex(-1);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0 && results[activeIndex]) {
      e.preventDefault();
      handleSelect(results[activeIndex].item.id);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }, [isOpen, activeIndex, results, handleSelect]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter mode: show chip
  if (selectedPartTool) {
    const TypeIcon = selectedPartTool.type === 'Part' ? PartIcon : ToolIcon;
    return (
      <div className="flex items-center gap-2 h-11 px-4 bg-[var(--color-bg-surface)] rounded-xl shadow-sm shadow-black/8">
        <TypeIcon className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0" />
        <span className="flex-1 min-w-0 text-sm font-medium text-[var(--color-text-base)] truncate">
          {selectedPartTool.name}
        </span>
        {selectedPartTool.position && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] flex-shrink-0">
            {selectedPartTool.position}
          </span>
        )}
        <button
          type="button"
          onClick={onClear}
          aria-label={t('instructionView.clearPartToolFilter', 'Clear filter')}
          className={clsx(
            'flex-shrink-0 p-1.5 rounded-lg',
            'text-[var(--color-text-muted)] hover:text-[var(--color-text-base)]',
            'hover:bg-[var(--color-bg-hover)] active:bg-[var(--color-bg-selected)]',
            'transition-colors duration-150',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-secondary)]/30',
          )}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Search mode
  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      <SearchInput
        value={query}
        onChange={handleQueryChange}
        onFocus={() => setIsOpen(true)}
        placeholder={t('instructionView.searchPartsTools', 'Search parts & tools...')}
        aria-label={t('instructionView.filterByPartTool', 'Filter by part or tool')}
      />

      {isOpen && (
        <div role="listbox" className="absolute top-full left-0 right-0 z-20 mt-1 bg-[var(--color-bg-elevated)] rounded-lg shadow-lg border border-[var(--color-border-base)] overflow-hidden max-h-[18rem] overflow-y-auto scrollbar-subtle">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-[var(--color-text-muted)]">
              {t('instructionView.noMatchingPartsTools', 'No matching parts or tools')}
            </p>
          ) : (
            results.map((match, index) => {
              const pt = match.item;
              const TypeIcon = pt.type === 'Part' ? PartIcon : ToolIcon;
              return (
                <button
                  key={pt.id}
                  role="option"
                  aria-selected={index === activeIndex}
                  type="button"
                  onClick={() => handleSelect(pt.id)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left',
                    'transition-colors duration-100',
                    index === activeIndex
                      ? 'bg-[var(--color-bg-selected)]'
                      : 'hover:bg-[var(--color-bg-hover)]',
                  )}
                >
                  <TypeIcon className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0" />
                  <span className="flex-1 min-w-0 text-sm font-medium text-[var(--color-text-base)] truncate">
                    {pt.name}
                  </span>
                  {pt.position && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] flex-shrink-0">
                      {pt.position}
                    </span>
                  )}
                  {pt.partNumber && (
                    <span className="text-xs text-[var(--color-text-subtle)] flex-shrink-0">
                      {pt.partNumber}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
