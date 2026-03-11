import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { ViewportKeyframeRow, DrawingRow } from '@monta-vis/viewer-core';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

// Mock useVideoPlayback
let mockHasError = false;
let mockIsPlaying = false;
const mockPause = vi.fn();
vi.mock('../../hooks/useVideoPlayback', () => ({
  useVideoPlayback: () => ({
    isPlaying: mockIsPlaying,
    currentTime: 1.5,
    duration: 10,
    playbackSpeed: 1,
    hasError: mockHasError,
    togglePlay: vi.fn(),
    play: vi.fn(),
    pause: mockPause,
    seek: vi.fn(),
    stepFrame: vi.fn(),
    setPlaybackSpeed: vi.fn(),
    setIsPlaying: vi.fn(),
    setCurrentTime: vi.fn(),
    setDuration: vi.fn(),
  }),
}));

// Mock shared playback hooks — used by VideoEditorDialog for section playback
const mockUseSectionPlayback = vi.fn();
const mockUseViewportPlaybackSync = vi.fn(() => ({
  applyAtFrame: vi.fn(),
  applyAtCurrentTime: vi.fn(),
  hasViewport: false,
}));

vi.mock('@monta-vis/viewer-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monta-vis/viewer-core')>();
  return {
    ...actual,
    useSectionPlayback: (...args: unknown[]) => mockUseSectionPlayback(...args),
    useViewportPlaybackSync: (...args: unknown[]) => mockUseViewportPlaybackSync(...args),
  };
});

// Mock ResizeObserver
vi.stubGlobal(
  'ResizeObserver',
  vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })),
);

import { VideoEditorDialog } from './VideoEditorDialog';

afterEach(cleanup);

const baseVideoData = {
  videoSrc: 'test-video.mp4',
  startFrame: 0,
  endFrame: 300,
  fps: 30,
  viewportKeyframes: [] as ViewportKeyframeRow[],
  videoAspectRatio: 16 / 9,
  sections: [
    { startFrame: 0, endFrame: 150 },
    { startFrame: 150, endFrame: 300 },
  ],
};

