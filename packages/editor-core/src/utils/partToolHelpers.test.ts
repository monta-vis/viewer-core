import { describe, it, expect } from 'vitest';
import {
  createDefaultPartTool,
  isPartToolNameValid,
  sortSubstepPartTools,
  sortPartToolRows,
  computeUsedAmount,
} from './partToolHelpers';
import type { EnrichedSubstepPartTool, PartToolRow } from '@monta-vis/viewer-core';

describe('createDefaultPartTool', () => {
  it('returns a PartToolRow with a UUID id', () => {
    const pt = createDefaultPartTool('v1', 'i1');
    expect(pt.id).toBeTruthy();
    expect(pt.id.length).toBeGreaterThan(8);
  });

  it('sets versionId and instructionId from arguments', () => {
    const pt = createDefaultPartTool('ver-123', 'instr-456');
    expect(pt.versionId).toBe('ver-123');
    expect(pt.instructionId).toBe('instr-456');
  });

  it('defaults to type Part with empty name', () => {
    const pt = createDefaultPartTool('v1', 'i1');
    expect(pt.type).toBe('Part');
    expect(pt.name).toBe('');
  });

  it('defaults amount to 1 and nullable fields to null', () => {
    const pt = createDefaultPartTool('v1', 'i1');
    expect(pt.amount).toBe(1);
    expect(pt.partNumber).toBeNull();
    expect(pt.description).toBeNull();
    expect(pt.unit).toBeNull();
    expect(pt.material).toBeNull();
    expect(pt.dimension).toBeNull();
    expect(pt.previewImageId).toBeNull();
    expect(pt.iconId).toBeNull();
  });

  it('generates unique ids on each call', () => {
    const a = createDefaultPartTool('v1', 'i1');
    const b = createDefaultPartTool('v1', 'i1');
    expect(a.id).not.toBe(b.id);
  });
});

describe('isPartToolNameValid', () => {
  it('returns true for non-empty trimmed string', () => {
    expect(isPartToolNameValid('Wrench')).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(isPartToolNameValid('')).toBe(false);
  });

  it('returns false for whitespace-only string', () => {
    expect(isPartToolNameValid('   ')).toBe(false);
    expect(isPartToolNameValid('\t\n')).toBe(false);
  });

  it('returns true for string with leading/trailing spaces but content', () => {
    expect(isPartToolNameValid('  Bolt  ')).toBe(true);
  });
});

describe('sortSubstepPartTools', () => {
  const makePt = (id: string, order: number): EnrichedSubstepPartTool => ({
    id,
    versionId: 'v1',
    substepId: 's1',
    partToolId: `pt-${id}`,
    amount: 1,
    order,
    partTool: {
      id: `pt-${id}`, versionId: 'v1', instructionId: 'i1', previewImageId: null,
      name: `Part ${id}`, type: 'Part', partNumber: null, amount: 1,
      description: null, unit: null, material: null, dimension: null, iconId: null,
    },
  });

  it('sorts by order ascending', () => {
    const items = [makePt('c', 3), makePt('a', 1), makePt('b', 2)];
    const sorted = sortSubstepPartTools(items);
    expect(sorted.map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });

  it('returns a new array (does not mutate input)', () => {
    const items = [makePt('b', 2), makePt('a', 1)];
    const sorted = sortSubstepPartTools(items);
    expect(sorted).not.toBe(items);
    expect(items[0].id).toBe('b'); // original unchanged
  });

  it('handles empty array', () => {
    expect(sortSubstepPartTools([])).toEqual([]);
  });
});

describe('sortPartToolRows', () => {
  const makePtRow = (id: string, name: string, type: 'Part' | 'Tool'): PartToolRow => ({
    id, versionId: 'v1', instructionId: 'i1', previewImageId: null,
    name, type, partNumber: null, amount: 1,
    description: null, unit: null, material: null, dimension: null, iconId: null,
  });

  it('sorts Parts before Tools', () => {
    const rows: Record<string, PartToolRow> = {
      t1: makePtRow('t1', 'Wrench', 'Tool'),
      p1: makePtRow('p1', 'Bolt', 'Part'),
    };
    const sorted = sortPartToolRows(rows);
    expect(sorted[0].type).toBe('Part');
    expect(sorted[1].type).toBe('Tool');
  });

  it('sorts alphabetically within each group', () => {
    const rows: Record<string, PartToolRow> = {
      p2: makePtRow('p2', 'Screw', 'Part'),
      p1: makePtRow('p1', 'Bolt', 'Part'),
      t2: makePtRow('t2', 'Wrench', 'Tool'),
      t1: makePtRow('t1', 'Hammer', 'Tool'),
    };
    const sorted = sortPartToolRows(rows);
    expect(sorted.map((r) => r.name)).toEqual(['Bolt', 'Screw', 'Hammer', 'Wrench']);
  });

  it('returns empty array for empty record', () => {
    expect(sortPartToolRows({})).toEqual([]);
  });
});

describe('computeUsedAmount', () => {
  it('sums amounts for Parts', () => {
    const spts: Record<string, { partToolId: string; amount: number }> = {
      spt1: { partToolId: 'p1', amount: 3 },
      spt2: { partToolId: 'p1', amount: 2 },
      spt3: { partToolId: 'p2', amount: 5 },
    };
    expect(computeUsedAmount('p1', 'Part', spts)).toBe(5);
  });

  it('takes max amount for Tools', () => {
    const spts: Record<string, { partToolId: string; amount: number }> = {
      spt1: { partToolId: 't1', amount: 1 },
      spt2: { partToolId: 't1', amount: 3 },
      spt3: { partToolId: 't1', amount: 2 },
    };
    expect(computeUsedAmount('t1', 'Tool', spts)).toBe(3);
  });

  it('returns 0 when no junctions exist for the partTool', () => {
    const spts: Record<string, { partToolId: string; amount: number }> = {
      spt1: { partToolId: 'other', amount: 5 },
    };
    expect(computeUsedAmount('p1', 'Part', spts)).toBe(0);
  });

  it('returns 0 for empty substepPartTools', () => {
    expect(computeUsedAmount('p1', 'Part', {})).toBe(0);
  });
});
