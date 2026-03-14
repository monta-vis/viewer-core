import { describe, it, expect } from 'vitest';
import { applyLiveCoords } from './applyLiveCoords';

interface TestShape {
  id: string;
  type: string;
  x1: number | null;
  y1: number | null;
  x2: number | null;
  y2: number | null;
  x?: number | null;
  y?: number | null;
  radius?: number | null;
  points?: string | null;
}

describe('applyLiveCoords — freehand point shifting', () => {
  const freehandPoints = JSON.stringify([
    { x: 10, y: 20 },
    { x: 30, y: 40 },
    { x: 50, y: 60 },
  ]);

  it('shifts freehand points by x1/y1 delta in single shape mode', () => {
    const shapes: TestShape[] = [
      { id: 'f1', type: 'freehand', x1: 10, y1: 20, x2: 50, y2: 60, points: freehandPoints },
    ];

    // Move shape: x1 goes from 10→15 (+5), y1 from 20→30 (+10)
    const result = applyLiveCoords(shapes, {
      isResizing: true,
      liveGroupCoords: null,
      liveCoords: { x1: 15, y1: 30, x2: 55, y2: 70 },
      resizingShapeId: 'f1',
    });

    const shifted = JSON.parse(result[0].points!);
    expect(shifted).toEqual([
      { x: 15, y: 30 },
      { x: 35, y: 50 },
      { x: 55, y: 70 },
    ]);
  });

  it('shifts freehand points by delta in group move mode', () => {
    const shapes: TestShape[] = [
      { id: 'f1', type: 'freehand', x1: 10, y1: 20, x2: 50, y2: 60, points: freehandPoints },
    ];

    // Group move: x1 goes from 10→12 (+2), y1 from 20→25 (+5)
    const groupCoords = new Map([
      ['f1', { x1: 12, y1: 25, x2: 52, y2: 65 }],
    ]);

    const result = applyLiveCoords(shapes, {
      isResizing: true,
      liveGroupCoords: groupCoords,
      liveCoords: null,
      resizingShapeId: null,
    });

    const shifted = JSON.parse(result[0].points!);
    expect(shifted).toEqual([
      { x: 12, y: 25 },
      { x: 32, y: 45 },
      { x: 52, y: 65 },
    ]);
  });

  it('does not add points field to non-freehand shapes', () => {
    const shapes: TestShape[] = [
      { id: 'r1', type: 'rectangle', x1: 10, y1: 20, x2: 50, y2: 60 },
    ];

    const result = applyLiveCoords(shapes, {
      isResizing: true,
      liveGroupCoords: null,
      liveCoords: { x1: 15, y1: 25, x2: 55, y2: 65 },
      resizingShapeId: 'r1',
    });

    expect(result[0].points).toBeUndefined();
  });

  it('does not shift points for freehand shape without points field', () => {
    const shapes: TestShape[] = [
      { id: 'f1', type: 'freehand', x1: 10, y1: 20, x2: 50, y2: 60 },
    ];

    const result = applyLiveCoords(shapes, {
      isResizing: true,
      liveGroupCoords: null,
      liveCoords: { x1: 15, y1: 25, x2: 55, y2: 65 },
      resizingShapeId: 'f1',
    });

    expect(result[0].points).toBeUndefined();
  });

  it('returns shapes unchanged when not resizing', () => {
    const shapes: TestShape[] = [
      { id: 'f1', type: 'freehand', x1: 10, y1: 20, x2: 50, y2: 60, points: freehandPoints },
    ];

    const result = applyLiveCoords(shapes, {
      isResizing: false,
      liveGroupCoords: null,
      liveCoords: null,
      resizingShapeId: null,
    });

    expect(result).toBe(shapes);
  });
});
