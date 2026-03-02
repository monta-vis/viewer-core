import { describe, it, expect } from 'vitest';
import { transformSnapshotToStore } from './transformSnapshotToStore';
import type { InstructionSnapshot } from '@/types/snapshot';

/** Minimal snapshot with all required record fields empty. */
function makeEmptySnapshot(overrides: Partial<InstructionSnapshot> = {}): InstructionSnapshot {
  return {
    meta: { format_version: 1 },
    instruction: {
      id: 'instr-1',
      name: 'Test',
      description: null,
      article_number: null,
      estimated_duration: null,
      source_language: 'en',
      use_blurred: 0,
      step_ids: [],
    },
    translations: {},
    steps: {},
    substeps: {},
    videos: {},
    videoSections: {},
    videoFrameAreas: {},
    viewportKeyframes: {},
    drawings: {},
    notes: {},
    partTools: {},
    substepImages: {},
    substepVideoSections: {},
    substepPartTools: {},
    substepNotes: {},
    substepDescriptions: {},
    partToolVideoFrameAreas: {},
    ...overrides,
  } as InstructionSnapshot;
}

describe('transformSnapshotToStore – partTool previewImageId', () => {
  it('reads preview_image_id from the snapshot when present', () => {
    const snapshot = makeEmptySnapshot({
      partTools: {
        'pt-1': {
          id: 'pt-1',
          instruction_id: 'instr-1',
          name: 'Screw M4',
          part_number: null,
          type: 'Part',
          preview_image_id: 'vfa-42',
        },
      },
    });

    const result = transformSnapshotToStore(snapshot);
    expect(result.partTools['pt-1'].previewImageId).toBe('vfa-42');
  });

  it('derives previewImageId from junction table when preview_image_id is missing', () => {
    const snapshot = makeEmptySnapshot({
      partTools: {
        'pt-1': {
          id: 'pt-1',
          instruction_id: 'instr-1',
          name: 'Bolt M6',
          part_number: null,
          type: 'Part',
          // no preview_image_id
        },
      },
      partToolVideoFrameAreas: {
        'j-1': {
          id: 'j-1',
          part_tool_id: 'pt-1',
          video_frame_area_id: 'vfa-99',
          order: 0,
          is_preview_image: 1,
        },
      },
    });

    const result = transformSnapshotToStore(snapshot);
    expect(result.partTools['pt-1'].previewImageId).toBe('vfa-99');
  });

  it('keeps previewImageId null when neither snapshot field nor junction provides one', () => {
    const snapshot = makeEmptySnapshot({
      partTools: {
        'pt-1': {
          id: 'pt-1',
          instruction_id: 'instr-1',
          name: 'Washer',
          part_number: null,
          type: 'Part',
        },
      },
      partToolVideoFrameAreas: {
        'j-1': {
          id: 'j-1',
          part_tool_id: 'pt-1',
          video_frame_area_id: 'vfa-50',
          order: 0,
          is_preview_image: 0, // not a preview
        },
      },
    });

    const result = transformSnapshotToStore(snapshot);
    expect(result.partTools['pt-1'].previewImageId).toBeNull();
  });

  it('does not overwrite explicit preview_image_id with junction fallback', () => {
    const snapshot = makeEmptySnapshot({
      partTools: {
        'pt-1': {
          id: 'pt-1',
          instruction_id: 'instr-1',
          name: 'Nut M4',
          part_number: null,
          type: 'Part',
          preview_image_id: 'vfa-explicit',
        },
      },
      partToolVideoFrameAreas: {
        'j-1': {
          id: 'j-1',
          part_tool_id: 'pt-1',
          video_frame_area_id: 'vfa-junction',
          order: 0,
          is_preview_image: 1,
        },
      },
    });

    const result = transformSnapshotToStore(snapshot);
    // Explicit value wins over junction fallback
    expect(result.partTools['pt-1'].previewImageId).toBe('vfa-explicit');
  });
});

describe('transformSnapshotToStore – assemblies', () => {
  it('builds assemblies dict with stepIds from steps that reference them', () => {
    const snapshot = makeEmptySnapshot({
      assemblies: {
        'asm-1': { id: 'asm-1', instruction_id: 'instr-1', title: 'Assembly A', description: null, order: 0 },
        'asm-2': { id: 'asm-2', instruction_id: 'instr-1', title: 'Assembly B', description: null, order: 1 },
      },
      steps: {
        'step-1': { id: 'step-1', instruction_id: 'instr-1', step_number: 1, title: 'S1', substep_ids: [], assembly_id: 'asm-1' },
        'step-2': { id: 'step-2', instruction_id: 'instr-1', step_number: 2, title: 'S2', substep_ids: [], assembly_id: 'asm-1' },
        'step-3': { id: 'step-3', instruction_id: 'instr-1', step_number: 3, title: 'S3', substep_ids: [], assembly_id: 'asm-2' },
      },
    });

    const result = transformSnapshotToStore(snapshot);

    expect(result.assemblies['asm-1'].stepIds).toEqual(expect.arrayContaining(['step-1', 'step-2']));
    expect(result.assemblies['asm-1'].stepIds).toHaveLength(2);
    expect(result.assemblies['asm-2'].stepIds).toEqual(['step-3']);
    expect(result.assemblies['asm-1'].title).toBe('Assembly A');
    expect(result.assemblies['asm-1'].order).toBe(0);
  });

  it('sets assemblyId on steps from snapshot assembly_id', () => {
    const snapshot = makeEmptySnapshot({
      assemblies: {
        'asm-1': { id: 'asm-1', instruction_id: 'instr-1', title: 'Asm', description: null, order: 0 },
      },
      steps: {
        'step-1': { id: 'step-1', instruction_id: 'instr-1', step_number: 1, title: 'S1', substep_ids: [], assembly_id: 'asm-1' },
        'step-2': { id: 'step-2', instruction_id: 'instr-1', step_number: 2, title: 'S2', substep_ids: [], assembly_id: null },
      },
    });

    const result = transformSnapshotToStore(snapshot);

    expect(result.steps['step-1'].assemblyId).toBe('asm-1');
    expect(result.steps['step-2'].assemblyId).toBeNull();
  });

  it('returns empty assemblies and null assemblyId when no assemblies in snapshot', () => {
    const snapshot = makeEmptySnapshot({
      steps: {
        'step-1': { id: 'step-1', instruction_id: 'instr-1', step_number: 1, title: 'S1', substep_ids: [] },
      },
    });

    const result = transformSnapshotToStore(snapshot);

    expect(result.assemblies).toEqual({});
    expect(result.steps['step-1'].assemblyId).toBeNull();
  });

  it('includes assemblies with no steps assigned (empty stepIds)', () => {
    const snapshot = makeEmptySnapshot({
      assemblies: {
        'asm-1': { id: 'asm-1', instruction_id: 'instr-1', title: 'Empty Assembly', description: null, order: 0 },
      },
    });

    const result = transformSnapshotToStore(snapshot);

    expect(result.assemblies['asm-1']).toBeDefined();
    expect(result.assemblies['asm-1'].stepIds).toEqual([]);
    expect(result.assemblies['asm-1'].title).toBe('Empty Assembly');
  });
});
