import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Film, Scissors, Crop, X } from 'lucide-react';
import { DialogShell, Button, IconButton } from '@monta-vis/viewer-core';
import { useVideoPlayback } from '../hooks/useVideoPlayback';
import { TrimPlaybackControls } from './VideoTrimDialog/TrimPlaybackControls';
import { Playhead } from './VideoEditorDialog/Playhead';
import { SectionTimeline, type SectionData } from './VideoEditorDialog/SectionTimeline';
import { timeToFrame } from './VideoEditorDialog/viewportUtils';

const DEFAULT_FPS = 30;

export interface VideoTrimDialogProps {
  open: boolean;
  file: File | null;
  onConfirm: (result: { file: File; sections: SectionData[] | null }) => void;
  onClose: () => void;
}

export function VideoTrimDialog({ open, file, onConfirm, onClose }: VideoTrimDialogProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [videoUrl, setVideoUrl] = useState('');
  useEffect(() => {
    if (!file) {
      setVideoUrl('');
      return;
    }
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const playback = useVideoPlayback(videoRef, videoUrl);

  const totalFrames = Math.round(playback.duration * DEFAULT_FPS);
  const currentFrame = timeToFrame(playback.currentTime, DEFAULT_FPS);
  const currentPercent = totalFrames > 0 ? (currentFrame / totalFrames) * 100 : 0;

  // Section state
  const [sections, setSections] = useState<SectionData[]>([{ startFrame: 0, endFrame: 0 }]);
  const [selectedSection, setSelectedSection] = useState(0);

  // Reset when dialog opens with new file, and initialize when duration is available
  const prevFileRef = useRef<File | null>(null);
  useEffect(() => {
    if (open && file !== prevFileRef.current) {
      prevFileRef.current = file;
      setSections([{ startFrame: 0, endFrame: 0 }]);
      setSelectedSection(0);
    }
  }, [open, file]);

  useEffect(() => {
    if (playback.duration > 0) {
      const frames = Math.round(playback.duration * DEFAULT_FPS);
      setSections((prev) => {
        // Only initialize if sections haven't been edited yet (single section at 0,0 or matching full video)
        if (prev.length === 1 && prev[0].startFrame === 0 && (prev[0].endFrame === 0 || prev[0].endFrame === frames)) {
          return [{ startFrame: 0, endFrame: frames }];
        }
        return prev;
      });
    }
  }, [playback.duration]);

  const handleSeekPercent = useCallback(
    (percent: number) => {
      const frame = Math.round((percent / 100) * totalFrames);
      playback.seek(frame / DEFAULT_FPS);
    },
    [totalFrames, playback.seek],
  );

  const handleSeekFrame = useCallback(
    (frame: number) => {
      playback.seek(frame / DEFAULT_FPS);
    },
    [playback.seek],
  );

  const handleSectionChange = useCallback(
    (index: number, section: SectionData) => {
      setSections((prev) => {
        const next = [...prev];
        next[index] = section;
        return next;
      });
    },
    [],
  );

  // Split logic
  const selectedSec = sections[selectedSection];
  const canSplit =
    selectedSec &&
    currentFrame > selectedSec.startFrame + 1 &&
    currentFrame < selectedSec.endFrame - 1;

  const handleSplit = useCallback(() => {
    if (!canSplit) return;
    setSections((prev) => {
      const sec = prev[selectedSection];
      const left: SectionData = { startFrame: sec.startFrame, endFrame: currentFrame };
      const right: SectionData = { startFrame: currentFrame, endFrame: sec.endFrame };
      const next = [...prev];
      next.splice(selectedSection, 1, left, right);
      return next;
    });
    // Select the right section after split
    setSelectedSection(selectedSection + 1);
  }, [canSplit, selectedSection, currentFrame]);

  // Delete section (Delete/Backspace key)
  const handleDeleteSection = useCallback(() => {
    if (sections.length <= 1) return;
    setSections((prev) => {
      const next = [...prev];
      next.splice(selectedSection, 1);
      return next;
    });
    setSelectedSection((prev) => Math.min(prev, sections.length - 2));
  }, [sections.length, selectedSection]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Don't intercept if focus is on an input element
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        handleDeleteSection();
      }
    };
    if (open) {
      document.addEventListener('keydown', handler);
      return () => document.removeEventListener('keydown', handler);
    }
  }, [open, handleDeleteSection]);

  const handleConfirm = useCallback(() => {
    if (!file) return;
    // If single section covering full video, pass null
    if (
      sections.length === 1 &&
      sections[0].startFrame === 0 &&
      sections[0].endFrame === totalFrames
    ) {
      onConfirm({ file, sections: null });
    } else {
      onConfirm({ file, sections });
    }
  }, [file, sections, totalFrames, onConfirm]);

  if (!file) return null;

  return (
    <DialogShell open={open} onClose={onClose} maxWidth="max-w-4xl" className="p-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Film className="h-5 w-5 text-[var(--color-text-muted)]" />
          <h2 className="text-base font-semibold text-[var(--color-text-base)]">
            {t('editorCore.videoEditor.title', 'Edit Video')}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <IconButton
            icon={<Crop className="h-4 w-4" />}
            variant="ghost"
            size="sm"
            disabled
            aria-label={t('editorCore.videoTrim.crop', 'Crop (coming soon)')}
          />
          <IconButton
            icon={<Scissors className="h-4 w-4" />}
            variant="ghost"
            size="sm"
            disabled={!canSplit}
            onClick={handleSplit}
            aria-label={t('editorCore.videoTrim.split', 'Split section')}
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleConfirm}
            data-testid="video-editor-save"
          >
            {t('editorCore.save', 'Save')}
          </Button>
          <IconButton
            icon={<X className="h-4 w-4" />}
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label={t('editorCore.close', 'Close')}
            data-testid="video-editor-cancel"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-3 p-4">
        {/* Video */}
        <div className="relative w-full aspect-video bg-black rounded overflow-hidden">
          <video
            ref={videoRef}
            src={videoUrl || undefined}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Playback controls */}
        <TrimPlaybackControls
          isPlaying={playback.isPlaying}
          currentTime={playback.currentTime}
          duration={playback.duration}
          onTogglePlay={playback.togglePlay}
          fps={DEFAULT_FPS}
        />

        {/* Timeline with sections + playhead */}
        <div className="shrink-0 relative" data-timeline-track>
          <SectionTimeline
            sections={sections}
            totalFrames={totalFrames}
            fps={DEFAULT_FPS}
            selectedIndex={selectedSection}
            onSelectSection={setSelectedSection}
            onSectionChange={handleSectionChange}
            onSeek={handleSeekFrame}
          />
          <Playhead
            position={currentPercent}
            trackHeight={2}
            currentTime={playback.currentTime}
            currentFrame={currentFrame}
            fps={DEFAULT_FPS}
            onDrag={handleSeekPercent}
          />
        </div>
      </div>
    </DialogShell>
  );
}
