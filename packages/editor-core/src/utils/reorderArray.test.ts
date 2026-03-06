import { describe, it, expect } from 'vitest';
import { reorderArray } from './reorderArray';

describe('reorderArray', () => {
  it('moves item forward', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const result = reorderArray(items, 'a', 2);
    expect(result!.map(i => i.id)).toEqual(['b', 'c', 'a']);
  });

  it('moves item backward', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const result = reorderArray(items, 'c', 0);
    expect(result!.map(i => i.id)).toEqual(['c', 'a', 'b']);
  });

  it('returns null when item not found', () => {
    const items = [{ id: 'a' }];
    expect(reorderArray(items, 'x', 0)).toBeNull();
  });

  it('returns null when same position', () => {
    const items = [{ id: 'a' }, { id: 'b' }];
    expect(reorderArray(items, 'a', 0)).toBeNull();
  });
});
