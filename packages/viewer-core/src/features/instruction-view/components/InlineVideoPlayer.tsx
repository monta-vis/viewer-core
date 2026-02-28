import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, AlertTriangle, Info, CheckCircle, AlertCircle, Package, Wrench } from 'lucide-react';
import clsx from 'clsx';

import { VideoPlayer, useVideo, useVideoViewportInterpolation } from '@/features/video-player';
import type { EnrichedSubstepVideoSection, EnrichedSubstepNote, EnrichedSubstepPartTool, SubstepDescriptionRow, ViewportKeyframeRow } from '@/features/instruction';
interface InlineVideoPlayerProps {
  videoSection: EnrichedSubstepVideoSection | null;
  viewportKeyframes: ViewportKeyframeRow[];
  onClose: () => void;
  videoSrc: string | null;
  videoFps: number;
  videoAspectRatio?: number;
  descriptions: SubstepDescriptionRow[];
  notes: EnrichedSubstepNote[];
  parts: EnrichedSubstepPartTool[];
  tools: EnrichedSubstepPartTool[];
  currentIndex: number;
  totalSubsteps: number;
  activityLogger?: {
    logSubstepViewed: (substepId: string, meta?: Record<string, unknown>) => void;
  };
  stepId?: string;
  substepId?: string;
  /** If true, uses raw video (startFrame/endFrame as-is). If false, exported file (starts at 0) */
  useRawVideo?: boolean;
}

const NOTE_ICONS = {
  Info: Info,
  Quality: CheckCircle,
  Warning: AlertTriangle,
  Critical: AlertCircle,
} as const;

const NOTE_STYLES = {
  Info: {
    text: 'text-[var(--color-note-info-text)]',
    bg: 'bg-[var(--color-note-info-bg)]',
    border: 'border-[var(--color-note-info-border)]',
  },
  Quality: {
    text: 'text-[var(--color-note-quality-text)]',
    bg: 'bg-[var(--color-note-quality-bg)]',
    border: 'border-[var(--color-note-quality-border)]',
  },
  Warning: {
    text: 'text-[var(--color-note-warning-text)]',
    bg: 'bg-[var(--color-note-warning-bg)]',
    border: 'border-[var(--color-note-warning-border)]',
  },
  Critical: {
    text: 'text-[var(--color-note-critical-text)]',
    bg: 'bg-[var(--color-note-critical-bg)]',
    border: 'border-[var(--color-note-critical-border)]',
  },
} as const;

