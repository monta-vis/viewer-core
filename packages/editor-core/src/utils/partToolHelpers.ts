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

/** Sort enriched substep-partTool rows by `order` ascending (returns new array). */
export function sortSubstepPartTools(
  partTools: readonly EnrichedSubstepPartTool[],
): EnrichedSubstepPartTool[] {
  return [...partTools].sort((a, b) => a.order - b.order);
}
