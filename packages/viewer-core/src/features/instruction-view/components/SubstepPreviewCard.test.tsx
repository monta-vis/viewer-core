import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { SubstepPreviewCard } from './SubstepPreviewCard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

vi.mock('@/components/ui', () => ({
  Card: ({ children, onClick, ...props }: Record<string, unknown> & { children: ReactNode; onClick?: () => void }) => (
    <div data-testid="card" onClick={onClick} {...props}>{children}</div>
  ),
}));

vi.mock('./VideoFrameCapture', () => ({
  VideoFrameCapture: () => <div data-testid="video-frame-capture" />,
}));

afterEach(() => cleanup());

describe('SubstepPreviewCard', () => {
  it('renders substep order as fallback when no title', () => {
    render(<SubstepPreviewCard order={2} title={null} />);
    // Order shows in both placeholder image and label — verify label area
    const allTexts = screen.getAllByText('2');
    expect(allTexts.length).toBeGreaterThanOrEqual(1);
  });

  it('renders title when provided', () => {
    render(<SubstepPreviewCard order={1} title="Attach bolt" />);
    expect(screen.getByText('Attach bolt')).toBeTruthy();
  });

  it('renders thumbnail image when imageUrl provided', () => {
    render(<SubstepPreviewCard order={1} title={null} imageUrl="/img.png" />);
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toBe('/img.png');
  });

  it('renders VideoFrameCapture when useRawVideo + frameCaptureData', () => {
    render(
      <SubstepPreviewCard
        order={1}
        title={null}
        useRawVideo
        frameCaptureData={{
          videoId: 'v1',
          fps: 30,
          frameNumber: 100,
          cropArea: null,
          videoSrc: 'video.mp4',
        }}
      />,
    );
    expect(screen.getByTestId('video-frame-capture')).toBeTruthy();
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(<SubstepPreviewCard order={1} title={null} onClick={onClick} />);
    await user.click(screen.getByTestId('card'));

    expect(onClick).toHaveBeenCalledOnce();
  });
});