export function InlineVideoPlayer({
  videoSection,
  viewportKeyframes,
  onClose,
  videoSrc,
  videoFps,
  videoAspectRatio,
  descriptions = [],
  notes = [],
  parts = [],
  tools = [],
  currentIndex = 0,
  totalSubsteps = 1,
  activityLogger,
  // stepId kept for potential future activity logging
  stepId: _stepId,
  substepId,
  useRawVideo = false,
}: InlineVideoPlayerProps) {
  const { t } = useTranslation();
  const { loadVideo, seekFrame, play, pause, isReady, currentFrame, isPlaying, playbackSpeed } = useVideo();

  const [hasEnded, setHasEnded] = useState(false);
  const [isLandscape, setIsLandscape] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const didAutoClose = useRef(false);
  const didStartPlay = useRef(false);
  const hasSeenValidFrame = useRef(false);
  const currentSubstepIdRef = useRef<string | null>(null);

  const { style: viewportStyle } = useVideoViewportInterpolation({
    currentFrame,
    viewportKeyframes,
    videoAspectRatio,
  });

  // Calculate effective frames based on video type
  // Exported video sections start at frame 0, raw videos use original frames
  const originalStartFrame = videoSection?.videoSection.startFrame ?? 0;
  const originalEndFrame = videoSection?.videoSection.endFrame ?? 0;
  const effectiveStartFrame = useRawVideo ? originalStartFrame : 0;
  const effectiveEndFrame = useRawVideo ? originalEndFrame : (originalEndFrame - originalStartFrame);
  const clipDuration = originalEndFrame - originalStartFrame;

  // Responsive layout
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setIsLandscape(width > 500 && width > height * 1.2);
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Reset state when substep changes
  useEffect(() => {
    didAutoClose.current = false;
    didStartPlay.current = false;
    hasSeenValidFrame.current = false;
    currentSubstepIdRef.current = substepId ?? null;
    setHasEnded(false);
  }, [substepId]);

  // Load video when substep changes (even if same video URL)
  useEffect(() => {
    if (!videoSrc) return;
    loadVideo(videoSrc, videoFps);
  }, [videoSrc, videoFps, loadVideo, substepId]);

  // Reset didStartPlay when video is not ready (loading new video)
  // This prevents the race condition where auto-play fires on stale isReady=true
  useEffect(() => {
    if (!isReady) {
      didStartPlay.current = false;
      hasSeenValidFrame.current = false;
    }
  }, [isReady]);

  // Auto-play when ready
  useEffect(() => {
    if (!isReady || !videoSection || didStartPlay.current) return;
    didStartPlay.current = true;
    seekFrame(effectiveStartFrame);
    play();

    // Log
    if (activityLogger && substepId) {
      activityLogger.logSubstepViewed(substepId, { playback_speed: playbackSpeed });
    }
  }, [isReady, videoSection, effectiveStartFrame, seekFrame, play, activityLogger, substepId, playbackSpeed]);

  // Auto-close at end
  useEffect(() => {
    if (!videoSection || !isReady || didAutoClose.current || effectiveEndFrame <= 0) return;

    // Race condition guard 1: Don't auto-close until playback has actually started
    if (!didStartPlay.current) return;

    // Race condition guard 2: Ensure we're still on the same substep
    // This prevents stale currentFrame from previous video triggering close
    if (currentSubstepIdRef.current !== substepId) return;

    // Race condition guard 3: Only allow close after we've seen a valid frame
    // A "valid frame" is one within the expected range for this video
    const isFrameInValidRange = currentFrame >= effectiveStartFrame && currentFrame <= effectiveEndFrame;
    if (!hasSeenValidFrame.current) {
      if (isFrameInValidRange) {
        hasSeenValidFrame.current = true;
      } else {
        // Frame is outside valid range - likely stale from previous video
        return;
      }
    }

    if (currentFrame >= effectiveEndFrame) {
      pause();
      setHasEnded(true);

      // Activity logging for completion not needed in local mode

      didAutoClose.current = true;
      setTimeout(onClose, 300);
    }
  }, [currentFrame, videoSection, substepId, effectiveStartFrame, effectiveEndFrame, isReady, pause, onClose]);

  const togglePlayPause = useCallback(() => {
    if (!videoSection) return;
    if (hasEnded) {
      seekFrame(effectiveStartFrame);
      setHasEnded(false);
      didAutoClose.current = false;
      play();
    } else if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, hasEnded, videoSection, effectiveStartFrame, play, pause, seekFrame]);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { pause(); onClose(); }
      if (e.key === ' ') { e.preventDefault(); togglePlayPause(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pause, onClose, togglePlayPause]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoSection) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    seekFrame(Math.round(effectiveStartFrame + percent * (effectiveEndFrame - effectiveStartFrame)));
    setHasEnded(false);
    didAutoClose.current = false;
  }, [videoSection, effectiveStartFrame, effectiveEndFrame, seekFrame]);

  if (!videoSection) return null;

  const progress = clipDuration > 0 ? ((currentFrame - effectiveStartFrame) / clipDuration) * 100 : 0;
  const currentTimeSec = Math.max(0, Math.floor((currentFrame - effectiveStartFrame) / videoFps));
  const totalTimeSec = Math.floor(clipDuration / videoFps);
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const hasContent = notes.length > 0 || descriptions.length > 0 || parts.length > 0 || tools.length > 0;

  return (
    <div ref={containerRef} className="absolute inset-0 z-20 bg-black flex">
      <div className={clsx('flex-1 flex min-h-0 overflow-hidden', isLandscape ? 'flex-row-reverse' : 'flex-col')}>
        <div
          className={clsx('relative flex items-center justify-center bg-black overflow-hidden', isLandscape ? 'flex-1 min-w-0' : 'w-full')}
          style={!isLandscape ? { height: '55%', minHeight: '12.5rem' } : undefined}
        >
          <div className="relative flex items-center justify-center h-full aspect-square max-w-full max-h-full overflow-hidden rounded-lg">
            <VideoPlayer className="w-full h-full" viewportStyle={viewportStyle} />
            {/* Click anywhere to toggle play/pause */}
            <div className="absolute inset-0 cursor-pointer" onClick={togglePlayPause} />
          </div>

          <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-3">
            <span className="text-sm font-medium text-white bg-black/50 px-2.5 py-1 rounded-full">{currentIndex + 1}/{totalSubsteps}</span>
            <button onClick={() => { pause(); onClose(); }} className="p-3 rounded-full text-white bg-black/50 hover:bg-black/70" aria-label={t('common.close', 'Close')}>
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
            <div className="h-1.5 bg-white/30 rounded-full cursor-pointer mb-3 group" onClick={handleProgressClick}>
              <div className="h-full bg-[var(--color-secondary)] rounded-full relative" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/80 font-mono min-w-[4.5rem]">{formatTime(currentTimeSec)} / {formatTime(totalTimeSec)}</span>
            </div>
          </div>
        </div>

        {hasContent && (
          <div className={clsx('bg-[var(--color-bg-elevated)] overflow-hidden flex flex-col', isLandscape ? 'w-72 shadow-[2px_0_4px_rgba(0,0,0,0.1)]' : 'flex-1 shadow-[0_-2px_4px_rgba(0,0,0,0.1)]')}>
            <div className="flex-1 overflow-y-auto scrollbar-subtle p-4 space-y-4">
              {(parts.length > 0 || tools.length > 0) && (
                <div className="flex flex-wrap gap-2">
                  {parts.map((p) => (
                    <div key={p.id} className="relative flex flex-col gap-0.5 pt-4 pb-2 px-2 rounded-lg border bg-[hsla(45,100%,51%,0.08)] border-[var(--color-element-part)]/30 min-w-[5rem]">
                      <div className="absolute -top-2 left-2 w-5 h-5 rounded-full flex items-center justify-center bg-[var(--color-element-part)]"><Package className="h-3 w-3 text-[var(--color-bg-base)]" /></div>
                      <div className="text-sm font-medium text-[var(--color-text-base)] truncate">{p.partTool.name}</div>
                      <div className="text-xs text-[var(--color-text-muted)] truncate">{p.partTool.partNumber || (p.amount > 1 ? `x${p.amount}` : '\u00A0')}</div>
                    </div>
                  ))}
                  {tools.map((t) => (
                    <div key={t.id} className="relative flex flex-col gap-0.5 pt-4 pb-2 px-2 rounded-lg border bg-[hsla(25,90%,55%,0.08)] border-[var(--color-element-tool)]/30 min-w-[5rem]">
                      <div className="absolute -top-2 left-2 w-5 h-5 rounded-full flex items-center justify-center bg-[var(--color-element-tool)]"><Wrench className="h-3 w-3 text-[var(--color-bg-base)]" /></div>
                      <div className="text-sm font-medium text-[var(--color-text-base)] truncate">{t.partTool.name}</div>
                      <div className="text-xs text-[var(--color-text-muted)]">{'\u00A0'}</div>
                    </div>
                  ))}
                </div>
              )}
              {notes.map((n) => {
                const Icon = NOTE_ICONS[n.note.level];
                const styles = NOTE_STYLES[n.note.level];
                return (
                  <div key={n.id} className={clsx('flex items-center gap-2.5 rounded-lg px-3 py-2.5 border', styles.bg, styles.border)}>
                    <Icon className={clsx('h-5 w-5 flex-shrink-0', styles.text)} />
                    <span className={clsx('text-base leading-snug', styles.text, n.note.level === 'Critical' || n.note.level === 'Warning' ? 'font-semibold' : 'font-medium')}>{n.note.text}</span>
                  </div>
                );
              })}
              {descriptions.map((d) => (
                <div key={d.id} className="flex items-start gap-2.5">
                  <span className="text-[var(--color-text-muted)]">&ndash;</span>
                  <p className="text-base text-[var(--color-text-base)] leading-relaxed">{d.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
