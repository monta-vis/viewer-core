import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { ReactNode } from 'react';
import { InstructionHeroBanner } from './InstructionHeroBanner';

vi.mock('./ResolvedImageView', () => ({
  ResolvedImageView: ({ image, alt, className }: { image: { kind: string; url?: string; data?: Record<string, unknown> } | null; alt: string; className?: string }) => {
    if (!image) return null;
    if (image.kind === 'url') return <img src={image.url} alt={alt} className={className} />;
    if (image.kind === 'frameCapture') return <div data-testid="video-frame-capture" data-video-id={(image.data as Record<string, unknown>)?.videoId as string} />;
    return null;
  },
}));

vi.mock('@/components/ui', () => ({
  Card: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
}));

afterEach(() => cleanup());

describe('InstructionHeroBanner', () => {
  it('renders image from url kind', () => {
    render(
      <InstructionHeroBanner
        image={{ kind: 'url', url: '/images/cover.png' }}
        instructionName="Test Instruction"
      />,
    );

    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toBe('/images/cover.png');
  });

  it('renders fallback icon when no image', () => {
    render(
      <InstructionHeroBanner instructionName="Test Instruction" />,
    );

    expect(screen.queryByRole('img')).toBeNull();
    // Should render the FileText SVG fallback
    const fallback = screen.getByTestId('card').querySelector('svg');
    expect(fallback).toBeTruthy();
  });

  it('displays instruction name (truncated via CSS)', () => {
    render(
      <InstructionHeroBanner
        image={{ kind: 'url', url: '/img.png' }}
        instructionName="Very Long Instruction Name That Should Be Truncated"
      />,
    );

    expect(screen.getByText('Very Long Instruction Name That Should Be Truncated')).toBeTruthy();
  });

  it('displays article number when present', () => {
    render(
      <InstructionHeroBanner
        instructionName="Test"
        articleNumber="ART-12345"
      />,
    );

    expect(screen.getByText('ART-12345')).toBeTruthy();
  });

  it('hides article number when null', () => {
    render(
      <InstructionHeroBanner
        instructionName="Test"
        articleNumber={null}
      />,
    );

    expect(screen.queryByText('ART-')).toBeNull();
  });

  it('renders VideoFrameCapture when image is frameCapture kind', () => {
    render(
      <InstructionHeroBanner
        instructionName="Test"
        image={{
          kind: 'frameCapture',
          data: {
            videoSrc: 'mvis-media://folder/video.mp4',
            videoId: 'vid-1',
            fps: 30,
            frameNumber: 42,
          },
        }}
      />,
    );

    expect(screen.getByTestId('video-frame-capture')).toBeTruthy();
    expect(screen.getByTestId('video-frame-capture').getAttribute('data-video-id')).toBe('vid-1');
  });

  it('renders image (not frame capture) for url kind', () => {
    render(
      <InstructionHeroBanner
        instructionName="Test"
        image={{ kind: 'url', url: '/img.png' }}
      />,
    );

    expect(screen.queryByTestId('video-frame-capture')).toBeNull();
    expect(screen.getByRole('img')).toBeTruthy();
  });

  it('renders upload button when renderUpload provided', () => {
    render(
      <InstructionHeroBanner
        instructionName="Test"
        renderUpload={() => <button data-testid="upload-btn">Upload</button>}
      />,
    );

    expect(screen.getByTestId('upload-btn')).toBeTruthy();
  });

  it('does not render upload button when renderUpload not provided', () => {
    render(
      <InstructionHeroBanner instructionName="Test" />,
    );

    expect(screen.queryByTestId('upload-btn')).toBeNull();
  });
});
