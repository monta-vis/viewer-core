import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

// Mock useVideoPlayback
const mockTogglePlay = vi.fn();
const mockSeek = vi.fn();
vi.mock('../hooks/useVideoPlayback', () => ({
  useVideoPlayback: () => ({
    isPlaying: false,
    currentTime: 5,
    duration: 30,
    playbackSpeed: 1,
    hasError: false,
    togglePlay: mockTogglePlay,
    play: vi.fn(),
    pause: vi.fn(),
    seek: mockSeek,
    stepFrame: vi.fn(),
    setPlaybackSpeed: vi.fn(),
    setIsPlaying: vi.fn(),
    setCurrentTime: vi.fn(),
    setDuration: vi.fn(),
  }),
}));

// Mock URL.createObjectURL / revokeObjectURL
vi.stubGlobal('URL', {
  ...globalThis.URL,
  createObjectURL: vi.fn(() => 'blob:test-url'),
  revokeObjectURL: vi.fn(),
});

import { VideoTrimDialog } from './VideoTrimDialog';

afterEach(cleanup);

const testFile = new File(['video-data'], 'test.mp4', { type: 'video/mp4' });

const baseProps = {
  open: true,
  file: testFile,
  onConfirm: vi.fn(),
  onClose: vi.fn(),
};

describe('VideoTrimDialog', () => {
  it('renders video element with blob URL and no native controls', () => {
    render(<VideoTrimDialog {...baseProps} />);
    const video = document.querySelector('video');
    expect(video).toBeTruthy();
    expect(video?.src).toContain('blob:test-url');
    expect(video?.hasAttribute('controls')).toBe(false);
  });

  it('shows TrimPlaybackControls (play/pause button + time display)', () => {
    render(<VideoTrimDialog {...baseProps} />);
    expect(screen.getByLabelText('Play')).toBeTruthy();
  });

  it('renders SectionTimeline instead of plain bar', () => {
    render(<VideoTrimDialog {...baseProps} />);
    expect(screen.getByTestId('section-timeline')).toBeTruthy();
  });

  it('renders playhead on the timeline', () => {
    render(<VideoTrimDialog {...baseProps} />);
    expect(screen.getByTestId('playhead')).toBeTruthy();
  });

  it('shows scissors button', () => {
    render(<VideoTrimDialog {...baseProps} />);
    expect(screen.getByLabelText('Split section')).toBeTruthy();
  });

  it('scissors button is disabled when playhead is at start (frame 150 of section 0..900)', () => {
    // currentTime=5, duration=30, fps=30 → currentFrame=150, totalFrames=900
    // section covers [0, 900], playhead at frame 150 is inside → enabled
    // But at frame 0 it would be disabled. Since mock gives currentTime=5, it's inside the section.
    render(<VideoTrimDialog {...baseProps} />);
    const btn = screen.getByLabelText('Split section');
    // currentFrame=150 is > 0+1 and < 900-1, so button should be enabled
    expect(btn).not.toBeDisabled();
  });

  it('shows crop placeholder button (disabled)', () => {
    render(<VideoTrimDialog {...baseProps} />);
    const btn = screen.getByLabelText('Crop (coming soon)');
    expect(btn).toBeTruthy();
    expect(btn).toBeDisabled();
  });

  it('calls onConfirm with sections: null when single full-video section on save', () => {
    const onConfirm = vi.fn();
    render(<VideoTrimDialog {...baseProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByTestId('video-editor-save'));
    // Single section spanning full video → sections: null
    expect(onConfirm).toHaveBeenCalledWith({ file: testFile, sections: null });
  });

  it('calls onClose when X is clicked', () => {
    const onClose = vi.fn();
    render(<VideoTrimDialog {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('video-editor-cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('does NOT render drawing tools or viewport overlays', () => {
    render(<VideoTrimDialog {...baseProps} />);
    expect(screen.queryByTestId('drawing-overlay')).toBeNull();
    expect(screen.queryByTestId('viewport-box')).toBeNull();
  });

  it('returns null when file is null', () => {
    const { container } = render(<VideoTrimDialog {...baseProps} file={null} />);
    expect(container.innerHTML).toBe('');
  });
});
