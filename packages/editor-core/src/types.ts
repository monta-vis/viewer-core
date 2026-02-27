/**
 * Editor-only types (moved from viewer-core/instruction/types/data.ts)
 *
 * These types are only used by the editing layer and don't belong in viewer-core.
 */

import type {
  Step,
  Substep,
  SubstepImageRow,
  SubstepPartToolRow,
  SubstepNoteRow,
  SubstepDescriptionRow,
  SubstepVideoSectionRow,
  DrawingRow,
} from '@monta-vis/viewer-core';

/**
 * Callback for recording entity change events for sync.
 * Called after each mutation with entity info.
 */
export type EventRecordCallback = (
  entityType: string,
  entityId: string,
  operation: 'create' | 'update' | 'delete',
  data: Record<string, unknown>,
  changedFields?: string[]
) => void;

/**
 * Step loading state for progressive loading.
 */
export interface StepLoadingState {
  totalSteps: number;
  loadedCount: number;
  isLoadingMore: boolean;
  allLoaded: boolean;
}

/**
 * Data chunk for progressive step loading (matches StepChunkResponse from API).
 */
export interface StepChunkData {
  steps: Step[];
  substeps: Substep[];
  substepImages: SubstepImageRow[];
  substepPartTools: SubstepPartToolRow[];
  substepNotes: SubstepNoteRow[];
  substepDescriptions: SubstepDescriptionRow[];
  substepVideoSections: SubstepVideoSectionRow[];
  drawings: DrawingRow[];
  hasMore: boolean;
}
