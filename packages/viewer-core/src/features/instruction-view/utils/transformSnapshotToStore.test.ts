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
