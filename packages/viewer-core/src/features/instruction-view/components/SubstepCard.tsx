import { memo, type ReactNode } from 'react';
import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, GraduationCap, Play, VideoOff, Pencil } from 'lucide-react';
import { PartToolBadge } from './PartToolBadge';
import { clsx } from 'clsx';

import { Card, TutorialClickIcon, IconButton } from '@/components/ui';
import type {
  DrawingRow,
  EnrichedSubstepNote,
  EnrichedSubstepPartTool,
  PartToolRow,
  SubstepDescriptionRow,
  ViewportKeyframeRow,
} from '@/features/instruction';
import type { Rectangle } from '@/features/video-overlay';
import { useSectionPlayback, useViewportPlaybackSync, useVideo, type SectionPlaybackContext } from '@/features/video-player';
import { ShapeLayer } from '@/features/video-overlay';
import { getVisibleVideoDrawings } from '../utils/filterSubstepDrawings';
import { computeSkipTime, computeSeekTime, SKIP_SECONDS, type CardSpeed } from '../utils/substepPlaybackControls';
import { VideoFrameCapture } from './VideoFrameCapture';
import { LoupeOverlay } from './LoupeOverlay';
import { NoteCard, getNoteSortPriority } from './NoteCard';
import type { SafetyIconCategory } from '@/features/instruction';
import type { FrameCaptureData } from '../utils/resolveRawFrameCapture';
import { computeContentBounds } from '../utils/computeContentBounds';
import { useLongPress } from '../hooks/useLongPress';
import { useDoubleTap } from '../hooks/useDoubleTap';

/** Full container bounds — maps 0-1 storage coords → 0-100% for ShapeRenderer (no letterbox transform). */
const FULL_BOUNDS: Rectangle = { x: 0, y: 0, width: 100, height: 100 };

// Module-level: only the last card that started playing responds to ESC
let lastPlayingCloseFn: (() => void) | null = null;

/** Callbacks for edit controls. Only used when editMode=true. */
export interface SubstepEditCallbacks {
  onDeleteImage?: () => void;
  onAnnotateVideo?: () => void;
  onDeleteVideo?: () => void;
  onSaveDescription?: (descriptionId: string, text: string) => void;
  onDeleteDescription?: (descriptionId: string) => void;
  onAddDescription?: (text: string) => void;
  onSaveNote?: (noteRowId: string, text: string, safetyIconId: string, safetyIconCategory: SafetyIconCategory, sourceIconId?: string) => void;
  onDeleteNote?: (noteRowId: string) => void;
  onAddNote?: (text: string, safetyIconId: string, safetyIconCategory: SafetyIconCategory, sourceIconId?: string) => void;
  onSaveRepeat?: (count: number, label: string | null) => void;
  onDeleteRepeat?: () => void;
  onEditRepeat?: () => void;
  onEditTutorial?: (tutorialIndex: number) => void;
  onDeleteTutorial?: (tutorialIndex: number) => void;
  onAddTutorial?: () => void;
  onEditPartTools?: () => void;
  onUpdatePartTool?: (partToolId: string, updates: Partial<PartToolRow>) => void;
  onUpdateSubstepPartToolAmount?: (substepPartToolId: string, amount: number) => void;
  onAddSubstepPartTool?: () => void;
  onDeleteSubstepPartTool?: (substepPartToolId: string) => void;
  onDeleteSubstep?: () => void;
}

