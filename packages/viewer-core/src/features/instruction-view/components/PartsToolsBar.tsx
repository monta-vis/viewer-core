import { useMemo } from 'react';

import type { EnrichedSubstepPartTool } from '@/features/instruction';

import { PartToolCard } from './PartToolCard';

interface PartToolWithSubstep extends EnrichedSubstepPartTool {
  substepId: string;
}

interface PartsToolsBarProps {
  /** All parts from all substeps of the step */
  parts: PartToolWithSubstep[];
  /** All tools from all substeps of the step */
  tools: PartToolWithSubstep[];
  /** Substep ID whose parts/tools should be highlighted */
  highlightedSubstepId?: string | null;
  /** Get preview image URL for a partToolId */
  getPreviewImageUrl?: (partToolId: string) => string | null;
}

interface AggregatedItem {
  id: string;
  name: string;
  partNumber: string | null;
  unit: string | null;
  totalAmount: number;
  amountsPerSubstep: Map<string, number>;
}

export function PartsToolsBar({
  parts,
  tools,
  highlightedSubstepId,
  getPreviewImageUrl,
}: PartsToolsBarProps) {
  // Aggregate parts by partToolId and track amounts per substep
  const aggregatedParts = useMemo(() => {
    const map = new Map<string, AggregatedItem>();
    for (const p of parts) {
      const existing = map.get(p.partToolId);
      if (existing) {
        existing.totalAmount += p.amount;
        const currentAmount = existing.amountsPerSubstep.get(p.substepId) ?? 0;
        existing.amountsPerSubstep.set(p.substepId, currentAmount + p.amount);
      } else {
        map.set(p.partToolId, {
          id: p.partToolId,
          name: p.partTool.name,
          partNumber: p.partTool.partNumber,
          unit: p.partTool.unit,
          totalAmount: p.amount,
          amountsPerSubstep: new Map([[p.substepId, p.amount]]),
        });
      }
    }
    return Array.from(map.values());
  }, [parts]);

  // Aggregate tools by partToolId (tools are reusable — use master partTool.amount)
  const aggregatedTools = useMemo(() => {
    const map = new Map<string, AggregatedItem>();
    for (const tool of tools) {
      const existing = map.get(tool.partToolId);
      if (existing) {
        // Track substep usage but don't accumulate totalAmount (tools are reused)
        existing.amountsPerSubstep.set(tool.substepId, tool.amount);
      } else {
        map.set(tool.partToolId, {
          id: tool.partToolId,
          name: tool.partTool.name,
          partNumber: tool.partTool.partNumber,
          unit: tool.partTool.unit,
          totalAmount: tool.partTool.amount || 1,
          amountsPerSubstep: new Map([[tool.substepId, tool.amount]]),
        });
      }
    }
    return Array.from(map.values());
  }, [tools]);

  const hasItems = aggregatedParts.length > 0 || aggregatedTools.length > 0;

  if (!hasItems) {
    return null;
  }

  return (
    <div className="sticky top-0 z-10 bg-[var(--color-bg-elevated)] shadow-sm">
      <div className="px-4 pt-4 pb-3">
        <div className="flex flex-wrap gap-3">
          {/* Parts cards */}
          {aggregatedParts.map((item) => (
            <PartToolCard
              key={item.id}
              name={item.name}
              partNumber={item.partNumber}
              type="part"
              totalAmount={item.totalAmount}
              unit={item.unit}
              amountsPerSubstep={item.amountsPerSubstep}
              highlightedSubstepId={highlightedSubstepId}
              previewImageUrl={getPreviewImageUrl?.(item.id)}
            />
          ))}

          {/* Tools cards */}
          {aggregatedTools.map((item) => (
            <PartToolCard
              key={item.id}
              name={item.name}
              type="tool"
              totalAmount={item.totalAmount}
              unit={item.unit}
              amountsPerSubstep={item.amountsPerSubstep}
              highlightedSubstepId={highlightedSubstepId}
              previewImageUrl={getPreviewImageUrl?.(item.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
