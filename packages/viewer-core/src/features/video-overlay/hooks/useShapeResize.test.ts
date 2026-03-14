import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useShapeResize, type ResizableShape } from './useShapeResize';

// Mock requestAnimationFrame / cancelAnimationFrame
let rafCallback: FrameRequestCallback | null = null;
vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
  rafCallback = cb;
  return 1;
});
vi.stubGlobal('cancelAnimationFrame', vi.fn());

function flushRaf() {
  if (rafCallback) {
    rafCallback(0);
    rafCallback = null;
  }
}

interface TestShape extends ResizableShape {
  id: string;
  type: string;
  x1: number;
  y1: number;
  x2: number | null;
  y2: number | null;
}

function makeRect(id: string, x1: number, y1: number, x2: number, y2: number): TestShape {
  return { id, type: 'rectangle', x1, y1, x2, y2 };
}

function makeText(id: string, x1: number, y1: number): TestShape {
  return { id, type: 'text', x1, y1, x2: null, y2: null };
}

interface FreehandTestShape extends ResizableShape {
  id: string;
  type: string;
  x1: number;
  y1: number;
  x2: number | null;
  y2: number | null;
  points: string;
}

function makeFreehand(
  id: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  points: Array<{ x: number; y: number }>,
): FreehandTestShape {
  return { id, type: 'freehand', x1, y1, x2, y2, points: JSON.stringify(points) };
}

/**
 * Creates a mock container element and attaches it to the hook's containerRef.
 */
function setupContainer(containerRefSetter: (el: HTMLDivElement | null) => void) {
  const container = document.createElement('div');
  Object.defineProperty(container, 'getBoundingClientRect', {
    value: () => ({ left: 0, top: 0, width: 1000, height: 1000, right: 1000, bottom: 1000 }),
  });
  Object.defineProperty(container, 'clientWidth', { value: 1000, configurable: true });
  Object.defineProperty(container, 'clientHeight', { value: 1000, configurable: true });
  containerRefSetter(container);
  return container;
}

function createMouseEvent(clientX: number, clientY: number): React.MouseEvent {
  return { clientX, clientY, shiftKey: false, ctrlKey: false, metaKey: false } as unknown as React.MouseEvent;
}

function createNativeMouseEvent(clientX: number, clientY: number, shiftKey = false): MouseEvent {
  return { clientX, clientY, shiftKey } as unknown as MouseEvent;
}

describe('useShapeResize - coordinate space', () => {
  it('should set liveCoords to null on startResize (no double-transform)', () => {
    const bounds = { x: 10, y: 10, width: 80, height: 80 };
    const { result } = renderHook(() =>
      useShapeResize<TestShape>({ bounds }),
    );

    act(() => {
      setupContainer(result.current.containerRef);
    });

    const shape = makeRect('a', 0.3, 0.3, 0.7, 0.7);

    act(() => {
      result.current.startResize(shape, 'se');
    });

    // liveCoords must be null so consuming memos use raw local-space values
    // (refs hold container-space internally, but state must not expose them)
    expect(result.current.liveCoords).toBeNull();
    expect(result.current.isResizing).toBe(true);
  });

  it('should set liveGroupCoords to null on startGroupMove (no double-transform)', () => {
    const bounds = { x: 10, y: 10, width: 80, height: 80 };
    const { result } = renderHook(() =>
      useShapeResize<TestShape>({ bounds }),
    );

    act(() => {
      setupContainer(result.current.containerRef);
    });

    const shapes = [makeRect('a', 0.3, 0.3, 0.7, 0.7)];

    act(() => {
      result.current.startGroupMove(shapes, 'a', createMouseEvent(500, 500));
    });

    expect(result.current.liveGroupCoords).toBeNull();
    expect(result.current.isResizing).toBe(true);
  });

  it('should set liveGroupCoords to null on startGroupResize (no double-transform)', () => {
    const bounds = { x: 10, y: 10, width: 80, height: 80 };
    const { result } = renderHook(() =>
      useShapeResize<TestShape>({ bounds }),
    );

    act(() => {
      setupContainer(result.current.containerRef);
    });

    const shapes = [makeRect('a', 0.3, 0.3, 0.7, 0.7)];

    act(() => {
      result.current.startGroupResize(shapes, 'a', 'se', createMouseEvent(500, 500));
    });

    expect(result.current.liveGroupCoords).toBeNull();
    expect(result.current.isResizing).toBe(true);
  });
});

