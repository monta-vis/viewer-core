import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { clsx } from 'clsx';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { IconButton, Button } from '@/components/ui';
import { useVideo } from '../context/VideoContext';

const PLAYBACK_SPEEDS = [0.25, 0.5, 1, 1.5, 2, 4, 8];
const FRAME_STEPS = [-10, -1, 1, 10];

interface PlaybackControlsProps {
  /** Show frame step buttons */
  showFrameSteps?: boolean;
  /** Show playback speed selector */
  showSpeedSelector?: boolean;
  /** Show progress slider */
  showProgressSlider?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * PlaybackControls Component
 *
 * Provides play/pause, frame stepping, and speed controls.
 * Reads/writes to VideoContext.
 */
export function PlaybackControls({
  showFrameSteps = true,
  showSpeedSelector = true,
  showProgressSlider = true,
  className,
}: PlaybackControlsProps) {
  const { t } = useTranslation();
  const {
    isPlaying,
    isReady,
    playbackSpeed,
    currentTime,
    currentFrame,
    duration,
    totalFrames,
    fps,
    togglePlayback,
    stepFrames,
    setPlaybackSpeed,
    seek,
  } = useVideo();

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * fps);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTime = parseFloat(e.target.value);
      seek(newTime);
    },
    [seek]
  );

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      {/* Progress slider */}
      {showProgressSlider && (
        <div className="relative w-full h-1 group">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={1 / fps}
            value={currentTime}
            onChange={handleSliderChange}
            disabled={!isReady}
            className={clsx(
              'w-full h-1 appearance-none cursor-pointer',
              'bg-[var(--color-bg-elevated)] rounded-full',
              '[&::-webkit-slider-thumb]:appearance-none',
              '[&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3',
              '[&::-webkit-slider-thumb]:rounded-full',
              '[&::-webkit-slider-thumb]:bg-[var(--color-accent-primary)]',
              '[&::-webkit-slider-thumb]:cursor-pointer',
              '[&::-webkit-slider-thumb]:opacity-0 group-hover:[&::-webkit-slider-thumb]:opacity-100',
              '[&::-webkit-slider-thumb]:transition-opacity',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            style={{
              background: `linear-gradient(to right, var(--color-accent-primary) ${progress}%, var(--color-bg-elevated) ${progress}%)`,
            }}
          />
        </div>
      )}

      {/* Controls row */}
      <div className="flex items-center gap-2">
        {/* Frame step buttons */}
        {showFrameSteps && (
          <div className="flex items-center gap-0.5">
            <IconButton
              icon={<SkipBack className="h-3 w-3" />}
              aria-label={t('shortcuts.back10Frames')}
              variant="ghost"
              size="sm"
              onClick={() => stepFrames(-10)}
              disabled={!isReady}
            />
            {FRAME_STEPS.slice(1, 3).map((step) => (
              <Button
                key={step}
                variant="ghost"
                size="sm"
                onClick={() => stepFrames(step)}
                disabled={!isReady}
                className="text-xs min-w-[1.75rem] px-1"
              >
                {step > 0 ? `+${step}` : step}
              </Button>
            ))}
            <IconButton
              icon={<SkipForward className="h-3 w-3" />}
              aria-label={t('shortcuts.forward10Frames')}
              variant="ghost"
              size="sm"
              onClick={() => stepFrames(10)}
              disabled={!isReady}
            />
          </div>
        )}

        {/* Play/Pause */}
        <IconButton
          icon={isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          aria-label={t('shortcuts.playPause')}
          variant="primary"
          size="sm"
          onClick={togglePlayback}
          disabled={!isReady}
        />

        {/* Timecode & Frame display */}
        <div className="flex items-center gap-2 px-2">
          <span className="font-mono text-xs text-[var(--color-text-muted)]">
            {formatTime(currentTime)}
          </span>
          <span className="text-[var(--color-text-muted)]">/</span>
          <span className="font-mono text-xs text-[var(--color-text-muted)]">
            {formatTime(duration)}
          </span>
          <span className="ml-2 px-2 py-0.5 rounded bg-[var(--color-bg-elevated)] font-mono text-xs">
            F: {currentFrame} / {totalFrames}
          </span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Playback speed */}
        {showSpeedSelector && (
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
            disabled={!isReady}
            className={clsx(
              'text-xs px-2 py-1 rounded',
              'bg-[var(--color-bg-elevated)] border border-[var(--color-border-base)]',
              'text-[var(--color-text-base)]',
              'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]',
              'disabled:opacity-50'
            )}
          >
            {PLAYBACK_SPEEDS.map((speed) => (
              <option key={speed} value={speed}>
                {speed}x
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
