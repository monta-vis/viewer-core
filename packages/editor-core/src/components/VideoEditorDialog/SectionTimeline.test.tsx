import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

import { SectionTimeline } from './SectionTimeline';

afterEach(cleanup);

describe('SectionTimeline', () => {
  const baseProps = {
    sections: [
      { startFrame: 0, endFrame: 90 },
      { startFrame: 90, endFrame: 180 },
    ],
    totalFrames: 300,
    fps: 30,
    selectedIndex: 0,
    onSelectSection: vi.fn(),
    onSectionChange: vi.fn(),
    onSeek: vi.fn(),
  };

  it('renders a section bar for each section', () => {
    render(<SectionTimeline {...baseProps} />);
    const bars = screen.getAllByTestId('video-section-bar');
    expect(bars).toHaveLength(2);
  });

  it('calls onSelectSection when section bar is clicked', () => {
    const onSelectSection = vi.fn();
    render(
      <SectionTimeline {...baseProps} onSelectSection={onSelectSection} />,
    );
    const bars = screen.getAllByTestId('video-section-bar');
    fireEvent.click(bars[1]);
    expect(onSelectSection).toHaveBeenCalledWith(1);
  });

  it('renders drag handles for each section', () => {
    render(<SectionTimeline {...baseProps} />);
    const leftHandles = screen.getAllByTestId('section-handle-left');
    const rightHandles = screen.getAllByTestId('section-handle-right');
    expect(leftHandles).toHaveLength(2);
    expect(rightHandles).toHaveLength(2);
  });

  it('calls onSeek when empty area of timeline is clicked', () => {
    const onSeek = vi.fn();
    render(<SectionTimeline {...baseProps} onSeek={onSeek} />);
    const track = screen.getByTestId('section-timeline-track');
    Object.defineProperty(track, 'getBoundingClientRect', {
      value: () => ({ left: 0, width: 300, top: 0, height: 40 }),
    });
    fireEvent.click(track, { clientX: 150 });
    // 150/300 * 300 = 150 frames
    expect(onSeek).toHaveBeenCalledWith(150);
  });

  it('calls onSectionChange when drag handle is moved', () => {
    const onSectionChange = vi.fn();
    render(
      <SectionTimeline {...baseProps} onSectionChange={onSectionChange} />,
    );
    const rightHandles = screen.getAllByTestId('section-handle-right');
    const handle = rightHandles[0];

    // Simulate drag
    fireEvent.mouseDown(handle, { clientX: 90 });

    // We need to get the track for getBoundingClientRect
    const track = screen.getByTestId('section-timeline-track');
    Object.defineProperty(track, 'getBoundingClientRect', {
      value: () => ({ left: 0, width: 300, top: 0, height: 40 }),
    });

    fireEvent.mouseMove(document, { clientX: 120 });
    fireEvent.mouseUp(document);

    expect(onSectionChange).toHaveBeenCalled();
  });
});