interface SubstepCardProps {
  title: string | null;
  stepOrder: number;
  totalSubsteps?: number;
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
  /** When true, the description footer is hidden. Used in popover previews. */
  hideFooter?: boolean;
  isViewed?: boolean;
  onPartToolClick?: () => void;
  videoData?: { videoSrc: string; startFrame: number; endFrame: number; fps: number; viewportKeyframes: ViewportKeyframeRow[]; videoAspectRatio: number; contentAspectRatio?: number | null; sections?: { startFrame: number; endFrame: number }[] } | null;
  /** Static drawings on the substep image (shown when not playing) */
  imageDrawings?: DrawingRow[];
  /** Video drawings for this substep (filtered by frame during playback) */
  videoDrawings?: DrawingRow[];
  /** Rich reference display data for this substep */
  tutorials?: Array<{ kind: 'see' | 'tutorial'; label: string; targetId?: string; targetType?: 'step' | 'substep' | 'tutorial' }>;
  /** Called when user clicks the grouped reference badge */
  onTutorialClick?: () => void;
  /** Show tutorial highlight (orange border + click icon) */
  tutorialHighlight?: boolean;
  /** Repetition count for this substep (shows ×N badge when > 1) */
  repeatCount?: number;
  /** Optional label for the repetition (e.g. "left & right") */
  repeatLabel?: string | null;
  /** Reference display data — adds visual indicators for reference substeps */
  tutorialDisplay?: {
    kind: 'see' | 'tutorial';
    tutorialLabel: string;
  };
  /** When set, VFA-based icons are resolved via mvis-media:// protocol (Electron). */
  folderName?: string;
  /** VideoFrameArea records for localPath fallback (mweb context). */
  videoFrameAreas?: Record<string, { localPath?: string | null }>;
  /** Show edit pencil icon. Default: false */
  editMode?: boolean;
  /** Edit callbacks — only used when editMode=true */
  editCallbacks?: SubstepEditCallbacks;
  /** Map of safetyIconId → localized label for note icon tooltips. */
  noteIconLabels?: Record<string, string>;
  /** When true, highlights this card because a hovered PartToolCard uses it */
  highlightedByPartTool?: boolean;
  /** Render function for the edit popover (provided by editor-core via app shell) */
  /** Substep ID — forwarded to the edit popover so it can associate uploads with the correct substep */
  substepId?: string;
  renderEditPopover?: (props: {
    open: boolean;
    onClose: () => void;
    callbacks: SubstepEditCallbacks;
    descriptions: SubstepDescriptionRow[];
    notes: EnrichedSubstepNote[];
    partTools: EnrichedSubstepPartTool[];
    repeatCount: number;
    repeatLabel?: string | null;
    tutorials: Array<{ kind: string; label: string }>;
    hasImage: boolean;
    hasVideo: boolean;
    substepId?: string;
    /** Props for rendering a read-only SubstepCard as media preview inside the popover */
    stepOrder: number;
    totalSubsteps?: number;
    imageUrl?: string | null;
    frameCaptureData?: FrameCaptureData | null;
    videoData?: SubstepCardProps['videoData'];
    title: string | null;
    noteIconLabels?: Record<string, string>;
    folderName?: string;
  }) => ReactNode;
}

