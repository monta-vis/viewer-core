import { useMemo } from 'react';
import type { PartToolRow, Step, Substep, SubstepPartToolRow } from '@/features/instruction';
import { useViewerData } from '../context';
import { sortedValues, byStepNumber } from '@/lib/sortedValues';

export interface AggregatedPartTool {
  partTool: PartToolRow;
  totalAmount: number;
  /** Which step numbers use this part/tool */
  usedInSteps: number[];
  /** Amount used per substep: substepId → amount */
  amountsPerSubstep: Map<string, number>;
}

export interface FilteredPartsToolsResult {
  parts: AggregatedPartTool[];
  tools: AggregatedPartTool[];
  totalParts: number;
  totalTools: number;
}

/**
 * Compute totalAmount from junction amounts, falling back to partTool.amount, then 1.
 * Used for Parts (consumable — sum across substeps).
 */
export function computeTotalAmount(
  substepAmounts: Map<string, number> | undefined,
  partToolAmount: number,
): number {
  if (substepAmounts && substepAmounts.size > 0) {
    const sum = Array.from(substepAmounts.values()).reduce((a, b) => a + b, 0);
    if (sum > 0) return sum;
  }
  return partToolAmount || 1;
}

/**
 * Compute totalAmount for Tools (reusable — use master partTool.amount, ignore junctions).
 */
export function computeToolAmount(partToolAmount: number): number {
  return partToolAmount || 1;
}

/**
 * Build aggregation maps: which steps use each partTool, and amounts per substep.
 * Multiplies Part amounts by substep repeatCount (Tools are reusable, not multiplied).
 */
export function buildPartToolAggregation(
  steps: Record<string, Step>,
  substeps: Record<string, Substep>,
  substepPartTools: Record<string, SubstepPartToolRow>,
  partTools: Record<string, PartToolRow>,
): {
  partToolSteps: Map<string, Set<number>>;
  partToolSubstepAmounts: Map<string, Map<string, number>>;
} {
  const partToolSteps = new Map<string, Set<number>>();
  const partToolSubstepAmounts = new Map<string, Map<string, number>>();

  const sortedSteps = sortedValues(steps, byStepNumber);

  for (const step of sortedSteps) {
    for (const substepId of step.substepIds) {
      const substep = substeps[substepId];
      if (!substep) continue;

      // Direct partTool junctions (multiply Parts by substep repeatCount)
      const repeatMultiplier = substep.repeatCount > 1 ? substep.repeatCount : 1;
      for (const rowId of substep.partToolRowIds) {
        const row = substepPartTools[rowId];
        if (!row) continue;

        const pt = partTools[row.partToolId];
        const effectiveAmount = pt?.type === 'Part' ? row.amount * repeatMultiplier : row.amount;

        if (!partToolSteps.has(row.partToolId)) partToolSteps.set(row.partToolId, new Set());
        partToolSteps.get(row.partToolId)!.add(step.stepNumber);

        if (!partToolSubstepAmounts.has(row.partToolId)) partToolSubstepAmounts.set(row.partToolId, new Map());
        partToolSubstepAmounts.get(row.partToolId)!.set(substepId, effectiveAmount);
      }
    }
  }

  return { partToolSteps, partToolSubstepAmounts };
}

/**
 * useFilteredPartsTools - Hook to get parts/tools filtered by step range
 *
 * Shows ALL PartTools by default. When stepRange is provided and not covering
 * all steps, filters to only show PartTools used in those steps.
 *
 * @param stepRange - [startStep, endStep] to filter by
 * @param maxSteps - Maximum step number (to detect if full range is selected)
 * @returns Object with filtered parts and tools arrays
 */
export function useFilteredPartsTools(
  stepRange: [number, number],
  maxSteps: number
): FilteredPartsToolsResult {
  const data = useViewerData();

  return useMemo(() => {
    if (!data) {
      return { parts: [], tools: [], totalParts: 0, totalTools: 0 };
    }

    const [startStep, endStep] = stepRange;
    const isFullRange = startStep === 1 && endStep >= maxSteps;

    const { partToolSteps, partToolSubstepAmounts } = buildPartToolAggregation(
      data.steps, data.substeps, data.substepPartTools, data.partTools,
    );

    // Get ALL PartTools
    const allPartTools = Object.values(data.partTools);

    // Filter parts/tools by step range (exclude unreferenced in both paths)
    const filteredPartTools = isFullRange
      ? allPartTools.filter((pt) => partToolSteps.has(pt.id))
      : allPartTools.filter((pt) => {
          const usedInSteps = partToolSteps.get(pt.id);
          if (!usedInSteps) return false;

          for (let step = startStep; step <= endStep; step++) {
            if (usedInSteps.has(step)) return true;
          }
          return false;
        });

    // Separate into parts and tools with step info
    const parts: AggregatedPartTool[] = filteredPartTools
      .filter((pt) => pt.type === 'Part')
      .map((partTool) => ({
        partTool,
        totalAmount: computeTotalAmount(partToolSubstepAmounts.get(partTool.id), partTool.amount),
        usedInSteps: Array.from(partToolSteps.get(partTool.id) ?? []).sort((a, b) => a - b),
        amountsPerSubstep: partToolSubstepAmounts.get(partTool.id) ?? new Map(),
      }))
      .sort((a, b) => a.partTool.name.localeCompare(b.partTool.name));

    const tools: AggregatedPartTool[] = filteredPartTools
      .filter((pt) => pt.type === 'Tool')
      .map((partTool) => ({
        partTool,
        totalAmount: computeToolAmount(partTool.amount),
        usedInSteps: Array.from(partToolSteps.get(partTool.id) ?? []).sort((a, b) => a - b),
        amountsPerSubstep: partToolSubstepAmounts.get(partTool.id) ?? new Map(),
      }))
      .sort((a, b) => a.partTool.name.localeCompare(b.partTool.name));

    return {
      parts,
      tools,
      totalParts: parts.length,
      totalTools: tools.length,
    };
  }, [data, stepRange, maxSteps]);
}

/**
 * useAllPartsTools - Hook to get all parts/tools without filtering
 *
 * Returns total counts for display in overview card.
 */
export function useAllPartsTools(): { totalParts: number; totalTools: number } {
  const data = useViewerData();

  return useMemo(() => {
    if (!data) {
      return { totalParts: 0, totalTools: 0 };
    }

    const partTools = Object.values(data.partTools);
    const totalParts = partTools.filter((pt) => pt.type === 'Part').length;
    const totalTools = partTools.filter((pt) => pt.type === 'Tool').length;

    return { totalParts, totalTools };
  }, [data]);
}

/**
 * useMaxStepNumber - Hook to get the maximum step number
 */
export function useMaxStepNumber(): number {
  const data = useViewerData();

  return useMemo(() => {
    if (!data?.steps) return 1;

    const steps = Object.values(data.steps);
    if (steps.length === 0) return 1;

    return Math.max(...steps.map((s) => s.stepNumber));
  }, [data?.steps]);
}