describe('useShapeResize - group resize', () => {
  let onGroupMoveComplete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    rafCallback = null;
    onGroupMoveComplete = vi.fn();
  });

  it('should proportionally resize two rects from SE corner handle', () => {
    const { result } = renderHook(() =>
      useShapeResize<TestShape>({ onGroupMoveComplete }),
    );

    act(() => {
      setupContainer(result.current.containerRef);
    });

    // Two rectangles forming a group bbox from (10,10) to (50,50)
    const shapes: TestShape[] = [
      makeRect('a', 10, 10, 30, 30),
      makeRect('b', 30, 30, 50, 50),
    ];

    // Start group resize from SE handle on shape 'b'
    act(() => {
      result.current.startGroupResize(shapes, 'b', 'se', createMouseEvent(500, 500));
    });

    expect(result.current.isResizing).toBe(true);
    expect(result.current.activeHandle).toBe('se');

    // Simulate mouse move: drag SE corner from (50,50) equivalent → grow by 2x
    // Mouse at (500,500) initially (50% of 1000px container = 50 in %).
    // Move to (900,900) → 90% → the SE edge moves from 50→90, anchor is NW (10,10)
    // scaleX = (90 - 10) / (50 - 10) = 80/40 = 2.0
    // scaleY = (90 - 10) / (50 - 10) = 80/40 = 2.0
    act(() => {
      const moveEvent = createNativeMouseEvent(900, 900);
      // Manually dispatch on window
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 900, clientY: 900 }));
    });

    // Flush RAF
    act(() => {
      flushRaf();
    });

    // Check that liveGroupCoords exist
    expect(result.current.liveGroupCoords).not.toBeNull();

    if (result.current.liveGroupCoords) {
      const coordsA = result.current.liveGroupCoords.get('a');
      const coordsB = result.current.liveGroupCoords.get('b');

      expect(coordsA).toBeDefined();
      expect(coordsB).toBeDefined();

      // With 2x scale from anchor (10, 10):
      // Shape A: x1 = 10 + (10-10)*2 = 10, y1 = 10, x2 = 10 + (30-10)*2 = 50, y2 = 50
      // Shape B: x1 = 10 + (30-10)*2 = 50, y1 = 50, x2 = 10 + (50-10)*2 = 90, y2 = 90
      expect(coordsA!.x1).toBeCloseTo(10, 0);
      expect(coordsA!.y1).toBeCloseTo(10, 0);
      expect(coordsA!.x2).toBeCloseTo(50, 0);
      expect(coordsA!.y2).toBeCloseTo(50, 0);

      expect(coordsB!.x1).toBeCloseTo(50, 0);
      expect(coordsB!.y1).toBeCloseTo(50, 0);
      expect(coordsB!.x2).toBeCloseTo(90, 0);
      expect(coordsB!.y2).toBeCloseTo(90, 0);
    }
  });

  it('should only scale X axis for E (east) edge handle', () => {
    const { result } = renderHook(() =>
      useShapeResize<TestShape>({ onGroupMoveComplete }),
    );

    act(() => {
      setupContainer(result.current.containerRef);
    });

    const shapes: TestShape[] = [
      makeRect('a', 10, 10, 30, 30),
      makeRect('b', 30, 30, 50, 50),
    ];

    // Start group resize from E handle
    act(() => {
      result.current.startGroupResize(shapes, 'b', 'e', createMouseEvent(500, 500));
    });

    expect(result.current.activeHandle).toBe('e');

    // Move mouse right: E handle drags east edge from 50→70
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 700, clientY: 300 }));
    });
    act(() => {
      flushRaf();
    });

    expect(result.current.liveGroupCoords).not.toBeNull();
    if (result.current.liveGroupCoords) {
      const coordsA = result.current.liveGroupCoords.get('a');
      // scaleX = (70 - 10)/(50 - 10) = 60/40 = 1.5, scaleY = 1
      // Shape A: x1 = 10 + (10-10)*1.5 = 10, y1 = 10 (no change), x2 = 10 + (30-10)*1.5 = 40, y2 = 30 (no change)
      expect(coordsA!.x1).toBeCloseTo(10, 0);
      expect(coordsA!.y1).toBeCloseTo(10, 0);
      expect(coordsA!.x2).toBeCloseTo(40, 0);
      expect(coordsA!.y2).toBeCloseTo(30, 0);
    }
  });

  it('should enforce minimum scale to prevent degenerate shapes', () => {
    const { result } = renderHook(() =>
      useShapeResize<TestShape>({ onGroupMoveComplete }),
    );

    act(() => {
      setupContainer(result.current.containerRef);
    });

    const shapes: TestShape[] = [
      makeRect('a', 10, 10, 50, 50),
    ];

    // Start group resize from SE
    act(() => {
      result.current.startGroupResize(shapes, 'a', 'se', createMouseEvent(500, 500));
    });

    // Drag to collapse: mouse at anchor point (10,10) → scale would be 0
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100 }));
    });
    act(() => {
      flushRaf();
    });

    // Should be clamped to min scale (0.05), so shapes don't collapse
    if (result.current.liveGroupCoords) {
      const coords = result.current.liveGroupCoords.get('a');
      expect(coords).toBeDefined();
      // Min scale: x2 = 10 + (50-10)*0.05 = 12, y2 = 10 + (50-10)*0.05 = 12
      expect(coords!.x2! - coords!.x1).toBeGreaterThan(0);
      expect(coords!.y2! - coords!.y1).toBeGreaterThan(0);
    }
  });

  it('should reset state on cancel', () => {
    const { result } = renderHook(() =>
      useShapeResize<TestShape>({ onGroupMoveComplete }),
    );

    act(() => {
      setupContainer(result.current.containerRef);
    });

    const shapes: TestShape[] = [makeRect('a', 10, 10, 50, 50)];

    act(() => {
      result.current.startGroupResize(shapes, 'a', 'se', createMouseEvent(500, 500));
    });

    expect(result.current.isResizing).toBe(true);

    act(() => {
      result.current.cancelResize();
    });

    expect(result.current.isResizing).toBe(false);
    expect(result.current.liveGroupCoords).toBeNull();
    expect(result.current.activeHandle).toBeNull();
  });

  it('should call onGroupMoveComplete with final coords on finish', () => {
    const { result } = renderHook(() =>
      useShapeResize<TestShape>({ onGroupMoveComplete }),
    );

    act(() => {
      setupContainer(result.current.containerRef);
    });

    const shapes: TestShape[] = [
      makeRect('a', 10, 10, 30, 30),
      makeRect('b', 30, 30, 50, 50),
    ];

    act(() => {
      result.current.startGroupResize(shapes, 'b', 'se', createMouseEvent(500, 500));
    });

    // Move mouse
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 900, clientY: 900 }));
    });
    act(() => {
      flushRaf();
    });

    // Finish
    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'));
    });

    expect(onGroupMoveComplete).toHaveBeenCalledTimes(1);
    const moves = onGroupMoveComplete.mock.calls[0][0];
    expect(moves).toHaveLength(2);
    expect(moves[0].id).toBe('a');
    expect(moves[1].id).toBe('b');
    // Verify coords are present
    expect(moves[0].updates.x1).toBeDefined();
    expect(moves[1].updates.x1).toBeDefined();
  });

  it('should allow free resize on corner handles by default (no Shift)', () => {
    const { result } = renderHook(() =>
      useShapeResize<TestShape>({ onGroupMoveComplete }),
    );

    act(() => {
      setupContainer(result.current.containerRef);
    });

    // Two rectangles: bbox from (10,10) to (50,50)
    const shapes: TestShape[] = [
      makeRect('a', 10, 10, 30, 30),
      makeRect('b', 30, 30, 50, 50),
    ];

    act(() => {
      result.current.startGroupResize(shapes, 'b', 'se', createMouseEvent(500, 500));
    });

    // Drag SE corner asymmetrically: X to 90% but Y only to 70%
    // Free resize (default): scaleX = (90-10)/(50-10) = 2.0, scaleY = (70-10)/(50-10) = 1.5
    // Both applied independently
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 900, clientY: 700 }));
    });
    act(() => {
      flushRaf();
    });

    expect(result.current.liveGroupCoords).not.toBeNull();
    if (result.current.liveGroupCoords) {
      const coordsA = result.current.liveGroupCoords.get('a');
      // Free resize: scaleX=2.0, scaleY=1.5 from anchor (10,10)
      // Shape A: x1=10, y1=10, x2=10+(30-10)*2=50, y2=10+(30-10)*1.5=40
      expect(coordsA!.x1).toBeCloseTo(10, 0);
      expect(coordsA!.y1).toBeCloseTo(10, 0);
      expect(coordsA!.x2).toBeCloseTo(50, 0);
      expect(coordsA!.y2).toBeCloseTo(40, 0);

      const coordsB = result.current.liveGroupCoords.get('b');
      // Shape B: x1=10+(30-10)*2=50, y1=10+(30-10)*1.5=40, x2=10+(50-10)*2=90, y2=10+(50-10)*1.5=70
      expect(coordsB!.x1).toBeCloseTo(50, 0);
      expect(coordsB!.y1).toBeCloseTo(40, 0);
      expect(coordsB!.x2).toBeCloseTo(90, 0);
      expect(coordsB!.y2).toBeCloseTo(70, 0);
    }
  });

  it('should enforce uniform scaling on corner handles when Shift is held', () => {
    const { result } = renderHook(() =>
      useShapeResize<TestShape>({ onGroupMoveComplete }),
    );

    act(() => {
      setupContainer(result.current.containerRef);
    });

    const shapes: TestShape[] = [
      makeRect('a', 10, 10, 30, 30),
      makeRect('b', 30, 30, 50, 50),
    ];

    act(() => {
      result.current.startGroupResize(shapes, 'b', 'se', createMouseEvent(500, 500));
    });

    // Drag SE corner asymmetrically WITH Shift: X to 90%, Y to 70%
    // Uniform scaling (Shift): max(scaleX, scaleY) = max(2.0, 1.5) = 2.0
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 900, clientY: 700, shiftKey: true }));
    });
    act(() => {
      flushRaf();
    });

    expect(result.current.liveGroupCoords).not.toBeNull();
    if (result.current.liveGroupCoords) {
      const coordsA = result.current.liveGroupCoords.get('a');
      // Uniform scale 2.0 from anchor (10,10):
      // Shape A: x1=10, y1=10, x2=10+(30-10)*2=50, y2=10+(30-10)*2=50
      expect(coordsA!.x1).toBeCloseTo(10, 0);
      expect(coordsA!.y1).toBeCloseTo(10, 0);
      expect(coordsA!.x2).toBeCloseTo(50, 0);
      expect(coordsA!.y2).toBeCloseTo(50, 0);

      const coordsB = result.current.liveGroupCoords.get('b');
      // Shape B: x1=10+(30-10)*2=50, y1=50, x2=10+(50-10)*2=90, y2=90
      expect(coordsB!.x1).toBeCloseTo(50, 0);
      expect(coordsB!.y1).toBeCloseTo(50, 0);
      expect(coordsB!.x2).toBeCloseTo(90, 0);
      expect(coordsB!.y2).toBeCloseTo(90, 0);
    }
  });

  it('should not enforce uniform scaling on edge handles regardless of Shift', () => {
    const { result } = renderHook(() =>
      useShapeResize<TestShape>({ onGroupMoveComplete }),
    );

    act(() => {
      setupContainer(result.current.containerRef);
    });

    const shapes: TestShape[] = [
      makeRect('a', 10, 10, 30, 30),
      makeRect('b', 30, 30, 50, 50),
    ];

    // E handle — only scales X axis
    act(() => {
      result.current.startGroupResize(shapes, 'b', 'e', createMouseEvent(500, 500));
    });

    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 700, clientY: 300 }));
    });
    act(() => {
      flushRaf();
    });

    expect(result.current.liveGroupCoords).not.toBeNull();
    if (result.current.liveGroupCoords) {
      const coordsA = result.current.liveGroupCoords.get('a');
      // scaleX = (70-10)/(50-10) = 1.5, scaleY = 1 (edge handle)
      expect(coordsA!.x1).toBeCloseTo(10, 0);
      expect(coordsA!.y1).toBeCloseTo(10, 0);
      expect(coordsA!.x2).toBeCloseTo(40, 0);
      expect(coordsA!.y2).toBeCloseTo(30, 0); // Y unchanged
    }
  });

  it('should reposition text shapes without changing x2/y2 during group resize', () => {
    const { result } = renderHook(() =>
      useShapeResize<TestShape>({ onGroupMoveComplete }),
    );

    act(() => {
      setupContainer(result.current.containerRef);
    });

    // Group: one rect + one text
    const shapes: TestShape[] = [
      makeRect('rect', 10, 10, 50, 50),
      makeText('txt', 30, 30),
    ];

    // Start group resize from SE, text is excluded from bbox
    // Group bbox comes only from rect: (10,10)→(50,50)
    act(() => {
      result.current.startGroupResize(shapes, 'rect', 'se', createMouseEvent(500, 500));
    });

    // Drag SE to 90,90 → scale = 2.0 from anchor (10,10)
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 900, clientY: 900 }));
    });
    act(() => {
      flushRaf();
    });

    if (result.current.liveGroupCoords) {
      const textCoords = result.current.liveGroupCoords.get('txt');
      expect(textCoords).toBeDefined();
      // Text position: x1 = 10 + (30-10)*2 = 50, y1 = 10 + (30-10)*2 = 50
      expect(textCoords!.x1).toBeCloseTo(50, 0);
      expect(textCoords!.y1).toBeCloseTo(50, 0);
      // Text has no x2/y2
      expect(textCoords!.x2).toBeNull();
      expect(textCoords!.y2).toBeNull();
    }
  });
});

