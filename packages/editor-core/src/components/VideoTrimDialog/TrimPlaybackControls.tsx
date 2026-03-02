/**
 * Playback controls for video trimming.
 *
 * Centered play/pause button with time display.
 */

import { Play, Pause } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@monta-vis/viewer-core';
import { formatTimecode } from '../../utils/trimUtils';

export interface TrimPlaybackControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
}

export function TrimPlaybackControls({
  isPlaying,
  currentTime,
  duration,
  onTogglePlay,
}: TrimPlaybackControlsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center gap-4 py-2">
      {/* Play/Pause button */}
      <Button
        variant="secondary"
        size="sm"
        onClick={onTogglePlay}
        aria-label={isPlaying ? t('editorCore.videoTrim.pause', 'Pause') : t('editorCore.videoTrim.play', 'Play')}
      >
        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
      </Button>

      {/* Time display */}
      <div className="font-mono text-sm text-[var(--color-text-base)]">
        <span>{formatTimecode(currentTime)}</span>
        <span className="text-[var(--color-text-muted)] mx-1">/</span>
        <span className="text-[var(--color-text-muted)]">{formatTimecode(duration)}</span>
      </div>
    </div>
  );
}
