import type { PartToolRow, EnrichedSubstepPartTool } from '@monta-vis/viewer-core';

/** Create a new PartToolRow with sensible defaults. */
export function createDefaultPartTool(versionId: string, instructionId: string): PartToolRow {
  return {
    id: crypto.randomUUID(),
    versionId,
    instructionId,
    previewImageId: null,
    name: '',
    type: 'Part',
    partNumber: null,
    amount: 1,
    description: null,
    unit: null,
    material: null,
    dimension: null,
    iconId: null,
  };
}

/** Returns true when the name contains at least one non-whitespace character. */
export function isPartToolNameValid(name: string): boolean {
  return name.trim().length > 0;
}

/** Sort PartTools: Parts first, then Tools, alphabetical within each group. */
export function sortPartToolRows(partTools: Record<string, PartToolRow>): PartToolRow[] {
  return Object.values(partTools).sort((a, b) => {
    if (a.type !== b.type) return a.type === 'Part' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Compute how many times a PartTool is actually used across substep junctions.
 * Parts: sum all junction amounts (consumable).
 * Tools: max junction amount (reusable, not summed).
 */
export function computeUsedAmount(
  partToolId: string,
  type: 'Part' | 'Tool',
  substepPartTools: Record<string, { partToolId: string; amount: number }>,
): number {
  const junctions = Object.values(substepPartTools).filter(
    (spt) => spt.partToolId === partToolId,
  );
  if (junctions.length === 0) return 0;
  return type === 'Part'
    ? junctions.reduce((sum, j) => sum + j.amount, 0)
    : Math.max(...junctions.map((j) => j.amount));
}

/** Sort enriched substep-partTool rows by `order` ascending (returns new array). */
export function sortSubstepPartTools(
  partTools: readonly EnrichedSubstepPartTool[],
): EnrichedSubstepPartTool[] {
  return [...partTools].sort((a, b) => a.order - b.order);
}
