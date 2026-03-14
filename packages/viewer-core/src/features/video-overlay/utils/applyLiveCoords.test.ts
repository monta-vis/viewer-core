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

describe('applyLiveCoords — freehand (bbox-relative points)', () => {
  const bboxRelativePoints = JSON.stringify([
    { x: 0.125, y: 0.125 },
    { x: 0.5, y: 0.5 },
    { x: 0.75, y: 0.75 },
  ]);

  it('updates only x1/y1/x2/y2 for freehand in single shape mode (points unchanged)', () => {
    const shapes: TestShape[] = [
      { id: 'f1', type: 'freehand', x1: 10, y1: 20, x2: 50, y2: 60, points: bboxRelativePoints },
    ];

    const result = applyLiveCoords(shapes, {
      isResizing: true,
      liveGroupCoords: null,
      liveCoords: { x1: 15, y1: 30, x2: 55, y2: 70 },
      resizingShapeId: 'f1',
    });

    expect(result[0].x1).toBe(15);
    expect(result[0].y1).toBe(30);
    expect(result[0].x2).toBe(55);
    expect(result[0].y2).toBe(70);
    // Points should NOT be modified — they are bbox-relative
    expect(result[0].points).toBe(bboxRelativePoints);
  });

  it('updates only x1/y1/x2/y2 for freehand in group move mode (points unchanged)', () => {
    const shapes: TestShape[] = [
      { id: 'f1', type: 'freehand', x1: 10, y1: 20, x2: 50, y2: 60, points: bboxRelativePoints },
    ];

    const groupCoords = new Map([
      ['f1', { x1: 12, y1: 25, x2: 52, y2: 65 }],
    ]);

    const result = applyLiveCoords(shapes, {
      isResizing: true,
      liveGroupCoords: groupCoords,
      liveCoords: null,
      resizingShapeId: null,
    });

    expect(result[0].x1).toBe(12);
    expect(result[0].y1).toBe(25);
    expect(result[0].x2).toBe(52);
    expect(result[0].y2).toBe(65);
    // Points should NOT be modified
    expect(result[0].points).toBe(bboxRelativePoints);
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

  it('preserves freehand shape without points field', () => {
    const shapes: TestShape[] = [
      { id: 'f1', type: 'freehand', x1: 10, y1: 20, x2: 50, y2: 60 },
    ];

    const result = applyLiveCoords(shapes, {
      isResizing: true,
      liveGroupCoords: null,
      liveCoords: { x1: 15, y1: 25, x2: 55, y2: 65 },
      resizingShapeId: 'f1',
    });

    expect(result[0].x1).toBe(15);
    expect(result[0].points).toBeUndefined();
  });

  it('returns shapes unchanged when not resizing', () => {
    const shapes: TestShape[] = [
      { id: 'f1', type: 'freehand', x1: 10, y1: 20, x2: 50, y2: 60, points: bboxRelativePoints },
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
