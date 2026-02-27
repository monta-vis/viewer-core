import type { ReactNode } from 'react';
import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, X, Package, GraduationCap, Play, VideoOff, Pencil } from 'lucide-react';
import { clsx } from 'clsx';

import { Card, TutorialClickIcon } from '@/components/ui';
import type {
  DrawingRow,
  EnrichedSubstepNote,
  EnrichedSubstepPartTool,
  SubstepDescriptionRow,
  ViewportKeyframeRow,
} from '@/features/instruction';
import { interpolateVideoViewport, viewportToTransform } from '@/features/video-player';
import { ShapeLayer } from '@/features/video-overlay';
import { getVisibleVideoDrawings } from '../utils/filterSubstepDrawings';
import { toggleCardSpeed, computeSkipTime, computeSeekTime, SKIP_SECONDS, type CardSpeed } from '../utils/substepPlaybackControls';
import { VideoFrameCapture } from './VideoFrameCapture';
import { LoupeOverlay } from './LoupeOverlay';
import { NoteCard, getNoteSortPriority } from './NoteCard';
import type { NoteLevel } from '@/features/instruction';
import type { FrameCaptureData } from '../utils/resolveRawFrameCapture';
import { computeContentBounds } from '../utils/computeContentBounds';
import { useLongPress } from '../hooks/useLongPress';
import { useDoubleTap } from '../hooks/useDoubleTap';

// Module-level: only the last card that started playing responds to ESC
let lastPlayingCloseFn: (() => void) | null = null;

/** Callbacks for edit controls. Only used when editMode=true. */
export interface SubstepEditCallbacks {
  onEditImage?: () => void;
  onDeleteImage?: () => void;
  onEditVideo?: () => void;
  onDeleteVideo?: () => void;
  onEditDescription?: (descriptionId: string) => void;
  onDeleteDescription?: (descriptionId: string) => void;
  onAddDescription?: () => void;
  onEditNote?: (noteRowId: string) => void;
  onDeleteNote?: (noteRowId: string) => void;
  onAddNote?: () => void;
  onEditRepeat?: () => void;
  onDeleteRepeat?: () => void;
  onEditReference?: (referenceIndex: number) => void;
  onDeleteReference?: (referenceIndex: number) => void;
  onAddReference?: () => void;
  onEditPartTools?: () => void;
  onDeleteSubstep?: () => void;
}

interface SubstepCardProps {
  title: string | null;
  stepOrder: number;
  imageUrl?: string | null;
  frameCaptureData?: FrameCaptureData | null;
  descriptions: SubstepDescriptionRow[];
  notes: EnrichedSubstepNote[];
  partTools?: EnrichedSubstepPartTool[];
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  selected?: boolean;
  landscape?: boolean;
  isViewed?: boolean;
  onPartToolClick?: () => void;
  videoData?: { videoSrc: string; startFrame: number; endFrame: number; fps: number; viewportKeyframes: ViewportKeyframeRow[]; videoAspectRatio: number; sections?: { startFrame: number; endFrame: number }[] } | null;
  /** Static drawings on the substep image (shown when not playing) */
  imageDrawings?: DrawingRow[];
  /** Video drawings for this substep (filtered by frame during playback) */
  videoDrawings?: DrawingRow[];
  /** Rich reference display data for this substep */
  references?: Array<{ kind: 'see' | 'tutorial'; label: string; targetId?: string; targetType?: 'step' | 'substep' | 'tutorial' }>;
  /** Called when user clicks the grouped reference badge */
  onReferenceClick?: () => void;
  /** Show tutorial highlight (orange border + click icon) */
  tutorialHighlight?: boolean;
  /** Repetition count for this substep (shows ×N badge when > 1) */
  repeatCount?: number;
  /** Optional label for the repetition (e.g. "left & right") */
  repeatLabel?: string | null;
  /** Reference display data — adds visual indicators for reference substeps */
  referenceDisplay?: {
    kind: 'see' | 'tutorial';
    referenceLabel: string;
  };
  /** When set, VFA-based icons are resolved via mvis-media:// protocol (Electron). */
  folderName?: string;
  /** VideoFrameArea records for localPath fallback (mweb context). */
  videoFrameAreas?: Record<string, { localPath?: string | null }>;
  /** Show edit pencil icon. Default: false */
  editMode?: boolean;
  /** Edit callbacks — only used when editMode=true */
  editCallbacks?: SubstepEditCallbacks;
  /** Render function for the edit popover (provided by editor-core via app shell) */
  renderEditPopover?: (props: {
    open: boolean;
    onClose: () => void;
    callbacks: SubstepEditCallbacks;
    descriptions: SubstepDescriptionRow[];
    notes: EnrichedSubstepNote[];
    partTools: EnrichedSubstepPartTool[];
    repeatCount: number;
    repeatLabel?: string | null;
    references: Array<{ kind: string; label: string }>;
    hasImage: boolean;
    hasVideo: boolean;
  }) => ReactNode;
}

