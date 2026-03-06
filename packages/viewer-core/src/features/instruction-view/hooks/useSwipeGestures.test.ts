// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  classifyTouchStart,
  resolveDirectionLock,
  EDGE_ZONE_PX,
  DIRECTION_LOCK_PX,
} from './useSwipeGestures';

const screenW = 400;
const screenH = 800;

const noDrawers = { feedbackWidget: false, speedDrawer: false };
const noRefs = { feedbackPanel: null, speedPanel: null };

describe('classifyTouchStart', () => {
  it('left-edge touch → pending-left-edge (opens overview sidebar)', () => {
    const intent = classifyTouchStart(10, 400, screenW, screenH, noDrawers, noRefs, false);
    expect(intent).toBe('pending-left-edge');
  });

  it('top-edge touch → pending-top-edge (opens parts drawer)', () => {
    const intent = classifyTouchStart(200, 10, screenW, screenH, noDrawers, noRefs, false);
    expect(intent).toBe('pending-top-edge');
  });

  it('top-left corner: top-edge wins over left-edge', () => {
    const intent = classifyTouchStart(10, 10, screenW, screenH, noDrawers, noRefs, false);
    expect(intent).toBe('pending-top-edge');
  });

  it('overview open → pending-close-left (inside panel)', () => {
    const panel = document.createElement('div');
    const child = document.createElement('span');
    panel.appendChild(child);
    const intent = classifyTouchStart(
      200, 400, screenW, screenH, noDrawers, noRefs, true, child,
      panel,
    );
    expect(intent).toBe('pending-close-left');
  });

  it('overview open → dragging-close-left (outside panel)', () => {
    const outsideEl = document.createElement('div');
    const panel = document.createElement('div');
    const intent = classifyTouchStart(
      200, 400, screenW, screenH, noDrawers, noRefs, true, outsideEl,
      panel,
    );
    expect(intent).toBe('dragging-close-left');
  });

  it('parts drawer open + touch inside panel → pending-close-top', () => {
    const panel = document.createElement('div');
    const child = document.createElement('span');
    panel.appendChild(child);
    const intent = classifyTouchStart(
      200, 100, screenW, screenH, noDrawers, noRefs, false, child,
      undefined, true, panel,
    );
    expect(intent).toBe('pending-close-top');
  });

  it('parts drawer open + touch outside panel → normal edge detection', () => {
    const outsideEl = document.createElement('div');
    const panel = document.createElement('div');
    const intent = classifyTouchStart(
      200, 400, screenW, screenH, noDrawers, noRefs, false, outsideEl,
      undefined, true, panel,
    );
    // Center touch, no edge zone → null
    expect(intent).toBe(null);
  });
});

describe('resolveDirectionLock', () => {
  const threshold = DIRECTION_LOCK_PX + 1;

  it('pending-top-edge + swipe down → commit', () => {
    expect(resolveDirectionLock('pending-top-edge', 0, threshold)).toBe('commit');
  });

  it('pending-top-edge + swipe up → cancel', () => {
    expect(resolveDirectionLock('pending-top-edge', 0, -threshold)).toBe('cancel');
  });

  it('pending-top-edge + swipe horizontal → cancel', () => {
    expect(resolveDirectionLock('pending-top-edge', threshold, 0)).toBe('cancel');
  });

  it('pending-close-top + swipe up → commit', () => {
    expect(resolveDirectionLock('pending-close-top', 0, -threshold)).toBe('commit');
  });

  it('pending-close-top + swipe down → cancel', () => {
    expect(resolveDirectionLock('pending-close-top', 0, threshold)).toBe('cancel');
  });

  it('pending-left-edge + swipe right → commit (opens overview)', () => {
    expect(resolveDirectionLock('pending-left-edge', threshold, 0)).toBe('commit');
  });

  it('pending-close-left + swipe left → commit (closes overview)', () => {
    expect(resolveDirectionLock('pending-close-left', -threshold, 0)).toBe('commit');
  });
});