export const SubstepCard = memo(function SubstepCard({
  title,
  stepOrder,
  totalSubsteps,
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
  hideFooter = false,
  isViewed = false,
  onPartToolClick,
  videoData,
  imageDrawings = [],
  videoDrawings = [],
  tutorials = [],
  onTutorialClick,
  tutorialHighlight = false,
  repeatCount = 1,
  repeatLabel,
  tutorialDisplay,
  folderName,
  videoFrameAreas,
  noteIconLabels,
  highlightedByPartTool = false,
  editMode = false,
  editCallbacks,
  substepId,
  renderEditPopover,
}: SubstepCardProps) {
  const { t } = useTranslation();
  const { playbackSpeed } = useVideo();

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
  const lastVisibleIdsKeyRef = useRef('');

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

  // Per-card speed override: null = follow global playbackSpeed, CardSpeed = manual button press
  const [speedOverride, setSpeedOverride] = useState<CardSpeed | null>(null);
  // Effective playback rate: manual override wins, otherwise global speed
  const effectiveSpeed = speedOverride ?? playbackSpeed;

  // Ref to always access current effective speed without re-triggering effects
  const cardSpeedRef = useRef(effectiveSpeed);
  cardSpeedRef.current = effectiveSpeed;

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

  // Sections for playback (used by shared hooks + skip/seek handlers)
  const sections = useMemo(
    () => videoData
      ? videoData.sections ?? [{ startFrame: videoData.startFrame, endFrame: videoData.endFrame }]
      : [],
    [videoData],
  );

  // Shared viewport sync hook — replaces manual applyViewportTransformToElement calls
  const viewportSync = useViewportPlaybackSync({
    videoRef,
    viewportKeyframes: videoData?.viewportKeyframes ?? [],
    videoAspectRatio: videoData?.videoAspectRatio ?? 16 / 9,
    fps: videoData?.fps ?? 30,
  });

  // Shared section playback hook — replaces manual seek/play/loop effect
  useSectionPlayback({
    videoRef,
    sections,
    fps: videoData?.fps ?? 30,
    isPlaying: isPlayingInline,
    onBeforePlay: useCallback((video: HTMLVideoElement, startFrame: number) => {
      video.playbackRate = cardSpeedRef.current;
      viewportSync.applyAtFrame(startFrame);
    }, [viewportSync]),
    onTick: useCallback((ctx: SectionPlaybackContext) => {
      // Progress bar
      if (progressBarRef.current && ctx.totalDuration > 0) {
        progressBarRef.current.style.width = `${ctx.overallPercent}%`;
      }
      // Viewport transform
      viewportSync.applyAtFrame(ctx.frame);
      // Video drawings visibility (avoid allocating Set every frame)
      if (videoDrawings.length > 0) {
        const visible = getVisibleVideoDrawings(videoDrawings, ctx.overallPercent);
        const key = visible.map(d => d.id).join(',');
        if (key !== lastVisibleIdsKeyRef.current) {
          lastVisibleIdsKeyRef.current = key;
          setVisibleVideoDrawingIds(new Set(visible.map(d => d.id)));
        }
      }
    }, [viewportSync, videoDrawings]),
    onComplete: useCallback(() => {
      if (progressBarRef.current) progressBarRef.current.style.width = '100%';
      endTimerRef.current = setTimeout(() => {
        setSpeedOverride(null);
        setIsPlayingInline(false);
      }, 200);
    }, []),
  });

  // Sync effective speed to video playbackRate live (without restarting playback effect)
  useEffect(() => {
    if (videoRef.current && isPlayingInline) {
      videoRef.current.playbackRate = effectiveSpeed;
    }
  }, [effectiveSpeed, isPlayingInline]);

  // Skip forward/backward by SKIP_SECONDS, clamped to section bounds.
  // At section end: pauses. At section start: stays at start.
  const handleSkip = useCallback((deltaSec: number) => {
    const video = videoRef.current;
    if (!video || !videoData || !isPlayingInline) return;

    const fps = videoData.fps;

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
    viewportSync.applyAtFrame(Math.round(newTime * fps));

    // If skipped to end, pause
    if (newTime >= sectionEndSec) {
      video.pause();
    }
  }, [videoData, isPlayingInline, sections, viewportSync]);

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

    video.currentTime = computeSeekTime(pct, sections, videoData.fps);
    viewportSync.applyAtFrame(Math.round(video.currentTime * videoData.fps));
  }, [videoData, sections, viewportSync]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (endTimerRef.current) clearTimeout(endTimerRef.current);
    if (noVideoTimerRef.current) clearTimeout(noVideoTimerRef.current);
  }, []);

  // Stable close function (per-instance identity stays constant)
  const closeInlinePlayback = useCallback(() => {
    setSpeedOverride(null);
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

  // Pause video when card scrolls out of view, resume when it returns
  useEffect(() => {
    const el = imageAreaRef.current;
    const video = videoRef.current;
    if (!isPlayingInline || !el || !video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          video.pause();
        } else if (video.paused && video.currentTime > 0) {
          video.play().catch((err) => {
            console.error('[SubstepCard] Failed to resume video playback:', err);
          });
        }
      },
      { threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isPlayingInline]);

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

  // Compute drawing bounds to match the letterboxed content area.
  // During processed video playback, use contentAspectRatio (baked letterbox in square video).
  // Otherwise use the actual content natural size (image / frame capture).
  const contentBounds = useMemo(() => {
    if (isPlayingInline && videoData?.contentAspectRatio && imageAreaSize.width > 0) {
      // Processed video: square container with letterboxed content
      return computeContentBounds(
        imageAreaSize.width, imageAreaSize.height,
        videoData.contentAspectRatio, 1, // use ratio as virtual width, 1 as height
      ) ?? { x: 0, y: 0, width: 100, height: 100 };
    }
    if (!contentNaturalSize) return { x: 0, y: 0, width: 100, height: 100 };
    return computeContentBounds(
      imageAreaSize.width, imageAreaSize.height,
      contentNaturalSize.width, contentNaturalSize.height,
    ) ?? { x: 0, y: 0, width: 100, height: 100 };
  }, [imageAreaSize, contentNaturalSize, isPlayingInline, videoData]);

  // Resolve which drawings to show: video drawings during playback, image drawings otherwise
  const activeDrawings = useMemo(() =>
    isPlayingInline
      ? videoDrawings.filter(d => visibleVideoDrawingIds.has(d.id))
      : imageDrawings,
    [isPlayingInline, videoDrawings, visibleVideoDrawingIds, imageDrawings],
  );

  // Pre-compute parts/tools badge counts
  const partToolBadge = useMemo(() => {
    if (partTools.length === 0) return null;
    const partCount = partTools.filter((pt) => pt.partTool.type === 'Part').length;
    const toolCount = partTools.filter((pt) => pt.partTool.type === 'Tool').length;

    return { partCount, toolCount };
  }, [partTools]);

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
      onKeyDown={(e) => { if (e.key === 'Enter' && !editPopoverOpen) handleActivate(); }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      interactive
      variant="glass"
      bordered={false}
      padding="none"
      selected={selected}
      className={clsx(
        landscape && 'h-full flex flex-col',
        tutorialDisplay && 'ring-2 ring-[var(--color-element-tutorial)]/60',
        highlightedByPartTool && 'ring-2 ring-[var(--color-secondary)]/60',
        isViewed && 'border-l-[0.1875rem] border-l-[var(--color-secondary)]',
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
                muted
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
                loading="lazy"
                className="w-full h-full object-contain select-none"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  setContentNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
                  setLoupeImageSrc(imageUrl);
                }}
              />
            );
          }
          if (tutorialDisplay) {
            const FallbackIcon = GraduationCap;
            return (
              <div className="w-full h-full flex items-center justify-center" data-testid="tutorial-fallback-icon">
                <FallbackIcon className="h-16 w-16 text-[var(--color-element-tutorial)]/40" />
              </div>
            );
          }
          return (
            <div className="w-full h-full flex items-center justify-center text-[var(--color-text-muted)]">
              <span className="text-sm">{t('instructionView.noImage', 'No image')}</span>
            </div>
          );
        })()}

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
                  speedOverride === 0.5
                    ? 'bg-[var(--color-secondary)] text-white'
                    : 'bg-black/50 text-white hover:bg-black/70',
                )}
                onClick={(e) => { e.stopPropagation(); setSpeedOverride(speedOverride === 0.5 ? null : 0.5); }}
              >
                ×0.5
              </button>
              <button
                type="button"
                aria-label={t('instructionView.setSpeedTo', { speed: 2, defaultValue: 'Set speed to 2x' })}
                className={clsx(
                  'w-16 h-16 rounded-full text-base font-semibold backdrop-blur-sm transition-colors cursor-pointer flex items-center justify-center',
                  speedOverride === 2
                    ? 'bg-[var(--color-secondary)] text-white'
                    : 'bg-black/50 text-white hover:bg-black/70',
                )}
                onClick={(e) => { e.stopPropagation(); setSpeedOverride(speedOverride === 2 ? null : 2); }}
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
              bounds={FULL_BOUNDS}
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
            <IconButton
              variant="overlay"
              size="lg"
              icon={<X />}
              aria-label={t('common.close', 'Close')}
              className="pointer-events-auto"
              onClick={(e) => { e.stopPropagation(); closeInlinePlayback(); }}
            />
          </div>
        )}

        {/* Top left: substep number + play icon + viewed */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 z-20">
          {!isPlayingInline && (
            <>
              <span className={clsx(
                'text-base font-semibold text-white px-3 py-1 rounded-full',
                tutorialDisplay ? 'bg-[var(--color-element-tutorial)]/80' : 'bg-black/50',
              )}>
                {totalSubsteps != null ? `${stepOrder}/${totalSubsteps}` : stepOrder}
              </span>
              {tutorialDisplay && (
                <div
                  className="w-8 h-8 rounded-full bg-[var(--color-element-tutorial)]/80 backdrop-blur-sm flex items-center justify-center shadow-lg"
                  aria-label={t('instructionView.tutorialLabel', 'Tutorial')}
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
              {editMode && editCallbacks && (
                <div onClick={(e) => e.stopPropagation()}>
                  <IconButton
                    variant="overlay"
                    size="md"
                    icon={<Pencil />}
                    aria-label={t('editorCore.editSubstep', 'Edit substep')}
                    onClick={() => setEditPopoverOpen((o) => !o)}
                  />
                  {editPopoverOpen && renderEditPopover?.({
                    open: editPopoverOpen,
                    onClose: () => setEditPopoverOpen(false),
                    callbacks: editCallbacks,
                    descriptions,
                    notes,
                    partTools,
                    repeatCount,
                    repeatLabel,
                    tutorials: tutorials.map((r) => ({ kind: r.kind, label: r.label })),
                    hasImage: !!(imageUrl || frameCaptureData),
                    hasVideo: !!videoData,
                    substepId,
                    stepOrder,
                    totalSubsteps,
                    imageUrl,
                    frameCaptureData,
                    videoData,
                    title,
                    noteIconLabels,
                    folderName,
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Note cards - hidden during inline playback */}
        {!isPlayingInline && sortedNotes.length > 0 && (
          <div
            className="absolute left-0 bottom-[4.5rem] z-10 inline-flex flex-col gap-2 max-w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {sortedNotes.map((noteRow) => (
              <NoteCard
                key={noteRow.id}
                safetyIconCategory={noteRow.note.safetyIconCategory}
                text={noteRow.note.text}
                safetyIconId={noteRow.note.safetyIconId}
                isExpanded={expandedNoteIds.has(noteRow.id)}
                onToggle={handleNoteToggle}
                folderName={folderName}
                videoFrameAreas={videoFrameAreas}
                iconLabel={noteIconLabels?.[noteRow.note.safetyIconId]}
              />
            ))}
          </div>
        )}

        {/* Top right badges */}
        {!isPlayingInline && (repeatCount > 1 || tutorials.length > 0) && (
          <div
            className="absolute right-2 top-2 z-10 flex flex-col items-end gap-2"
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
            {tutorials.length > 0 && (
              <button
                type="button"
                className="flex items-center gap-1.5 px-4 h-14 rounded-full border-2 border-[var(--color-element-tutorial)] bg-[var(--color-element-tutorial)]/20 backdrop-blur-sm text-white text-base font-semibold shadow-sm hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onTutorialClick?.(); }}
                aria-label={tutorials[0].label || t('instructionView.tutorialLabel', 'Tutorial')}
              >
                <GraduationCap className="h-7 w-7" />
                <span>{tutorials[0].label}</span>
              </button>
            )}
          </div>
        )}

        {/* Bottom left: reference label */}
        {!isPlayingInline && tutorialDisplay && (
          <div
            className="absolute bottom-2 left-2 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="flex items-center gap-2 px-4 h-14 rounded-full bg-[var(--color-element-tutorial)]/90 backdrop-blur-sm text-white text-base font-medium shadow-sm">
              <GraduationCap className="h-7 w-7" />
              <span>{tutorialDisplay.tutorialLabel}</span>
            </span>
          </div>
        )}

        {/* Bottom right: parts & tools badge */}
        {!isPlayingInline && partToolBadge && (
          <div
            className="absolute bottom-2 right-2 z-10 flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <PartToolBadge
              partCount={partToolBadge.partCount}
              toolCount={partToolBadge.toolCount}
              className="backdrop-blur-sm"
              onClick={onPartToolClick}
            />
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
            halfSize={imageAreaSize.width / 2.67}
          />
        )}
      </div>

      {/* Footer - descriptions */}
      {!hideFooter && (
        <div
          className="px-4 py-3 shadow-[0_-0.0625rem_0.125rem_rgba(0,0,0,0.08)]"
          onClick={(e) => e.stopPropagation()}
        >
          {descriptions.length > 0 ? (
            <div className="space-y-1">
              {descriptions.map((desc) => (
                <div key={desc.id} className="flex gap-1.5 text-lg leading-relaxed">
                  <span className="text-[var(--color-text-muted)] shrink-0">•</span>
                  <span className="text-[var(--color-text-base)]">{desc.text}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-2 flex items-center justify-center">
              <span className="text-sm text-[var(--color-text-subtle)]">—</span>
            </div>
          )}
        </div>
      )}

    </Card>
  );
});