export function SubstepCard({
  title,
  stepOrder,
  imageUrl,
  frameCaptureData,
  descriptions,
  notes,
  partTools = [],
  onClick,
  onMouseEnter,
  onMouseLeave,
  selected = false,
  landscape = false,
  isViewed = false,
  onPartToolClick,
  videoData,
  imageDrawings = [],
  videoDrawings = [],
  references = [],
  onReferenceClick,
  tutorialHighlight = false,
  repeatCount = 1,
  repeatLabel,
  referenceDisplay,
  folderName,
  videoFrameAreas,
  editMode = false,
  editCallbacks,
  renderEditPopover,
}: SubstepCardProps) {
  const { t } = useTranslation();

  // Edit popover state
  const [editPopoverOpen, setEditPopoverOpen] = useState(false);

  // Track which individual notes are expanded (by note row id)
  const [expandedNoteIds, setExpandedNoteIds] = useState<ReadonlySet<string>>(() => new Set(notes.map(n => n.id)));
  // "No video" overlay state
  const [showNoVideo, setShowNoVideo] = useState(false);
  const noVideoTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Ref + size for drawing overlay
  const imageAreaRef = useRef<HTMLDivElement>(null);
  const [imageAreaSize, setImageAreaSize] = useState({ width: 0, height: 0 });
  const [contentNaturalSize, setContentNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [visibleVideoDrawingIds, setVisibleVideoDrawingIds] = useState<ReadonlySet<string>>(new Set());

  // Loupe (magnifying glass) state
  const [loupePos, setLoupePos] = useState<{ x: number; y: number } | null>(null);
  const [loupeImageSrc, setLoupeImageSrc] = useState<string | null>(null);

  // Track whether video was playing before long-press (to resume on release)
  const wasPlayingBeforeLoupeRef = useRef(false);

  const longPress = useLongPress({
    onLongPress: (pos) => {
      // During video playback: capture current frame and pause
      if (isPlayingInline && videoRef.current) {
        const video = videoRef.current;
        wasPlayingBeforeLoupeRef.current = !video.paused;
        video.pause();
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0);
        setLoupeImageSrc(canvas.toDataURL('image/jpeg', 0.85));
        setContentNaturalSize({ width: video.videoWidth, height: video.videoHeight });
      }
      setLoupePos(pos);
    },
    onMove: (pos) => setLoupePos(pos),
    onRelease: () => {
      setLoupePos(null);
      // Resume video if it was playing before long-press
      if (isPlayingInline && wasPlayingBeforeLoupeRef.current && videoRef.current) {
        videoRef.current.play().catch(() => {});
        wasPlayingBeforeLoupeRef.current = false;
      }
    },
  });

  // Observe image area size for ShapeLayer
  useEffect(() => {
    const el = imageAreaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setImageAreaSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Inline video playback state
  const [isPlayingInline, setIsPlayingInline] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const endTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Per-card speed override (resets when playback ends)
  const [cardSpeed, setCardSpeed] = useState<CardSpeed>(1);

  // Ref to always access current cardSpeed without re-triggering effects
  const cardSpeedRef = useRef(cardSpeed);
  cardSpeedRef.current = cardSpeed;

  // Start inline playback
  const startInlinePlay = useCallback(() => {
    if (!videoData) return;
    if (progressBarRef.current) progressBarRef.current.style.width = '0%';
    setIsPlayingInline(true);
  }, [videoData]);

  // Toggle play/pause during inline playback
  const toggleInlinePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, []);

  // Helper to apply viewport transform to the video element
  const applyViewportTransform = useCallback((videoEl: HTMLVideoElement, frame: number) => {
    if (!videoData || videoData.viewportKeyframes.length === 0) {
      if (videoEl.style.transform) {
        videoEl.style.transform = '';
        videoEl.style.transformOrigin = '';
      }
      return;
    }
    const vp = interpolateVideoViewport(frame, videoData.viewportKeyframes, videoData.videoAspectRatio);
    const tf = viewportToTransform(vp);
    videoEl.style.transform = `scale(${tf.scale}) translate(${tf.translateX}%, ${tf.translateY}%)`;
    videoEl.style.transformOrigin = 'center center';
  }, [videoData]);

  // When isPlayingInline becomes true, seek and play the video
  // Supports multiple sections (raw editor mode) — plays each section sequentially
  useEffect(() => {
    if (!isPlayingInline || !videoRef.current || !videoData) return;

    const video = videoRef.current;
    const fps = videoData.fps;

    // Build sections list: if videoData.sections exists use it, otherwise single section
    const sections = videoData.sections ?? [{ startFrame: videoData.startFrame, endFrame: videoData.endFrame }];
    const totalDuration = sections.reduce((sum, s) => sum + (s.endFrame - s.startFrame) / fps, 0);

    let currentSectionIndex = 0;
    let elapsedBeforeCurrent = 0; // seconds elapsed in previous sections
    let rafId = 0;

    const startSection = (idx: number) => {
      if (idx >= sections.length) {
        // All sections played
        video.pause();
        if (progressBarRef.current) progressBarRef.current.style.width = '100%';
        endTimerRef.current = setTimeout(() => {
          setCardSpeed(1);
          setIsPlayingInline(false);
        }, 200);
        return;
      }
      currentSectionIndex = idx;
      // Calculate elapsed time from all previous sections
      elapsedBeforeCurrent = 0;
      for (let i = 0; i < idx; i++) {
        elapsedBeforeCurrent += (sections[i].endFrame - sections[i].startFrame) / fps;
      }
      const sec = sections[idx];
      video.currentTime = sec.startFrame / fps;
      video.playbackRate = cardSpeedRef.current;
      applyViewportTransform(video, sec.startFrame);
      video.play().catch((err) => {
        console.debug('Video play failed:', err);
        setIsPlayingInline(false);
      });
    };

    // Start first section
    startSection(0);

    // rAF loop for smooth progress bar + viewport updates + section transitions
    const tick = () => {
      const sec = sections[currentSectionIndex];
      if (!sec) return;
      const sectionStartTime = sec.startFrame / fps;
      const sectionEndTime = sec.endFrame / fps;

      // Overall progress across all sections
      if (progressBarRef.current && totalDuration > 0) {
        const currentSectionElapsed = Math.max(0, video.currentTime - sectionStartTime);
        const totalElapsed = elapsedBeforeCurrent + currentSectionElapsed;
        const pct = Math.min(totalElapsed / totalDuration, 1) * 100;
        progressBarRef.current.style.width = `${pct}%`;
      }

      // Update viewport transform each frame
      const currentFrame = Math.round(video.currentTime * fps);
      applyViewportTransform(video, currentFrame);

      // Update visible video drawings (only re-render when set changes)
      // Convert absolute frame to percentage of total substep duration
      if (videoDrawings.length > 0) {
        const currentPercent = totalDuration > 0
          ? Math.min(((elapsedBeforeCurrent + Math.max(0, video.currentTime - (sec.startFrame / fps))) / totalDuration) * 100, 100)
          : 0;
        const visible = getVisibleVideoDrawings(videoDrawings, currentPercent);
        const newIds = new Set(visible.map(d => d.id));
        setVisibleVideoDrawingIds(prev => {
          if (prev.size !== newIds.size) return newIds;
          for (const id of newIds) { if (!prev.has(id)) return newIds; }
          return prev;
        });
      }

      // Check if current section ended
      if (video.currentTime >= sectionEndTime) {
        video.pause();
        startSection(currentSectionIndex + 1);
        if (currentSectionIndex < sections.length) {
          rafId = requestAnimationFrame(tick);
        }
        return;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    const handleEnded = () => {
      endTimerRef.current = setTimeout(() => {
        setCardSpeed(1);
        setIsPlayingInline(false);
      }, 200);
    };
    video.addEventListener('ended', handleEnded);

    return () => {
      cancelAnimationFrame(rafId);
      video.removeEventListener('ended', handleEnded);
      video.pause();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- cardSpeed synced via separate effect to avoid restarting playback
  }, [isPlayingInline, videoData, applyViewportTransform, videoDrawings]);

  // Sync cardSpeed to video playbackRate live (without restarting playback effect)
  useEffect(() => {
    if (videoRef.current && isPlayingInline) {
      videoRef.current.playbackRate = cardSpeed;
    }
  }, [cardSpeed, isPlayingInline]);

  // Skip forward/backward by SKIP_SECONDS, clamped to section bounds.
  // At section end: pauses. At section start: stays at start.
  const handleSkip = useCallback((deltaSec: number) => {
    const video = videoRef.current;
    if (!video || !videoData || !isPlayingInline) return;

    const fps = videoData.fps;
    const sections = videoData.sections ?? [{ startFrame: videoData.startFrame, endFrame: videoData.endFrame }];

    // Find current section bounds
    let sectionStartSec = sections[0].startFrame / fps;
    let sectionEndSec = sections[sections.length - 1].endFrame / fps;
    for (const sec of sections) {
      if (video.currentTime >= sec.startFrame / fps && video.currentTime <= sec.endFrame / fps) {
        sectionStartSec = sec.startFrame / fps;
        sectionEndSec = sec.endFrame / fps;
        break;
      }
    }

    const newTime = computeSkipTime(video.currentTime, deltaSec, sectionStartSec, sectionEndSec);
    video.currentTime = newTime;
    applyViewportTransform(video, Math.round(newTime * fps));

    // If skipped to end, pause
    if (newTime >= sectionEndSec) {
      video.pause();
    }
  }, [videoData, isPlayingInline, applyViewportTransform]);

  // Double-tap to skip ±5s during inline playback
  const { handleTap: handleDoubleTap } = useDoubleTap({
    onDoubleTap: useCallback((side: 'left' | 'right') => {
      handleSkip(side === 'left' ? -SKIP_SECONDS : SKIP_SECONDS);
    }, [handleSkip]),
  });

  // Tap-to-seek on progress bar
  const handleProgressBarSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !videoData) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    const fps = videoData.fps;
    const sections = videoData.sections ?? [{ startFrame: videoData.startFrame, endFrame: videoData.endFrame }];

    video.currentTime = computeSeekTime(pct, sections, fps);
    applyViewportTransform(video, Math.round(video.currentTime * fps));
  }, [videoData, applyViewportTransform]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (endTimerRef.current) clearTimeout(endTimerRef.current);
    if (noVideoTimerRef.current) clearTimeout(noVideoTimerRef.current);
  }, []);

  // Stable close function (per-instance identity stays constant)
  const closeInlinePlayback = useCallback(() => {
    setCardSpeed(1);
    setIsPlayingInline(false);
  }, []);

  // ESC key closes the last card that started inline playback
  useEffect(() => {
    if (!isPlayingInline) return;
    lastPlayingCloseFn = closeInlinePlayback;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && lastPlayingCloseFn === closeInlinePlayback) {
        e.preventDefault();
        closeInlinePlayback();
        lastPlayingCloseFn = null;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (lastPlayingCloseFn === closeInlinePlayback) lastPlayingCloseFn = null;
    };
  }, [isPlayingInline, closeInlinePlayback]);


  // Sort notes by safety icon category priority (or legacy level priority)
  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) =>
      getNoteSortPriority(a.note) - getNoteSortPriority(b.note)
    );
  }, [notes]);

  const handleNoteToggle = useCallback(() => {
    setExpandedNoteIds(prev =>
      prev.size > 0 ? new Set() : new Set(sortedNotes.map(n => n.id))
    );
  }, [sortedNotes]);

  const altText = title || `${t('instructionView.substep', 'Substep')} ${stepOrder}`;

  // Compute drawing bounds to match the letterboxed image area
  const contentBounds = useMemo(() => {
    if (!contentNaturalSize) return { x: 0, y: 0, width: 100, height: 100 };
    return computeContentBounds(
      imageAreaSize.width, imageAreaSize.height,
      contentNaturalSize.width, contentNaturalSize.height,
    ) ?? { x: 0, y: 0, width: 100, height: 100 };
  }, [imageAreaSize, contentNaturalSize]);

  // Resolve which drawings to show: video drawings during playback, image drawings otherwise
  const activeDrawings = useMemo(() =>
    isPlayingInline
      ? videoDrawings.filter(d => visibleVideoDrawingIds.has(d.id))
      : imageDrawings,
    [isPlayingInline, videoDrawings, visibleVideoDrawingIds, imageDrawings],
  );

  const handleActivate = useCallback((e?: React.MouseEvent) => {
    // Suppress click after long press (loupe gesture)
    if (longPress.didLongPressRef.current) {
      longPress.didLongPressRef.current = false;
      return;
    }
    if (isPlayingInline) {
      if (e) handleDoubleTap(e);
      toggleInlinePlay();
      lastPlayingCloseFn = closeInlinePlayback;
      return;
    }
    onClick?.();
    if (videoData) {
      startInlinePlay();
    } else {
      setShowNoVideo(true);
      if (noVideoTimerRef.current) clearTimeout(noVideoTimerRef.current);
      noVideoTimerRef.current = setTimeout(() => setShowNoVideo(false), 2000);
    }
  }, [videoData, isPlayingInline, startInlinePlay, toggleInlinePlay, closeInlinePlayback, onClick, longPress.didLongPressRef, handleDoubleTap]);

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={handleActivate}
      onKeyDown={(e) => { if (e.key === 'Enter') handleActivate(); }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      interactive
      variant="glass"
      bordered={false}
      padding="none"
      selected={selected}
      className={clsx(
        landscape && 'h-full flex flex-col',
        referenceDisplay && 'ring-2 ring-[var(--color-element-reference)]/60',
      )}
    >
      {/* Image area */}
      <div
        ref={imageAreaRef}
        className={clsx(
          'relative bg-black overflow-hidden touch-pan-y select-none',
          landscape ? 'flex-1 min-h-0 rounded-t-xl' : 'aspect-square rounded-t-xl',
        )}
        onPointerDown={longPress.onPointerDown}
        onPointerMove={longPress.onPointerMove}
        onPointerUp={longPress.onPointerUp}
        onPointerCancel={longPress.onPointerUp}
        onDragStart={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
        style={{ WebkitTouchCallout: 'none' }}
      >
        {(() => {
          if (isPlayingInline && videoData) {
            return (
              <video
                ref={videoRef}
                src={videoData.videoSrc}
                playsInline
                className="w-full h-full"
              />
            );
          }
          if (frameCaptureData) {
            return (
              <VideoFrameCapture
                videoId={frameCaptureData.videoId}
                fps={frameCaptureData.fps}
                frameNumber={frameCaptureData.frameNumber}
                cropArea={frameCaptureData.cropArea}
                videoSrc={frameCaptureData.videoSrc}
                alt={altText}
                className="w-full h-full"
                onCapture={(size, dataUrl) => {
                  setContentNaturalSize(size);
                  setLoupeImageSrc(dataUrl);
                }}
              />
            );
          }
          if (imageUrl) {
            return (
              <img
                src={imageUrl}
                alt={altText}
                draggable={false}
                className="w-full h-full object-contain select-none"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  setContentNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
                  setLoupeImageSrc(imageUrl);
                }}
              />
            );
          }
          if (referenceDisplay) {
            const FallbackIcon = GraduationCap;
            return (
              <div className="w-full h-full flex items-center justify-center" data-testid="reference-fallback-icon">
                <FallbackIcon className="h-16 w-16 text-[var(--color-element-reference)]/40" />
              </div>
            );
          }
          return (
            <div className="w-full h-full flex items-center justify-center text-[var(--color-text-muted)]">
              <span className="text-sm">{t('instructionView.noImage', 'No image')}</span>
            </div>
          );
        })()}

        {/* Edit mode: pencil button + popover */}
        {editMode && !isPlayingInline && editCallbacks && (
          <div className="absolute top-2 right-12 z-30" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              aria-label={t('editorCore.editSubstep', 'Edit substep')}
              className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-colors cursor-pointer"
              onClick={() => setEditPopoverOpen((o) => !o)}
            >
              <Pencil className="h-4 w-4" />
            </button>
            {editPopoverOpen && renderEditPopover?.({
              open: editPopoverOpen,
              onClose: () => setEditPopoverOpen(false),
              callbacks: editCallbacks,
              descriptions,
              notes,
              partTools,
              repeatCount,
              repeatLabel,
              references: references.map((r) => ({ kind: r.kind, label: r.label })),
              hasImage: !!(imageUrl || frameCaptureData),
              hasVideo: !!videoData,
            })}
          </div>
        )}

        {/* Progress bar at top during inline playback — tall tap target, slim visual bar */}
        {isPlayingInline && (
          <div
            className="absolute top-0 left-0 right-0 h-10 z-20 cursor-pointer flex items-start"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); handleProgressBarSeek(e); }}
          >
            <div className="w-full h-1.5 bg-black/30">
              <div
                ref={progressBarRef}
                className="h-full bg-[var(--color-secondary)]"
                style={{ width: '0%' }}
              />
            </div>
          </div>
        )}

        {/* Playback controls during inline video */}
        {isPlayingInline && (
          <div className="absolute bottom-2 left-2 right-2 flex justify-end items-end z-20 pointer-events-none">
            {/* Speed toggles (bottom-right) */}
            <div className="pointer-events-auto flex gap-1.5">
              <button
                type="button"
                aria-label={t('instructionView.setSpeedTo', { speed: 0.5, defaultValue: 'Set speed to 0.5x' })}
                className={clsx(
                  'w-16 h-16 rounded-full text-base font-semibold backdrop-blur-sm transition-colors cursor-pointer flex items-center justify-center',
                  cardSpeed === 0.5
                    ? 'bg-[var(--color-secondary)] text-white'
                    : 'bg-black/50 text-white hover:bg-black/70',
                )}
                onClick={(e) => { e.stopPropagation(); setCardSpeed(toggleCardSpeed(cardSpeed, 0.5)); }}
              >
                ×0.5
              </button>
              <button
                type="button"
                aria-label={t('instructionView.setSpeedTo', { speed: 2, defaultValue: 'Set speed to 2x' })}
                className={clsx(
                  'w-16 h-16 rounded-full text-base font-semibold backdrop-blur-sm transition-colors cursor-pointer flex items-center justify-center',
                  cardSpeed === 2
                    ? 'bg-[var(--color-secondary)] text-white'
                    : 'bg-black/50 text-white hover:bg-black/70',
                )}
                onClick={(e) => { e.stopPropagation(); setCardSpeed(toggleCardSpeed(cardSpeed, 2)); }}
              >
                ×2
              </button>
            </div>
          </div>
        )}

        {/* Drawing overlay — read-only, pointer-events-none */}
        {imageAreaSize.width > 0 && activeDrawings.length > 0 && (
          <div className="absolute inset-0 z-[5] pointer-events-none">
            <ShapeLayer
              shapes={activeDrawings}
              containerWidth={imageAreaSize.width}
              containerHeight={imageAreaSize.height}
              bounds={contentBounds}
            />
          </div>
        )}

        {/* "No video" info overlay */}
        {showNoVideo && (
          <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/60 backdrop-blur-sm text-white">
              <VideoOff className="h-5 w-5 opacity-80" />
              <span className="text-sm font-medium">{t('instructionView.noVideo', 'No video')}</span>
            </div>
          </div>
        )}

        {/* Top right: close button (inline playback) */}
        {isPlayingInline && (
          <div className="absolute top-2 right-2 z-20">
            <button
              type="button"
              aria-label={t('common.close', 'Close')}
              className="pointer-events-auto w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 active:bg-[var(--color-secondary)] transition-colors cursor-pointer"
              onClick={(e) => { e.stopPropagation(); closeInlinePlayback(); }}
            >
              <X className="h-7 w-7" />
            </button>
          </div>
        )}

        {/* Top left: substep number + play icon + viewed */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 z-20">
          {!isPlayingInline && (
            <>
              <span className={clsx(
                'text-base font-semibold text-white px-3 py-1 rounded-full',
                referenceDisplay ? 'bg-[var(--color-element-reference)]/80' : 'bg-black/50',
              )}>
                {stepOrder}
              </span>
              {referenceDisplay && (
                <div
                  className="w-8 h-8 rounded-full bg-[var(--color-element-reference)]/80 backdrop-blur-sm flex items-center justify-center shadow-lg"
                  aria-label={t('instructionView.reference', 'Reference')}
                >
                  <GraduationCap className="h-4 w-4 text-white" />
                </div>
              )}
              {videoData && (
                <div
                  className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center shadow-lg"
                  aria-label={t('instructionView.playVideo', 'Play video')}
                  role="img"
                >
                  <Play className="h-4 w-4 text-white ml-0.5" />
                </div>
              )}
              {isViewed && (
                <div
                  className="w-8 h-8 rounded-full bg-[var(--color-secondary)]/20 backdrop-blur-sm flex items-center justify-center shadow-lg"
                  title={t('instructionView.viewed', 'Viewed')}
                >
                  <Eye className="h-4 w-4 text-[var(--color-secondary)]" />
                </div>
              )}
            </>
          )}
        </div>

        {/* Note cards - hidden during inline playback */}
        {!isPlayingInline && sortedNotes.length > 0 && (
          <div
            className="absolute left-2 bottom-2 z-10 inline-flex flex-col gap-2 max-w-[calc(100%-1rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            {sortedNotes.map((noteRow) => (
              <div key={noteRow.id} className="flex items-center gap-1">
                <NoteCard
                  level={noteRow.note.level as NoteLevel}
                  text={noteRow.note.text}
                  safetyIconId={noteRow.note.safetyIconId}
                  isExpanded={expandedNoteIds.has(noteRow.id)}
                  onToggle={handleNoteToggle}
                  folderName={folderName}
                  videoFrameAreas={videoFrameAreas}
                />
              </div>
            ))}
          </div>
        )}

        {/* Top right badges */}
        {!isPlayingInline && (repeatCount > 1 || references.length > 0) && (
          <div
            className="absolute top-2 right-2 z-10 flex flex-col items-end gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Repeat badge */}
            {repeatCount > 1 && (
              <span
                className="flex items-center gap-1.5 px-4 h-14 rounded-full border-2 border-[var(--color-secondary)] bg-[var(--color-secondary)]/20 backdrop-blur-sm text-white text-base font-semibold shadow-sm"
                data-testid="repeat-badge"
              >
                <span>×{repeatCount}</span>
                {repeatLabel && <span className="font-normal text-white/80">({repeatLabel})</span>}
              </span>
            )}

            {/* Reference badge */}
            {references.length > 0 && (
              <button
                type="button"
                className="flex items-center gap-1.5 px-4 h-14 rounded-full border-2 border-[var(--color-element-reference)] bg-[var(--color-element-reference)]/20 backdrop-blur-sm text-white text-base font-semibold shadow-sm hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onReferenceClick?.(); }}
                aria-label={references[0].label || t('instructionView.reference', 'Reference')}
              >
                <GraduationCap className="h-7 w-7" />
                <span>{references[0].label}</span>
              </button>
            )}
          </div>
        )}

        {/* Bottom left: reference label */}
        {!isPlayingInline && referenceDisplay && (
          <div
            className="absolute bottom-2 left-2 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="flex items-center gap-2 px-4 h-14 rounded-full bg-[var(--color-element-reference)]/90 backdrop-blur-sm text-white text-base font-medium shadow-sm">
              <GraduationCap className="h-7 w-7" />
              <span>{referenceDisplay.referenceLabel}</span>
            </span>
          </div>
        )}

        {/* Bottom right: parts & tools badge */}
        {!isPlayingInline && partTools.length > 0 && (
          <div
            className="absolute bottom-2 right-2 z-10 flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label={`${partTools.length} ${t('instructionView.partsTools', 'Parts & Tools')}`}
              className="flex items-center gap-2 px-4 h-14 rounded-full border-2 border-[var(--color-element-tool)] bg-[var(--color-element-tool)]/20 backdrop-blur-sm text-white text-base font-medium transition-all focus:outline-none cursor-pointer hover:scale-105 active:scale-95"
              onClick={onPartToolClick}
            >
              <Package className="h-7 w-7 text-[var(--color-element-tool)]" />
              <span>{partTools.length}</span>
            </button>
          </div>
        )}

        {/* Tutorial highlight — orange border + click icon on top of image */}
        {tutorialHighlight && (
          <>
            <div className="absolute inset-0 rounded-t-xl border-3 border-[var(--color-tutorial)] pointer-events-none z-20" />
            <TutorialClickIcon label={t('instructionView.tutorial.clickSubstep')} labelPosition="bottom" labelWidth="15rem" />
          </>
        )}

        {/* Magnifying glass loupe */}
        {loupePos && loupeImageSrc && contentNaturalSize && (
          <LoupeOverlay
            pointerX={loupePos.x}
            pointerY={loupePos.y}
            imageSrc={loupeImageSrc}
            containerSize={imageAreaSize}
            contentBounds={contentBounds}
            halfSize={imageAreaSize.width / 4}
          />
        )}
      </div>

      {/* Footer - descriptions */}
      <div
        className="px-4 py-3 shadow-[0_-1px_2px_rgba(0,0,0,0.08)]"
        onClick={(e) => e.stopPropagation()}
      >
        {descriptions.length > 0 ? (
          <div className="space-y-1">
            {descriptions.map((desc) => (
              <p key={desc.id} className="text-lg text-[var(--color-text-base)] leading-relaxed">
                <span className="text-[var(--color-text-muted)]">&ndash;</span>{' '}
                {desc.text}
              </p>
            ))}
          </div>
        ) : (
          <div className="py-2 flex items-center justify-center">
            <span className="text-sm text-[var(--color-text-subtle)]">—</span>
          </div>
        )}
      </div>
    </Card>
  );
}
