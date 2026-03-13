import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResolvedImageView } from './ResolvedImageView';
import type { ResolvedImage } from '@/lib/mediaResolver';

// Mock VideoFrameCapture since it uses video/canvas APIs
vi.mock('./VideoFrameCapture', () => ({
  VideoFrameCapture: (props: Record<string, unknown>) => (
    <div data-testid="video-frame-capture" data-frame={props.frameNumber} />
  ),
}));

describe('ResolvedImageView', () => {
  it('renders <img> for url kind', () => {
    const image: ResolvedImage = { kind: 'url', url: 'https://example.com/image.jpg' };
    render(<ResolvedImageView image={image} alt="test image" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
    expect(img).toHaveAttribute('alt', 'test image');
  });

  it('renders VideoFrameCapture for frameCapture kind', () => {
    const image: ResolvedImage = {
      kind: 'frameCapture',
      data: {
        videoSrc: 'mvis-media://proj/video.mp4',
        videoId: 'vid1',
        fps: 25,
        frameNumber: 42,
        cropArea: { x: 0.1, y: 0.2, width: 0.5, height: 0.6 },
      },
    };
    render(<ResolvedImageView image={image} alt="frame capture" />);
    const capture = screen.getByTestId('video-frame-capture');
    expect(capture).toBeInTheDocument();
    expect(capture).toHaveAttribute('data-frame', '42');
  });

  it('renders nothing for null', () => {
    const { container } = render(<ResolvedImageView image={null} />);
    expect(container.innerHTML).toBe('');
  });
});
