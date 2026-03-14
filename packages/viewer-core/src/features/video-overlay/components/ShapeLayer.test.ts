import { describe, it, expect } from 'vitest';
import { transformShapeToContainerSpace } from './ShapeLayer';
import type { ShapeData } from './ShapeRenderer';
import type { Rectangle } from '../types';

describe('transformShapeToContainerSpace', () => {
  const bounds: Rectangle = { x: 10, y: 20, width: 50, height: 40 };

  it('transforms x1/y1/x2/y2 from local (0-1) to container space', () => {
    const shape: ShapeData = {
      id: '1',
      type: 'rect',
      color: 'red',
      x1: 0.5,
      y1: 0.5,
      x2: 1.0,
      y2: 1.0,
    };

    const result = transformShapeToContainerSpace(shape, bounds);

    // localSpaceToContainer(0.5, 10, 50) = 10 + 0.5*50 = 35
    expect(result.x1).toBe(35);
    // localSpaceToContainer(0.5, 20, 40) = 20 + 0.5*40 = 40
    expect(result.y1).toBe(40);
    // localSpaceToContainer(1.0, 10, 50) = 10 + 1.0*50 = 60
    expect(result.x2).toBe(60);
    // localSpaceToContainer(1.0, 20, 40) = 20 + 1.0*40 = 60
    expect(result.y2).toBe(60);
  });

  it('does NOT transform freehand points (they are bbox-relative)', () => {
    const bboxRelativePoints = [
      { x: 0.0, y: 0.0 },
      { x: 0.5, y: 0.5 },
      { x: 1.0, y: 1.0 },
    ];

    const shape: ShapeData = {
      id: '2',
      type: 'freehand',
      color: 'blue',
      x1: 0,
      y1: 0,
      x2: 1,
      y2: 1,
      points: JSON.stringify(bboxRelativePoints),
    };

    const result = transformShapeToContainerSpace(shape, bounds);
    const resultPoints = JSON.parse(result.points!);

    // Points should remain unchanged — they are bbox-relative [0-1]
    // Only x1/y1/x2/y2 get transformed
    expect(resultPoints).toEqual(bboxRelativePoints);

    // But bbox coords should be transformed
    expect(result.x1).toBe(10); // localSpaceToContainer(0, 10, 50) = 10
    expect(result.y1).toBe(20); // localSpaceToContainer(0, 20, 40) = 20
    expect(result.x2).toBe(60); // localSpaceToContainer(1, 10, 50) = 60
    expect(result.y2).toBe(60); // localSpaceToContainer(1, 20, 40) = 60
  });

  it('does not modify shape when points is null', () => {
    const shape: ShapeData = {
      id: '3',
      type: 'freehand',
      color: 'green',
      x1: 0.5,
      y1: 0.5,
      x2: 1,
      y2: 1,
      points: null,
    };

    const result = transformShapeToContainerSpace(shape, bounds);
    expect(result.points).toBeNull();
  });
});
