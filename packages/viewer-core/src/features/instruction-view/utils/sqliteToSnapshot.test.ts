import { describe, it, expect } from 'vitest';
import { sqliteToSnapshot } from './sqliteToSnapshot';

/** Minimal ElectronProjectData with all required fields. */
function makeProjectData(overrides: Record<string, unknown> = {}) {
  return {
    instruction: {
      id: 'instr-1',
      name: 'Test Instruction',
      description: null,
      revision: 1,
      cover_image_area_id: null,
      folderName: 'test-folder',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
    assemblies: [],
    steps: [],
    substeps: [],
    videos: [],
    videoSections: [],
    videoFrameAreas: [],
    viewportKeyframes: [],
    drawings: [],
    notes: [],
    partTools: [],
    substepDescriptions: [],
    substepNotes: [],
    substepPartTools: [],
    substepImages: [],
    substepVideoSections: [],
    partToolVideoFrameAreas: [],
    branding: [],
    ...overrides,
  };
}

describe('sqliteToSnapshot – assemblies', () => {
  it('maps assemblies from data into snapshot.assemblies record', () => {
    const data = makeProjectData({
      assemblies: [
        { id: 'asm-1', instruction_id: 'instr-1', title: 'Assembly A', description: null, order: 0 },
        { id: 'asm-2', instruction_id: 'instr-1', title: 'Assembly B', description: 'desc', order: 1 },
      ],
    });

    const snapshot = sqliteToSnapshot(data as never);
    expect(snapshot.assemblies).toBeDefined();
    expect(snapshot.assemblies!['asm-1']).toEqual({
      id: 'asm-1',
      instruction_id: 'instr-1',
      title: 'Assembly A',
      description: null,
      order: 0,
    });
    expect(snapshot.assemblies!['asm-2']).toEqual({
      id: 'asm-2',
      instruction_id: 'instr-1',
      title: 'Assembly B',
      description: 'desc',
      order: 1,
    });
  });

  it('passes assembly_id through on steps', () => {
    const data = makeProjectData({
      assemblies: [
        { id: 'asm-1', instruction_id: 'instr-1', title: 'Assembly A', description: null, order: 0 },
      ],
      steps: [
        { id: 'step-1', instruction_id: 'instr-1', step_number: 1, title: 'Step 1', assembly_id: 'asm-1' },
        { id: 'step-2', instruction_id: 'instr-1', step_number: 2, title: 'Step 2', assembly_id: null },
      ],
    });

    const snapshot = sqliteToSnapshot(data as never);
    expect(snapshot.steps['step-1'].assembly_id).toBe('asm-1');
    expect(snapshot.steps['step-2'].assembly_id).toBeNull();
  });

  it('defaults assembly_id to null when not present on step rows', () => {
    const data = makeProjectData({
      steps: [
        { id: 'step-1', instruction_id: 'instr-1', step_number: 1, title: 'Step 1' },
      ],
    });

    const snapshot = sqliteToSnapshot(data as never);
    expect(snapshot.steps['step-1'].assembly_id).toBeNull();
  });

  it('produces empty assemblies record when no assemblies exist', () => {
    const data = makeProjectData();
    const snapshot = sqliteToSnapshot(data as never);
    expect(snapshot.assemblies).toEqual({});
  });
});
