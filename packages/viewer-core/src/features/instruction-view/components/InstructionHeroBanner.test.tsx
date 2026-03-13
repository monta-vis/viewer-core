import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { ReactNode } from 'react';
import { InstructionHeroBanner } from './InstructionHeroBanner';

vi.mock('./VideoFrameCapture', () => ({
  VideoFrameCapture: (props: Record<string, unknown>) => (
    <div data-testid="video-frame-capture" data-video-id={props.videoId as string} />
  ),
}));

vi.mock('@/components/ui', () => ({
  Card: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
}));

afterEach(() => cleanup());

describe('InstructionHeroBanner', () => {
  it('renders image from imageUrl', () => {
    render(
      <InstructionHeroBanner
        imageUrl="/images/cover.png"
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
        imageUrl="/img.png"
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

  it('renders VideoFrameCapture when frameCaptureData provided and useRawVideo is true', () => {
    const frameCaptureData = {
      videoSrc: 'mvis-media://folder/video.mp4',
      videoId: 'vid-1',
      fps: 30,
      frameNumber: 42,
    };

    render(
      <InstructionHeroBanner
        instructionName="Test"
        frameCaptureData={frameCaptureData}
        useRawVideo={true}
      />,
    );

    expect(screen.getByTestId('video-frame-capture')).toBeTruthy();
    expect(screen.getByTestId('video-frame-capture').getAttribute('data-video-id')).toBe('vid-1');
  });

  it('does not render VideoFrameCapture when useRawVideo is false', () => {
    const frameCaptureData = {
      videoSrc: 'mvis-media://folder/video.mp4',
      videoId: 'vid-1',
      fps: 30,
      frameNumber: 42,
    };

    render(
      <InstructionHeroBanner
        instructionName="Test"
        imageUrl="/img.png"
        frameCaptureData={frameCaptureData}
        useRawVideo={false}
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
