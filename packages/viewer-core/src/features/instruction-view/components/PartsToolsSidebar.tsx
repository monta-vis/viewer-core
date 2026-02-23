import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Package, Wrench } from 'lucide-react';
import { clsx } from 'clsx';

import type { EnrichedSubstepPartTool } from '@/features/instruction';

interface PartToolWithSubstep extends EnrichedSubstepPartTool {
  substepId: string;
}

interface PartsToolsSidebarProps {
  /** All parts from all substeps of the step */
  parts: PartToolWithSubstep[];
  /** All tools from all substeps of the step */
  tools: PartToolWithSubstep[];
  /** Substep ID whose parts/tools should be highlighted */
  highlightedSubstepId?: string | null;
}

interface AggregatedItem {
  id: string;
  name: string;
  partNumber: string | null;
  totalAmount: number;
  substepIds: Set<string>;
}

export function PartsToolsSidebar({ parts, tools, highlightedSubstepId }: PartsToolsSidebarProps) {
  const { t } = useTranslation();

  // Aggregate parts by partToolId and sum amounts
  const aggregatedParts = useMemo(() => {
    const map = new Map<string, AggregatedItem>();
    for (const p of parts) {
      const existing = map.get(p.partToolId);
      if (existing) {
        existing.totalAmount += p.amount;
        existing.substepIds.add(p.substepId);
      } else {
        map.set(p.partToolId, {
          id: p.partToolId,
          name: p.partTool.name,
          partNumber: p.partTool.partNumber,
          totalAmount: p.amount,
          substepIds: new Set([p.substepId]),
        });
      }
    }
    return Array.from(map.values());
  }, [parts]);

  // Aggregate tools by partToolId
  const aggregatedTools = useMemo(() => {
    const map = new Map<string, AggregatedItem>();
    for (const tool of tools) {
      const existing = map.get(tool.partToolId);
      if (existing) {
        existing.totalAmount += tool.amount;
        existing.substepIds.add(tool.substepId);
      } else {
        map.set(tool.partToolId, {
          id: tool.partToolId,
          name: tool.partTool.name,
          partNumber: tool.partTool.partNumber,
          totalAmount: tool.amount,
          substepIds: new Set([tool.substepId]),
        });
      }
    }
    return Array.from(map.values());
  }, [tools]);

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg-elevated)] overflow-hidden">
      {/* Parts section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 shadow-sm">
          <Package className="h-4 w-4 text-[var(--color-secondary)]" />
          <span className="text-sm font-medium text-[var(--color-text-base)]">
            {t('instructionView.parts', 'Parts')}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-subtle">
          {aggregatedParts.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-[var(--color-text-muted)]">
              {t('instructionView.noParts', 'No parts')}
            </div>
          ) : (
            <ul className="py-1">
              {aggregatedParts.map((item) => {
                const isHighlighted = highlightedSubstepId && item.substepIds.has(highlightedSubstepId);
                return (
                  <li
                    key={item.id}
                    className={clsx(
                      'flex items-center gap-2 px-3 py-1.5 rounded-md mx-1 transition-colors',
                      'text-sm',
                      isHighlighted
                        ? 'bg-[var(--color-secondary)]/20 text-[var(--color-text-base)]'
                        : 'text-[var(--color-text-muted)]'
                    )}
                  >
                    <span
                      className={clsx(
                        'flex-shrink-0 w-5 h-5 rounded flex items-center justify-center',
                        'text-xs font-medium',
                        isHighlighted
                          ? 'bg-[var(--color-secondary)] text-[var(--color-bg-base)]'
                          : 'bg-[var(--color-bg-base)] text-[var(--color-text-muted)]'
                      )}
                    >
                      {item.totalAmount}
                    </span>
                    <span className="truncate">{item.name}</span>
                    {item.partNumber && (
                      <span className="text-xs text-[var(--color-text-muted)] truncate">
                        ({item.partNumber})
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Tools section */}
      <div className="flex-1 flex flex-col min-h-0 shadow-[0_-1px_2px_rgba(0,0,0,0.1)]">
        <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 shadow-sm">
          <Wrench className="h-4 w-4 text-[var(--color-secondary)]" />
          <span className="text-sm font-medium text-[var(--color-text-base)]">
            {t('instructionView.tools', 'Tools')}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-subtle">
          {aggregatedTools.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-[var(--color-text-muted)]">
              {t('instructionView.noTools', 'No tools')}
            </div>
          ) : (
            <ul className="py-1">
              {aggregatedTools.map((item) => {
                const isHighlighted = highlightedSubstepId && item.substepIds.has(highlightedSubstepId);
                return (
                  <li
                    key={item.id}
                    className={clsx(
                      'flex items-center gap-2 px-3 py-1.5 rounded-md mx-1 transition-colors',
                      'text-sm',
                      isHighlighted
                        ? 'bg-[var(--color-secondary)]/20 text-[var(--color-text-base)]'
                        : 'text-[var(--color-text-muted)]'
                    )}
                  >
                    <span className="truncate">{item.name}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
