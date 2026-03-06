import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { ViewportKeyframeRow } from '@monta-vis/viewer-core';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

import { ViewportKeyframeTimeline } from './ViewportKeyframeTimeline';

afterEach(cleanup);

const makeKf = (
  frameNumber: number,
  interpolation: 'hold' | 'linear' = 'hold',
): ViewportKeyframeRow => ({
  id: `kf-${frameNumber}`,
  videoSectionId: 'sec-1',
  versionId: 'v1',
  frameNumber,
  x: 0.1,
  y: 0.1,
  width: 0.5,
  height: 0.5,
  interpolation,
});

describe('ViewportKeyframeTimeline', () => {
  const baseProps = {
    keyframes: [makeKf(0, 'hold'), makeKf(30, 'linear'), makeKf(60, 'hold')],
    totalFrames: 90,
    onSeek: vi.fn(),
    onContextMenu: vi.fn(),
  };

  it('renders a diamond marker for each keyframe', () => {
    render(<ViewportKeyframeTimeline {...baseProps} />);
    const markers = screen.getAllByTestId('keyframe-marker');
    expect(markers).toHaveLength(3);
  });

  it('positions markers based on frame/totalFrames ratio', () => {
    render(<ViewportKeyframeTimeline {...baseProps} />);
    const markers = screen.getAllByTestId('keyframe-marker');
    // frame 0/90 = 0%, frame 30/90 = 33.3%, frame 60/90 = 66.7%
    expect(markers[0].style.left).toBe('0%');
    expect(markers[1].style.left).toContain('33');
    expect(markers[2].style.left).toContain('66');
  });

  it('uses yellow color for hold keyframes', () => {
    render(<ViewportKeyframeTimeline {...baseProps} />);
    const markers = screen.getAllByTestId('keyframe-marker');
    expect(markers[0].className).toContain('text-yellow');
  });

  it('uses pink color for linear keyframes', () => {
    render(<ViewportKeyframeTimeline {...baseProps} />);
    const markers = screen.getAllByTestId('keyframe-marker');
    expect(markers[1].className).toContain('text-pink');
  });

  it('calls onSeek when timeline bar is clicked', () => {
    const onSeek = vi.fn();
    render(<ViewportKeyframeTimeline {...baseProps} onSeek={onSeek} />);
    const bar = screen.getByTestId('keyframe-timeline-bar');
    // Mock getBoundingClientRect
    Object.defineProperty(bar, 'getBoundingClientRect', {
      value: () => ({ left: 0, width: 900, top: 0, height: 20 }),
    });
    fireEvent.click(bar, { clientX: 300 });
    // 300/900 * 90 = 30
    expect(onSeek).toHaveBeenCalledWith(30);
  });

  it('calls onContextMenu when marker is right-clicked', () => {
    const onContextMenu = vi.fn();
    render(
      <ViewportKeyframeTimeline
        {...baseProps}
        onContextMenu={onContextMenu}
      />,
    );
    const markers = screen.getAllByTestId('keyframe-marker');
    fireEvent.contextMenu(markers[1], { clientX: 100, clientY: 50 });
    expect(onContextMenu).toHaveBeenCalledWith(
      expect.objectContaining({ frame: 30 }),
    );
  });
});
