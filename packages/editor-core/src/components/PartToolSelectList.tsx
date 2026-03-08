import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Package, Wrench } from 'lucide-react';

export interface PartToolSelectItem {
  id: string;
  name: string;
  partNumber: string | null;
  type: 'part' | 'tool';
  iconId: string | null;
}

/** Convert PartToolRow[] to PartToolSelectItem[] for use in selection UIs. */
export function toPartToolSelectItems(
  rows: ReadonlyArray<{ id: string; name: string; partNumber?: string | null; type?: string; iconId?: string | null }>,
): PartToolSelectItem[] {
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    partNumber: p.partNumber ?? null,
    type: p.type === 'Tool' ? 'tool' : 'part',
    iconId: p.iconId ?? null,
  }));
}

export interface PartToolSelectListProps {
  items: PartToolSelectItem[];
  onSelect: (item: PartToolSelectItem) => void;
  getPreviewUrl?: (item: PartToolSelectItem) => string | null;
  emptyMessage?: string;
}

type SortField = 'type' | 'name' | 'partNumber';
type SortDir = 'asc' | 'desc';

/** Read-only selectable table list of part tools, matching the PartToolTable visual style. */
export function PartToolSelectList({ items, onSelect, getPreviewUrl, emptyMessage }: PartToolSelectListProps) {
  const { t } = useTranslation();
  const [sortField, setSortField] = useState<SortField | null>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSortClick = (field: SortField) => {
    if (sortField !== field) {
      setSortField(field);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      setSortField(null);
      setSortDir('asc');
    }
  };

  const sortedItems = useMemo(() => {
    if (!sortField) return items;

    return [...items].sort((a, b) => {
      const aVal = (a[sortField] ?? '').toLowerCase();
      const bVal = (b[sortField] ?? '').toLowerCase();
      if (!aVal && bVal) return 1;
      if (aVal && !bVal) return -1;
      const cmp = aVal.localeCompare(bVal);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [items, sortField, sortDir]);

  if (items.length === 0) {
    return (
      <p className="text-xs text-[var(--color-text-subtle)] text-center py-4">
        {emptyMessage ?? t('common.noResults')}
      </p>
    );
  }

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    return <span className="ml-1">{sortDir === 'asc' ? '▲' : '▼'}</span>;
  };

  const thClickable = 'cursor-pointer select-none hover:text-[var(--color-text-base)] transition-colors';

  return (
    <table className="w-full text-base border-collapse table-fixed">
      <thead>
        <tr className="text-[var(--color-text-muted)] text-left">
          <th className="px-2 py-1.5 font-medium w-[2.5rem]" />
          <th
            className={`px-2 py-1.5 font-medium w-[2.5rem] ${thClickable}`}
            onClick={() => handleSortClick('type')}
          >
            {t('editorCore.typeColumn', 'Type')}{sortIndicator('type')}
          </th>
          <th
            className={`px-2 py-1.5 font-medium ${thClickable}`}
            onClick={() => handleSortClick('name')}
          >
            {t('editorCore.partToolName', 'Name')}{sortIndicator('name')}
          </th>
          <th
            className={`px-2 py-1.5 font-medium w-[7rem] ${thClickable}`}
            onClick={() => handleSortClick('partNumber')}
          >
            {t('editorCore.partToolPartNumber', 'Part#')}{sortIndicator('partNumber')}
          </th>
        </tr>
      </thead>
      <tbody>
        {sortedItems.map((item) => {
          const isTool = item.type === 'tool';
          const previewUrl = getPreviewUrl?.(item) ?? null;
          return (
            <tr
              key={item.id}
              className="hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer"
              onClick={() => onSelect(item)}
            >
              {/* Thumbnail */}
              <td className="px-2 py-1.5">
                <div className="h-6 w-6 rounded overflow-hidden flex items-center justify-center bg-[var(--color-bg-hover)]">
                  {previewUrl ? (
                    <img src={previewUrl} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
                  ) : isTool ? (
                    <Wrench className="h-3 w-3 text-[var(--color-element-tool)]" />
                  ) : (
                    <Package className="h-3 w-3 text-[var(--color-element-part)]" />
                  )}
                </div>
              </td>

              {/* Type icon */}
              <td className="px-2 py-1.5">
                {isTool
                  ? <Wrench className="h-3 w-3 text-[var(--color-element-tool)]" />
                  : <Package className="h-3 w-3 text-[var(--color-element-part)]" />}
              </td>

              {/* Name */}
              <td className="px-2 py-1.5 truncate text-[var(--color-text-base)]">
                {item.name}
              </td>

              {/* Part number */}
              <td className="px-2 py-1.5 text-[var(--color-text-muted)] font-mono text-xs truncate">
                {item.partNumber ?? ''}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
