import { describe, it, expect, vi } from 'vitest';
import type { Active, DroppableContainer, ClientRect } from '@dnd-kit/core';
import { createMultiTypeCollisionDetection } from './SortableStepGrid';

// Helper: create a minimal DroppableContainer stub
function makeDroppable(id: string, type?: string): DroppableContainer {
  return {
    id,
    key: id,
    data: { current: type ? { type } : undefined },
    disabled: false,
    node: { current: null },
    rect: { current: { width: 100, height: 100, top: 0, left: 0, right: 100, bottom: 100 } },
  } as unknown as DroppableContainer;
}

// Helper: create a minimal Active stub
function makeActive(id: string, type: string): Active {
  return {
    id,
    data: { current: { type } },
    rect: { current: { initial: null, translated: null } },
  } as unknown as Active;
}

const collisionRect: ClientRect = {
  width: 100,
  height: 100,
  top: 0,
  left: 0,
  right: 100,
  bottom: 100,
};

describe('createMultiTypeCollisionDetection', () => {
  const stepToContainer = new Map([
    ['step-1', 'assembly-A'],
    ['step-2', 'assembly-A'],
    ['step-3', 'assembly-B'],
  ]);

  const substepToContainer = new Map([
    ['sub-1', 'step-1'],
    ['sub-2', 'step-1'],
    ['sub-3', 'step-3'],
  ]);

  const containerIds = new Set(['assembly-A', 'assembly-B', 'unassigned']);

  const stepContainerIds = new Set(['step-1', 'step-3']);

  it('T1: assembly drag → only assembly droppables are passed through', () => {
    const passedContainers: DroppableContainer[][] = [];
    const mockClosestCenter = vi.fn((args: { droppableContainers: DroppableContainer[] }) => {
      passedContainers.push(args.droppableContainers);
      return [];
    });

    const detect = createMultiTypeCollisionDetection({
      stepToContainer,
      substepToContainer,
      containerIds,
      stepContainerIds,
      closestCenterFn: mockClosestCenter,
    });

    const droppables = [
      makeDroppable('asm-sort::assembly-A', 'assembly'),
      makeDroppable('asm-sort::assembly-B', 'assembly'),
      makeDroppable('step-1', 'step'),
      makeDroppable('step-2', 'step'),
      makeDroppable('assembly-A'), // container droppable (no type)
      makeDroppable('sub-1', 'substep'),
    ];

    detect({
      active: makeActive('asm-sort::assembly-A', 'assembly'),
      collisionRect,
      droppableRects: new Map(),
      droppableContainers: droppables,
      pointerCoordinates: null,
    });

    expect(mockClosestCenter).toHaveBeenCalledOnce();
    const filtered = passedContainers[0];
    // Only the two assembly droppables should remain
    expect(filtered).toHaveLength(2);
    expect(filtered.map((d) => d.id)).toEqual(['asm-sort::assembly-A', 'asm-sort::assembly-B']);
  });

  it('T2: step drag → only steps + container droppables are passed through', () => {
    const passedContainers: DroppableContainer[][] = [];
    const mockClosestCenter = vi.fn((args: { droppableContainers: DroppableContainer[] }) => {
      passedContainers.push(args.droppableContainers);
      return [];
    });

    const detect = createMultiTypeCollisionDetection({
      stepToContainer,
      substepToContainer,
      containerIds,
      stepContainerIds,
      closestCenterFn: mockClosestCenter,
    });

    const droppables = [
      makeDroppable('asm-sort::assembly-A', 'assembly'),
      makeDroppable('asm-sort::assembly-B', 'assembly'),
      makeDroppable('step-1', 'step'),
      makeDroppable('step-2', 'step'),
      makeDroppable('step-3', 'step'),
      makeDroppable('assembly-A'), // container droppable
      makeDroppable('assembly-B'), // container droppable
      makeDroppable('unassigned'),  // container droppable
      makeDroppable('sub-1', 'substep'),
      makeDroppable('sub-2', 'substep'),
    ];

    detect({
      active: makeActive('step-1', 'step'),
      collisionRect,
      droppableRects: new Map(),
      droppableContainers: droppables,
      pointerCoordinates: null,
    });

    expect(mockClosestCenter).toHaveBeenCalledOnce();
    const filtered = passedContainers[0];
    const filteredIds = filtered.map((d) => d.id);

    // Should include: steps (in stepToContainer), container droppables, assembly sortables (for dropping on assembly area)
    expect(filteredIds).toContain('step-1');
    expect(filteredIds).toContain('step-2');
    expect(filteredIds).toContain('step-3');
    expect(filteredIds).toContain('assembly-A');
    expect(filteredIds).toContain('assembly-B');
    expect(filteredIds).toContain('unassigned');
    expect(filteredIds).toContain('asm-sort::assembly-A');
    expect(filteredIds).toContain('asm-sort::assembly-B');

    // Should NOT include substeps
    expect(filteredIds).not.toContain('sub-1');
    expect(filteredIds).not.toContain('sub-2');
  });

  it('substep drag → only substeps + step container droppables are passed through', () => {
    const passedContainers: DroppableContainer[][] = [];
    const mockClosestCenter = vi.fn((args: { droppableContainers: DroppableContainer[] }) => {
      passedContainers.push(args.droppableContainers);
      return [];
    });

    const detect = createMultiTypeCollisionDetection({
      stepToContainer,
      substepToContainer,
      containerIds,
      stepContainerIds,
      closestCenterFn: mockClosestCenter,
    });

    const droppables = [
      makeDroppable('asm-sort::assembly-A', 'assembly'),
      makeDroppable('step-1', 'step'),
      makeDroppable('step-3', 'step'),
      makeDroppable('assembly-A'), // container droppable
      makeDroppable('sub-1', 'substep'),
      makeDroppable('sub-2', 'substep'),
      makeDroppable('sub-3', 'substep'),
    ];

    detect({
      active: makeActive('sub-1', 'substep'),
      collisionRect,
      droppableRects: new Map(),
      droppableContainers: droppables,
      pointerCoordinates: null,
    });

    expect(mockClosestCenter).toHaveBeenCalledOnce();
    const filtered = passedContainers[0];
    const filteredIds = filtered.map((d) => d.id);

    // Should include substeps and step container droppables
    expect(filteredIds).toContain('sub-1');
    expect(filteredIds).toContain('sub-2');
    expect(filteredIds).toContain('sub-3');
    // step-1 and step-3 are step container IDs (they have substeps)
    expect(filteredIds).toContain('step-1');
    expect(filteredIds).toContain('step-3');

    // Should NOT include assembly stuff or assembly containers
    expect(filteredIds).not.toContain('asm-sort::assembly-A');
    expect(filteredIds).not.toContain('assembly-A');
  });
});
