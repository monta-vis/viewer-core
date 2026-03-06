import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { Playhead } from './Playhead';

afterEach(cleanup);

const baseProps = {
  position: 50,
  trackHeight: 4,
  currentTime: 3.5,
  currentFrame: 105,
  fps: 30,
};

describe('Playhead', () => {
  it('renders at correct position percentage', () => {
    render(<Playhead {...baseProps} />);
    const playhead = screen.getByTestId('playhead');
    expect(playhead.style.left).toBe('50%');
  });

  it('renders with correct track height', () => {
    render(<Playhead {...baseProps} />);
    const playhead = screen.getByTestId('playhead');
    expect(playhead.style.height).toBe('4rem');
  });

  it('shows tooltip on hover', () => {
    render(<Playhead {...baseProps} />);
    const playhead = screen.getByTestId('playhead');
    fireEvent.mouseEnter(playhead);
    expect(screen.getByText('00:03:15')).toBeInTheDocument();
    expect(screen.getByText('Frame 105')).toBeInTheDocument();
  });

  it('hides tooltip when not hovered', () => {
    render(<Playhead {...baseProps} />);
    expect(screen.queryByText('Frame 105')).not.toBeInTheDocument();
  });

  it('formats time as MM:SS:FF', () => {
    // 125.5 seconds = 2 min 5 sec 15 frames (at 30fps)
    render(<Playhead {...baseProps} currentTime={125.5} />);
    const playhead = screen.getByTestId('playhead');
    fireEvent.mouseEnter(playhead);
    expect(screen.getByText('02:05:15')).toBeInTheDocument();
  });

  it('calls onDragStart/onDrag/onDragEnd during drag sequence', () => {
    const onDragStart = vi.fn();
    const onDrag = vi.fn();
    const onDragEnd = vi.fn();

    render(
      <Playhead
        {...baseProps}
        onDragStart={onDragStart}
        onDrag={onDrag}
        onDragEnd={onDragEnd}
      />,
    );

    // Create a mock timeline track element
    const track = document.createElement('div');
    track.setAttribute('data-timeline-track', '');
    Object.defineProperty(track, 'getBoundingClientRect', {
      value: () => ({ left: 0, width: 1000, top: 0, height: 100 }),
    });
    document.body.appendChild(track);

    const playhead = screen.getByTestId('playhead');

    act(() => {
      fireEvent.mouseDown(playhead);
    });
    expect(onDragStart).toHaveBeenCalledTimes(1);

    act(() => {
      fireEvent.mouseMove(document, { clientX: 500 });
    });
    expect(onDrag).toHaveBeenCalledWith(50, 50);

    act(() => {
      fireEvent.mouseUp(document);
    });
    expect(onDragEnd).toHaveBeenCalledTimes(1);

    document.body.removeChild(track);
  });

  it('clamps drag position to 0-100', () => {
    const onDrag = vi.fn();

    render(<Playhead {...baseProps} onDrag={onDrag} />);

    const track = document.createElement('div');
    track.setAttribute('data-timeline-track', '');
    Object.defineProperty(track, 'getBoundingClientRect', {
      value: () => ({ left: 0, width: 1000, top: 0, height: 100 }),
    });
    document.body.appendChild(track);

    const playhead = screen.getByTestId('playhead');

    act(() => {
      fireEvent.mouseDown(playhead);
    });

    // Move beyond right edge
    act(() => {
      fireEvent.mouseMove(document, { clientX: 1500 });
    });
    expect(onDrag).toHaveBeenCalledWith(100, 150);

    // Move beyond left edge
    act(() => {
      fireEvent.mouseMove(document, { clientX: -200 });
    });
    expect(onDrag).toHaveBeenCalledWith(0, -20);

    act(() => {
      fireEvent.mouseUp(document);
    });

    document.body.removeChild(track);
  });
});
