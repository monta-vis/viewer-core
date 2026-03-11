import { describe, it, expect } from 'vitest';
import type { DrawingRow } from '@monta-vis/viewer-core';
import { migrateImageDrawingToContainerSpace } from './migrateDrawingCoords';

function makeDrawing(overrides: Partial<DrawingRow> = {}): DrawingRow {
  return {
    id: 'd-1',
    versionId: 'v1',
    videoFrameAreaId: 'vfa-1',
    substepId: null,
    startFrame: null,
    endFrame: null,
    type: 'arrow',
    color: 'red',
    strokeWidth: 2,
    x1: 0.5,
    y1: 0.5,
    x2: 0.8,
    y2: 0.8,
    x: null,
    y: null,
    content: null,
    fontSize: null,
    points: null,
    order: 0,
    ...overrides,
  };
}

describe('migrateImageDrawingToContainerSpace', () => {
  it('transforms 16:9 arrow drawing coords to container space', () => {
    // 16:9 image in 1:1 container:
    // Image fills width, letterboxed top/bottom
    // imgAspect = 16/9 > 1 → bounds: { x: 0, y: (1 - 9/16)/2, w: 1, h: 9/16 }
    // bounds = { x: 0, y: 0.21875, w: 1, h: 0.5625 }
    const result = migrateImageDrawingToContainerSpace(
      makeDrawing({ x1: 0.5, y1: 0.5, x2: 0.8, y2: 0.8 }),
      16 / 9,
    );

    // new_x = 0 + 0.5 * 1 = 0.5
    // new_y = 0.21875 + 0.5 * 0.5625 = 0.5
    expect(result.x1).toBeCloseTo(0.5, 5);
    expect(result.y1).toBeCloseTo(0.5, 5);

    // new_x2 = 0 + 0.8 * 1 = 0.8
    // new_y2 = 0.21875 + 0.8 * 0.5625 = 0.66875
    expect(result.x2).toBeCloseTo(0.8, 5);
    expect(result.y2).toBeCloseTo(0.66875, 5);
  });

  it('transforms 9:16 arrow drawing coords to container space', () => {
    // 9:16 image in 1:1 container:
    // Image fills height, letterboxed left/right
    // imgAspect = 9/16 < 1 → bounds: { x: (1 - 9/16)/2, y: 0, w: 9/16, h: 1 }
    // bounds = { x: 0.21875, y: 0, w: 0.5625, h: 1 }
    const result = migrateImageDrawingToContainerSpace(
      makeDrawing({ x1: 0.5, y1: 0.5, x2: 0.8, y2: 0.8 }),
      9 / 16,
    );

    // new_x = 0.21875 + 0.5 * 0.5625 = 0.5
    expect(result.x1).toBeCloseTo(0.5, 5);
    // new_y = 0 + 0.5 * 1 = 0.5
    expect(result.y1).toBeCloseTo(0.5, 5);

    // new_x2 = 0.21875 + 0.8 * 0.5625 = 0.66875
    expect(result.x2).toBeCloseTo(0.66875, 5);
    // new_y2 = 0 + 0.8 * 1 = 0.8
    expect(result.y2).toBeCloseTo(0.8, 5);
  });

  it('produces identity transform for 1:1 image', () => {
    const drawing = makeDrawing({ x1: 0.3, y1: 0.7, x2: 0.9, y2: 0.1 });
    const result = migrateImageDrawingToContainerSpace(drawing, 1);

    expect(result.x1).toBeCloseTo(0.3, 5);
    expect(result.y1).toBeCloseTo(0.7, 5);
    expect(result.x2).toBeCloseTo(0.9, 5);
    expect(result.y2).toBeCloseTo(0.1, 5);
  });

  it('transforms freehand points correctly', () => {
    const points = JSON.stringify([
      { x: 0.0, y: 0.0 },
      { x: 0.5, y: 0.5 },
      { x: 1.0, y: 1.0 },
    ]);
    const drawing = makeDrawing({
      type: 'freehand',
      x1: 0.0,
      y1: 0.0,
      x2: 1.0,
      y2: 1.0,
      points,
    });

    // 16:9 image: bounds = { x: 0, y: 0.21875, w: 1, h: 0.5625 }
    const result = migrateImageDrawingToContainerSpace(drawing, 16 / 9);

    expect(result.x1).toBeCloseTo(0.0, 5);
    expect(result.y1).toBeCloseTo(0.21875, 5);
    expect(result.x2).toBeCloseTo(1.0, 5);
    expect(result.y2).toBeCloseTo(0.78125, 5);

    const migratedPoints = JSON.parse(result.points!) as Array<{ x: number; y: number }>;
    expect(migratedPoints[0].x).toBeCloseTo(0.0, 5);
    expect(migratedPoints[0].y).toBeCloseTo(0.21875, 5);
    expect(migratedPoints[1].x).toBeCloseTo(0.5, 5);
    expect(migratedPoints[1].y).toBeCloseTo(0.5, 5);
    expect(migratedPoints[2].x).toBeCloseTo(1.0, 5);
    expect(migratedPoints[2].y).toBeCloseTo(0.78125, 5);
  });

  it('transforms text drawing x/y correctly', () => {
    const drawing = makeDrawing({
      type: 'text',
      x: 0.5,
      y: 0.5,
      x1: 0.5,
      y1: 0.5,
      x2: null,
      y2: null,
      content: 'Hello',
      fontSize: 5,
    });

    // 9:16 → bounds = { x: 0.21875, y: 0, w: 0.5625, h: 1 }
    const result = migrateImageDrawingToContainerSpace(drawing, 9 / 16);

    expect(result.x).toBeCloseTo(0.5, 5);
    expect(result.y).toBeCloseTo(0.5, 5);
    expect(result.x1).toBeCloseTo(0.5, 5);
    expect(result.y1).toBeCloseTo(0.5, 5);
  });
});
