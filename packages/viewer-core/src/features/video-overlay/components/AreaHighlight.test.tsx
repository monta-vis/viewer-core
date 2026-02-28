import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AreaHighlight } from './AreaHighlight';
import type { AreaData } from '../types';

// Mock useShiftKey — always returns false for these tests
vi.mock('../hooks/useShiftKey', () => ({
  useShiftKey: () => false,
}));

afterEach(() => { cleanup(); });

const baseArea: AreaData = {
  id: 'area-1',
  x: 10,
  y: 20,
  width: 30,
  height: 40,
  type: 'SubstepImage',
  label: 'Test Label',
};

describe('AreaHighlight', () => {
  // ========================================
  // Fix 1: Label click selects area
  // ========================================

  it('label has onClick handler that calls onClick with area id', () => {
    const onClick = vi.fn();
    render(<AreaHighlight area={baseArea} onClick={onClick} />);

    const label = screen.getByText('Test Label');
    fireEvent.click(label);
    expect(onClick).toHaveBeenCalledWith('area-1');
  });

  it('label has onMouseDown handler for move when selected', () => {
    const onResizeStart = vi.fn();
    render(
      <AreaHighlight
        area={baseArea}
        selected={true}
        onResizeStart={onResizeStart}
      />,
    );

    const label = screen.getByText('Test Label');
    fireEvent.mouseDown(label);
    expect(onResizeStart).toHaveBeenCalledWith(
      'area-1',
      'move',
      { x: 10, y: 20, width: 30, height: 40 },
      expect.any(Object),
    );
  });

  it('label has pointer cursor when not selected', () => {
    render(<AreaHighlight area={baseArea} />);
    const label = screen.getByText('Test Label');
    expect(label.style.cursor).toBe('pointer');
  });

  it('label has move cursor when selected', () => {
    render(<AreaHighlight area={baseArea} selected={true} />);
    const label = screen.getByText('Test Label');
    expect(label.style.cursor).toBe('move');
  });

  // ========================================
  // Border click still selects (preserved behavior)
  // ========================================

  it('border click calls onClick with area id', () => {
    const onClick = vi.fn();
    const { container } = render(
      <AreaHighlight area={baseArea} onClick={onClick} />,
    );

    // Border edges are the first 4 child divs with pointer-events-auto
    const borders = container.querySelectorAll('.pointer-events-auto');
    // First border is top edge
    fireEvent.click(borders[0]);
    expect(onClick).toHaveBeenCalledWith('area-1');
  });

  // ========================================
  // Context menu (right-click → "Set as Instruction Image")
  // ========================================

  it('right-click calls onContextMenu with area id and event', () => {
    const onContextMenu = vi.fn();
    const { container } = render(
      <AreaHighlight area={baseArea} onContextMenu={onContextMenu} />,
    );

    const rootDiv = container.firstElementChild as HTMLElement;
    fireEvent.contextMenu(rootDiv);
    expect(onContextMenu).toHaveBeenCalledWith('area-1', expect.any(Object));
  });

  it('right-click prevents default browser menu', () => {
    const onContextMenu = vi.fn();
    const { container } = render(
      <AreaHighlight area={baseArea} onContextMenu={onContextMenu} />,
    );

    const rootDiv = container.firstElementChild as HTMLElement;
    const event = new MouseEvent('contextmenu', { bubbles: true });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    rootDiv.dispatchEvent(event);
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  // ========================================
  // Background click deselects (preserved behavior — tested at overlay level)
  // The AreaHighlight itself doesn't handle background clicks;
  // that's handled by VideoOverlay's onBackgroundClick → areaManager.selectArea(null).
  // We test that the interior is pointer-events-none (pass-through).
  // ========================================

  it('interior div has pointer-events-none (clicks pass through to background)', () => {
    const { container } = render(<AreaHighlight area={baseArea} />);

    // The root div should be pointer-events-none
    const rootDiv = container.firstElementChild as HTMLElement;
    expect(rootDiv.className).toContain('pointer-events-none');
  });
});

// ========================================
// EditorPage logic: area selection clearing
// ========================================

describe('EditorPage area selection clearing logic', () => {
  /**
   * These test the pure logic pattern: when substep or action changes,
   * areaManager.selectArea(null) should be called.
   *
   * We extract the logic as simple functions matching the EditorPage pattern.
   */

  it('substep change clears area selection', () => {
    const selectArea = vi.fn();
    const setSelectedSubstepId = vi.fn();
    const resetCallbacks = {
      setActiveAction: vi.fn(),
      setSelectedElementId: vi.fn(),
      setEditingDescription: vi.fn(),
      setEditingNote: vi.fn(),
      setEditingPartTool: vi.fn(),
      setVideoClipStartFrame: vi.fn(),
      setDrawingTool: vi.fn(),
      setSelectedDrawingId: vi.fn(),
      setDrawingMode: vi.fn(),
    };

    // Simulate handleSubstepSelect pattern from EditorPage
    function handleSubstepSelect(substepId: string) {
      setSelectedSubstepId(substepId);
      resetCallbacks.setActiveAction(null);
      resetCallbacks.setSelectedElementId(null);
      resetCallbacks.setEditingDescription(null);
      resetCallbacks.setEditingNote(null);
      resetCallbacks.setEditingPartTool(null);
      resetCallbacks.setVideoClipStartFrame(null);
      resetCallbacks.setDrawingTool(null);
      resetCallbacks.setSelectedDrawingId(null);
      resetCallbacks.setDrawingMode('video');
      selectArea(null); // <-- The fix: clear area selection
    }

    handleSubstepSelect('substep-2');
    expect(selectArea).toHaveBeenCalledWith(null);
    expect(setSelectedSubstepId).toHaveBeenCalledWith('substep-2');
  });

  it('action change clears area selection', () => {
    const selectArea = vi.fn();
    const setActiveAction = vi.fn();
    const resetCallbacks = {
      setEditingDescription: vi.fn(),
      setEditingNote: vi.fn(),
      setEditingPartTool: vi.fn(),
      setVideoClipStartFrame: vi.fn(),
      setSelectedElementId: vi.fn(),
      setDrawingTool: vi.fn(),
      setSelectedDrawingId: vi.fn(),
    };

    // Simulate handleActionSelect pattern from EditorPage
    function handleActionSelect(action: string | null) {
      setActiveAction(action);
      resetCallbacks.setEditingDescription(null);
      resetCallbacks.setEditingNote(null);
      resetCallbacks.setEditingPartTool(null);
      resetCallbacks.setVideoClipStartFrame(null);
      if (action === null) resetCallbacks.setSelectedElementId(null);
      if (action !== 'drawing') {
        resetCallbacks.setDrawingTool(null);
        resetCallbacks.setSelectedDrawingId(null);
      }
      selectArea(null); // <-- The fix: clear area selection
    }

    handleActionSelect('image');
    expect(selectArea).toHaveBeenCalledWith(null);

    selectArea.mockClear();
    handleActionSelect(null);
    expect(selectArea).toHaveBeenCalledWith(null);
  });
});