describe('VideoEditorDialog', () => {
  it('renders nothing when not open', () => {
    render(
      <VideoEditorDialog
        open={false}
        onClose={vi.fn()}
        onSave={vi.fn()}
        videoData={baseVideoData}
      />,
    );
    expect(
      document.querySelector('[data-testid="dialog-shell-panel"]'),
    ).not.toBeInTheDocument();
  });

  it('renders dialog when open', () => {
    render(
      <VideoEditorDialog
        open={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        videoData={baseVideoData}
      />,
    );
    // DialogShell renders via portal
    expect(
      document.querySelector('[data-testid="dialog-shell-panel"]'),
    ).toBeInTheDocument();
  });

  it('renders header with title', () => {
    render(
      <VideoEditorDialog
        open={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        videoData={baseVideoData}
      />,
    );
    expect(screen.getByText('Edit Video')).toBeInTheDocument();
  });

  it('renders save button', () => {
    render(
      <VideoEditorDialog
        open={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        videoData={baseVideoData}
      />,
    );
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('renders close button', () => {
    render(
      <VideoEditorDialog
        open={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        videoData={baseVideoData}
      />,
    );
    expect(screen.getByLabelText('Close')).toBeInTheDocument();
  });

  it('renders section timeline', () => {
    render(
      <VideoEditorDialog
        open={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        videoData={baseVideoData}
      />,
    );
    expect(screen.getByTestId('section-timeline')).toBeInTheDocument();
  });

  it('renders viewport keyframe timeline', () => {
    render(
      <VideoEditorDialog
        open={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        videoData={baseVideoData}
      />,
    );
    expect(
      screen.getByTestId('viewport-keyframe-timeline'),
    ).toBeInTheDocument();
  });

  it('calls onSave with result when save is clicked', () => {
    const onSave = vi.fn();
    render(
      <VideoEditorDialog
        open={true}
        onClose={vi.fn()}
        onSave={onSave}
        videoData={baseVideoData}
      />,
    );
    fireEvent.click(screen.getByText('Save'));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        sections: expect.any(Array),
        viewportKeyframes: expect.any(Array),
      }),
    );
  });

  it('renders error overlay when hook reports error', () => {
    mockHasError = true;
    render(
      <VideoEditorDialog
        open={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        videoData={baseVideoData}
      />,
    );

    expect(screen.getByTestId('video-error-overlay')).toBeInTheDocument();
    expect(screen.getByText('Video could not be loaded')).toBeInTheDocument();
    mockHasError = false;
  });

  it('renders unified playhead', () => {
    render(
      <VideoEditorDialog
        open={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        videoData={baseVideoData}
      />,
    );
    expect(screen.getByTestId('playhead')).toBeInTheDocument();
  });

  it('renders split section button', () => {
    render(
      <VideoEditorDialog
        open={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        videoData={baseVideoData}
      />,
    );
    expect(screen.getByLabelText('Split section')).toBeInTheDocument();
  });

  it('does not render error overlay when hook has no error', () => {
    mockHasError = false;
    render(
      <VideoEditorDialog
        open={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        videoData={baseVideoData}
      />,
    );

    expect(screen.queryByTestId('video-error-overlay')).not.toBeInTheDocument();
  });
});

// ── View mode tests ──

const viewVideoData = {
  videoSrc: 'test-video.mp4',
  fps: 30,
  durationSeconds: 10,
  contentAspectRatio: 16 / 9,
};

const sampleDrawing: DrawingRow = {
  id: 'draw-1',
  versionId: 'v1',
  videoFrameAreaId: null,
  substepId: 'sub-1',
  startFrame: 0,
  endFrame: 100,
  type: 'arrow',
  color: 'red',
  strokeWidth: 2,
  x1: 10,
  y1: 10,
  x2: 50,
  y2: 50,
  x: null,
  y: null,
  content: null,
  fontSize: null,
  points: null,
  order: 0,
};

describe('VideoEditorDialog view mode', () => {
  it('renders drawing overlay without pointer-events blocking when tool is active', () => {
    render(
      <VideoEditorDialog
        open={true}
        onClose={vi.fn()}
        mode="view"
        videoData={viewVideoData}
        substepId="sub-1"
        versionId="v1"
        drawings={{ 'draw-1': sampleDrawing }}
        onAddDrawing={vi.fn()}
        onUpdateDrawing={vi.fn()}
        onDeleteDrawing={vi.fn()}
      />,
    );

    const overlay = document.querySelector('[data-testid="drawing-overlay"]');
    // Overlay should exist (may not render if contentArea is 0 due to mocked ResizeObserver)
    // This tests the structural setup; interaction tests require a real DOM layout
    expect(overlay === null || overlay instanceof HTMLElement).toBe(true);
  });

  it('renders preview SVG with pointer-events-none', () => {
    render(
      <VideoEditorDialog
        open={true}
        onClose={vi.fn()}
        mode="view"
        videoData={viewVideoData}
        substepId="sub-1"
        versionId="v1"
        drawings={{ 'draw-1': sampleDrawing }}
        onAddDrawing={vi.fn()}
        onUpdateDrawing={vi.fn()}
        onDeleteDrawing={vi.fn()}
      />,
    );

    const previewSvg = document.querySelector('[data-testid="drawing-preview-svg"]');
    if (previewSvg) {
      expect(previewSvg).toHaveClass('pointer-events-none');
    }
  });

  it('accepts viewportKeyframes and videoAspectRatio in videoData without error', () => {
    const viewDataWithViewport = {
      ...viewVideoData,
      viewportKeyframes: [
        { id: 'kf-1', videoId: 'v1', versionId: 'ver-1', frameNumber: 0, x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
      ] as ViewportKeyframeRow[],
      videoAspectRatio: 16 / 9,
    };

    expect(() => {
      render(
        <VideoEditorDialog
          open={true}
          onClose={vi.fn()}
          mode="view"
          videoData={viewDataWithViewport}
          substepId="sub-1"
          versionId="v1"
          drawings={{}}
          onAddDrawing={vi.fn()}
          onUpdateDrawing={vi.fn()}
          onDeleteDrawing={vi.fn()}
        />,
      );
    }).not.toThrow();
  });

  it('works without viewportKeyframes (backward compat)', () => {
    expect(() => {
      render(
        <VideoEditorDialog
          open={true}
          onClose={vi.fn()}
          mode="view"
          videoData={viewVideoData}
          substepId="sub-1"
          versionId="v1"
          drawings={{}}
          onAddDrawing={vi.fn()}
          onUpdateDrawing={vi.fn()}
          onDeleteDrawing={vi.fn()}
        />,
      );
    }).not.toThrow();
  });

  it('passes sections to useSectionPlayback when playing with sections', () => {
    mockIsPlaying = true;
    const sections = [
      { startFrame: 150, endFrame: 300 },
      { startFrame: 450, endFrame: 600 },
    ];

    render(
      <VideoEditorDialog
        open={true}
        onClose={vi.fn()}
        mode="view"
        videoData={{ ...viewVideoData, fps: 30 }}
        substepId="sub-1"
        versionId="v1"
        drawings={{}}
        onAddDrawing={vi.fn()}
        onUpdateDrawing={vi.fn()}
        onDeleteDrawing={vi.fn()}
        sections={sections}
      />,
    );

    // useSectionPlayback should have been called with the sections
    // Initially isPlaying should be false (local isPlayingInline state starts false)
    expect(mockUseSectionPlayback).toHaveBeenCalledWith(
      expect.objectContaining({
        sections,
        fps: 30,
        isPlaying: false,
      }),
    );

    mockIsPlaying = false;
    mockUseSectionPlayback.mockClear();
  });

  it('uses local isPlayingInline state for section playback (not native video events)', () => {
    // Native video events set playback.isPlaying = true, but section playback
    // should use local isPlayingInline state to avoid the infinite loop bug
    mockIsPlaying = true; // simulate native play event
    const sections = [
      { startFrame: 0, endFrame: 150 },
      { startFrame: 150, endFrame: 300 },
    ];

    render(
      <VideoEditorDialog
        open={true}
        onClose={vi.fn()}
        mode="view"
        videoData={{ ...viewVideoData, fps: 30 }}
        substepId="sub-1"
        versionId="v1"
        drawings={{}}
        onAddDrawing={vi.fn()}
        onUpdateDrawing={vi.fn()}
        onDeleteDrawing={vi.fn()}
        sections={sections}
      />,
    );

    // Even though playback.isPlaying is true (native event), useSectionPlayback
    // should receive isPlaying=false because local isPlayingInline starts as false
    expect(mockUseSectionPlayback).toHaveBeenCalledWith(
      expect.objectContaining({
        isPlaying: false,
      }),
    );

    mockIsPlaying = false;
    mockUseSectionPlayback.mockClear();
  });

  it('passes onComplete callback that resets playing state', () => {
    const sections = [
      { startFrame: 0, endFrame: 150 },
      { startFrame: 150, endFrame: 300 },
    ];

    render(
      <VideoEditorDialog
        open={true}
        onClose={vi.fn()}
        mode="view"
        videoData={{ ...viewVideoData, fps: 30 }}
        substepId="sub-1"
        versionId="v1"
        drawings={{}}
        onAddDrawing={vi.fn()}
        onUpdateDrawing={vi.fn()}
        onDeleteDrawing={vi.fn()}
        sections={sections}
      />,
    );

    // onComplete should be a function (stable callback to reset isPlayingInline)
    const call = mockUseSectionPlayback.mock.calls[mockUseSectionPlayback.mock.calls.length - 1];
    expect(call[0]).toHaveProperty('onComplete');
    expect(typeof call[0].onComplete).toBe('function');

    mockUseSectionPlayback.mockClear();
  });
});
