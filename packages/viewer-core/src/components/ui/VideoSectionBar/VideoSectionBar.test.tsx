import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

import { VideoSectionBar } from './VideoSectionBar';

describe('VideoSectionBar', () => {
  const baseProps = {
    index: 0,
    startFrame: 0,
    endFrame: 150,
    totalFrames: 300,
    fps: 30,
  };

  it('renders with correct width based on frame range', () => {
    const { container } = render(<VideoSectionBar {...baseProps} />);
    const bar = container.firstElementChild as HTMLElement;
    // 150/300 = 50%
    expect(bar.style.width).toBe('50%');
  });

  it('renders with correct left offset based on startFrame', () => {
    const { container } = render(
      <VideoSectionBar {...baseProps} startFrame={60} endFrame={150} />,
    );
    const bar = container.firstElementChild as HTMLElement;
    // left = 60/300 = 20%
    expect(bar.style.left).toBe('20%');
  });

  it('displays 1-based index badge', () => {
    render(<VideoSectionBar {...baseProps} index={2} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('displays duration label in seconds', () => {
    // 210 frames at 30fps = 7.0s
    render(
      <VideoSectionBar {...baseProps} startFrame={0} endFrame={210} />,
    );
    expect(screen.getByText('7.0s')).toBeInTheDocument();
  });

  it('applies selected ring when selected', () => {
    const { container } = render(
      <VideoSectionBar {...baseProps} selected />,
    );
    const bar = container.firstElementChild as HTMLElement;
    expect(bar.className).toContain('ring-2');
  });

  it('does not apply selected ring when not selected', () => {
    const { container } = render(<VideoSectionBar {...baseProps} />);
    const bar = container.firstElementChild as HTMLElement;
    expect(bar.className).not.toContain('ring-2');
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    const { container } = render(
      <VideoSectionBar {...baseProps} onClick={onClick} />,
    );
    fireEvent.click(container.firstElementChild as HTMLElement);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders children (handle slots)', () => {
    render(
      <VideoSectionBar {...baseProps}>
        <div data-testid="left-handle" />
        <div data-testid="right-handle" />
      </VideoSectionBar>,
    );
    expect(screen.getByTestId('left-handle')).toBeInTheDocument();
    expect(screen.getByTestId('right-handle')).toBeInTheDocument();
  });
});