describe('useShapeResize - freehand single move', () => {
  let onResizeComplete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    rafCallback = null;
    onResizeComplete = vi.fn();
  });

  it('should update liveCoords during freehand move with bounds', () => {
    const bounds = { x: 0, y: 0, width: 100, height: 100 };
    const { result } = renderHook(() =>
      useShapeResize<FreehandTestShape>({ onResizeComplete, bounds }),
    );

    act(() => {
      setupContainer(result.current.containerRef);
    });

    const shape = makeFreehand('f1', 0.5, 0.5, 0.7, 0.7, [
      { x: 0.5, y: 0.5 },
      { x: 0.6, y: 0.6 },
      { x: 0.7, y: 0.7 },
    ]);

    // Start move — mousedown at 500,500 → 50% of 1000px container
    act(() => {
      result.current.startResize(shape, 'move', createMouseEvent(500, 500));
    });

    expect(result.current.isResizing).toBe(true);
    expect(result.current.activeHandle).toBe('move');

    // Simulate mousemove to 600,600 → 60% → delta of +10 in container space
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 600, clientY: 600 }));
    });
    act(() => {
      flushRaf();
    });

    // liveCoords should reflect the move (transformed back to local space)
    // Original: localSpaceToContainer(0.5, 0, 100) = 50
    // Delta: 60 - 50 = 10
    // New container x1 = 50 + 10 = 60
    // Back to local: containerToLocalSpace(60, 0, 100) = 0.6
    expect(result.current.liveCoords).not.toBeNull();
    expect(result.current.liveCoords!.x1).toBeCloseTo(0.6, 2);
    expect(result.current.liveCoords!.y1).toBeCloseTo(0.6, 2);
  });

  it('should persist freehand move without shifting points on finish (bbox-relative)', () => {
    const bounds = { x: 0, y: 0, width: 100, height: 100 };
    const { result } = renderHook(() =>
      useShapeResize<FreehandTestShape>({ onResizeComplete, bounds }),
    );

    act(() => {
      setupContainer(result.current.containerRef);
    });

    const shape = makeFreehand('f1', 0.5, 0.5, 0.7, 0.7, [
      { x: 0, y: 0 },
      { x: 0.5, y: 0.5 },
      { x: 1, y: 1 },
    ]);

    act(() => {
      result.current.startResize(shape, 'move', createMouseEvent(500, 500));
    });

    // Move 10% right and down
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 600, clientY: 600 }));
    });
    act(() => {
      flushRaf();
    });

    // Finish
    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'));
    });

    expect(onResizeComplete).toHaveBeenCalledTimes(1);
    const [shapeId, updates] = onResizeComplete.mock.calls[0];
    expect(shapeId).toBe('f1');
    // x1 should have moved from 0.5 to ~0.6
    expect(updates.x1).toBeCloseTo(0.6, 2);
    expect(updates.y1).toBeCloseTo(0.6, 2);
    // Points should NOT be in the updates — they are bbox-relative and don't change
    expect(updates.points).toBeUndefined();
  });

  it('should move freehand correctly when container repositions between start and update', () => {
    const bounds = { x: 0, y: 0, width: 100, height: 100 };
    const { result } = renderHook(() =>
      useShapeResize<FreehandTestShape>({ onResizeComplete, bounds }),
    );

    // Create a container whose getBoundingClientRect can change
    const container = document.createElement('div');
    let containerLeft = 0;
    let containerTop = 0;
    Object.defineProperty(container, 'getBoundingClientRect', {
      value: () => ({
        left: containerLeft, top: containerTop,
        width: 1000, height: 1000,
        right: containerLeft + 1000, bottom: containerTop + 1000,
      }),
    });
    Object.defineProperty(container, 'clientWidth', { value: 1000, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 1000, configurable: true });

    act(() => {
      result.current.containerRef(container);
    });

    const shape = makeFreehand('f1', 0.5, 0.5, 0.7, 0.7, [
      { x: 0.5, y: 0.5 },
      { x: 0.7, y: 0.7 },
    ]);

    // Mousedown at clientX=500 — container at left=0
    act(() => {
      result.current.startResize(shape, 'move', createMouseEvent(500, 500));
    });

    // Simulate container shifting 50px right (e.g., due to React re-render)
    containerLeft = 50;
    containerTop = 50;

    // Mouse moves 100px right to clientX=600
    // With raw pixel delta: (600-500)/1000*100 = 10% → correct
    // With old relative approach: getRelativePos = (600-50)/1000*100 = 55%, initial was (500-0)/1000*100 = 50%, delta=5% → WRONG
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 600, clientY: 600 }));
    });
    act(() => {
      flushRaf();
    });

    expect(result.current.liveCoords).not.toBeNull();
    // Should move by 10% (100px / 1000px container), not 5%
    expect(result.current.liveCoords!.x1).toBeCloseTo(0.6, 2);
    expect(result.current.liveCoords!.y1).toBeCloseTo(0.6, 2);
  });

  it('should update liveCoords during freehand move WITHOUT bounds', () => {
    const { result } = renderHook(() =>
      useShapeResize<FreehandTestShape>({ onResizeComplete }),
    );

    act(() => {
      setupContainer(result.current.containerRef);
    });

    // No bounds = coords already in 0-100 container space
    const shape = makeFreehand('f1', 50, 50, 70, 70, [
      { x: 50, y: 50 },
      { x: 60, y: 60 },
      { x: 70, y: 70 },
    ]);

    act(() => {
      result.current.startResize(shape, 'move', createMouseEvent(500, 500));
    });

    // Move 10% (100px on 1000px container)
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 600, clientY: 600 }));
    });
    act(() => {
      flushRaf();
    });

    expect(result.current.liveCoords).not.toBeNull();
    expect(result.current.liveCoords!.x1).toBeCloseTo(60, 0);
    expect(result.current.liveCoords!.y1).toBeCloseTo(60, 0);
  });
});
