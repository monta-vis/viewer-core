/**
 * Dialog for trimming video before upload.
 *
 * Users can mark cut regions (parts to remove) on a timeline.
 * Returns trim metadata - original video uploads unchanged.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Scissors } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DialogShell, Button, IconButton } from '@monta-vis/viewer-core';
import { useVideoPlayback } from '../../hooks/useVideoPlayback';
import { TrimVideoPlayer } from './TrimVideoPlayer';
import { TrimTimeline } from './TrimTimeline';
import { TrimPlaybackControls } from './TrimPlaybackControls';
import type { CutRegion, TrimData, TrimmedFile } from '../../types/trim.types';

export interface VideoTrimDialogProps {
  file: File;
  /** Initial trim data when re-editing an existing trimmed file */
  initialTrimData?: TrimData | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (result: TrimmedFile) => void;
}

export function VideoTrimDialog({
  file,
  initialTrimData,
  open,
  onClose,
  onConfirm,
}: VideoTrimDialogProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  // Initialize regions from initialTrimData if provided
  const [regions, setRegions] = useState<CutRegion[]>(initialTrimData?.regions ?? []);

  const playback = useVideoPlayback(videoRef);

  const handleApplyTrim = useCallback(() => {
    const trimData: TrimData | null =
      regions.length > 0
        ? {
            regions: [...regions],
            videoDuration: playback.duration,
          }
        : null;

    onConfirm({ file, trimData });
  }, [file, regions, playback.duration, onConfirm]);

  // Reset regions when dialog closes
  useEffect(() => {
    if (!open) {
      setRegions(initialTrimData?.regions ?? []);
    }
  }, [open, initialTrimData?.regions]);

  return (
    <DialogShell open={open} onClose={onClose} maxWidth="max-w-4xl" className="p-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-base)]">
        <div className="flex items-center gap-3">
          <Scissors className="w-5 h-5 text-[var(--color-primary)]" />
          <h2 className="text-lg font-semibold text-[var(--color-text-base)]">
            {t('editorCore.videoTrim.title', 'Trim Video')}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={handleApplyTrim}>
            {t('common.save', 'Save')}
          </Button>
          <IconButton
            icon={<X />}
            variant="ghost"
            size="sm"
            aria-label={t('common.close', 'Close')}
            onClick={onClose}
          />
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-4 space-y-4">
        {/* File name */}
        <p className="text-sm text-[var(--color-text-muted)] truncate">{file.name}</p>

        {/* Video player */}
        <TrimVideoPlayer
          ref={videoRef}
          file={file}
        />

        {/* Playback controls */}
        <TrimPlaybackControls
          isPlaying={playback.isPlaying}
          currentTime={playback.currentTime}
          duration={playback.duration}
          onTogglePlay={playback.togglePlay}
        />

        {/* Timeline */}
        <TrimTimeline
          duration={playback.duration}
          currentTime={playback.currentTime}
          regions={regions}
          onSeek={playback.seek}
          onRegionsChange={setRegions}
        />

        {/* Instructions */}
        <p className="text-xs text-[var(--color-text-muted)]">
          {t('editorCore.videoTrim.instructions', 'Double-click on the timeline to add a cut region. Drag edges to create cuts from start/end.')}
        </p>
      </div>

    </DialogShell>
  );
}
