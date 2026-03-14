import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { Film, Scissors, X } from 'lucide-react';
import {
  DialogShell,
  Button,
  IconButton,
  ContextMenu,
  ContextMenuItem,
  DrawingLayer,
  DrawingPreview,
  TextInputModal,
  useAnnotationDrawing,
  useDrawingResize,
  type ViewportKeyframeRow,
  type DrawingRow,
  applyLiveCoords,
  useSectionPlayback,
  useViewportPlaybackSync,
  type SectionPlaybackContext,
} from '@monta-vis/viewer-core';
import { MediaEditDialog } from '../MediaEditDialog';
import { useDrawingDeleteKey } from '../../hooks/useDrawingDeleteKey';
import { useVideoPlayback } from '../../hooks/useVideoPlayback';
import { useViewportKeyframes } from '../../hooks/useViewportKeyframes';
import { useVideoDrawing } from '../../hooks/useVideoDrawing';
import { TrimPlaybackControls } from '../VideoTrimDialog/TrimPlaybackControls';
import { DrawingEditor } from '../DrawingEditor';
import { ViewportBox } from './ViewportBox';
import {
  ViewportKeyframeTimeline,
  type KeyframeContextMenuEvent,
} from './ViewportKeyframeTimeline';
import { SectionTimeline, type SectionData } from './SectionTimeline';
import { Playhead } from './Playhead';
import {
  computeLetterboxBounds,
  timeToFrame,
  frameToTime,
} from './viewportUtils';
import {
  prepareSections,
  frameToAccumulatedFrame,
  frameToSubstepPercent,
  substepPercentToFrame,
} from '../../utils/drawingPercentHelpers';

// ── Discriminated union props ──

interface VideoEditorBaseProps {
  open: boolean;
  onClose: () => void;
}

interface VideoEditorEditProps extends VideoEditorBaseProps {
  mode?: 'edit';
  onSave: (data: VideoEditorResult) => void;
  videoData: {
    videoSrc: string;
    startFrame: number;
    endFrame: number;
    fps: number;
    viewportKeyframes: ViewportKeyframeRow[];
    videoAspectRatio: number;
    contentAspectRatio?: number | null;
    sections?: Array<{ startFrame: number; endFrame: number }>;
  };
}

interface VideoEditorViewProps extends VideoEditorBaseProps {
  mode: 'view';
  videoData: {
    videoSrc: string;
    fps: number;
    durationSeconds: number;
    contentAspectRatio?: number | null;
    viewportKeyframes?: ViewportKeyframeRow[];
    videoAspectRatio?: number;
  };
  substepId: string;
  versionId: string;
  drawings: Record<string, DrawingRow>;
  onAddDrawing: (drawing: DrawingRow) => void;
  onUpdateDrawing: (id: string, updates: Partial<DrawingRow>) => void;
  onDeleteDrawing: (id: string) => void;
  sections?: Array<{ startFrame: number; endFrame: number }>;
}

export type VideoEditorDialogProps = VideoEditorEditProps | VideoEditorViewProps;

export interface VideoEditorResult {
  sections: Array<{ startFrame: number; endFrame: number }>;
  viewportKeyframes: ViewportKeyframeRow[];
}

export function VideoEditorDialog(props: VideoEditorDialogProps) {
  if (props.mode === 'view') {
    return <VideoEditorViewMode {...props} />;
  }
  return <VideoEditorEditMode {...props} />;
}

// ── Edit mode (original behavior) ──

function VideoEditorEditMode({
  open,
  onClose,
  onSave,
  videoData,
}: VideoEditorEditProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playback = useVideoPlayback(videoRef, videoData.videoSrc);

  const [sections, setSections] = useState<SectionData[]>(() =>
    videoData.sections?.length
      ? videoData.sections
      : [{ startFrame: videoData.startFrame, endFrame: videoData.endFrame }],
  );
  const [selectedSection, setSelectedSection] = useState(0);

  const viewportKf = useViewportKeyframes(videoData.viewportKeyframes);

  const [containerSize, setContainerSize] = useState({
    width: 0,
    height: 0,
  });

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    frame: number;
    interpolation: 'hold' | 'linear';
  } | null>(null);

  const totalFrames = videoData.endFrame - videoData.startFrame;
  const currentFrame = timeToFrame(playback.currentTime, videoData.fps);

  // Letterbox bounds for viewport overlay
  const letterbox = useMemo(
    () =>
      computeLetterboxBounds(
        containerSize.width,
        containerSize.height,
        videoData.videoAspectRatio,
        1,
      ),
    [containerSize, videoData.videoAspectRatio],
  );

  // Current viewport from keyframes
  const currentViewport = useMemo(
    () => viewportKf.getViewportAtFrame(currentFrame, videoData.videoAspectRatio),
    [viewportKf, currentFrame, videoData.videoAspectRatio],
  );

  const handleContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      (containerRef as React.MutableRefObject<HTMLDivElement | null>).current =
        node;
    },
    [],
  );

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const handleSeek = useCallback(
    (frame: number) => {
      playback.seek(frameToTime(frame, videoData.fps));
    },
    [playback.seek, videoData.fps],
  );

  const handleViewportChange = useCallback(
    (viewport: { x: number; y: number; width: number; height: number }) => {
      viewportKf.upsertAtFrame(currentFrame, viewport);
    },
    [viewportKf, currentFrame],
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

  const handleContextMenu = useCallback(
    (event: KeyframeContextMenuEvent) => {
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        frame: event.frame,
        interpolation: event.interpolation,
      });
    },
    [],
  );

  const handlePlayheadDrag = useCallback(
    (positionPercent: number) => {
      const frame = Math.round((positionPercent / 100) * totalFrames);
      handleSeek(Math.max(0, Math.min(frame, totalFrames)));
    },
    [totalFrames, handleSeek],
  );

  // Split: can split if playhead is inside a section (not at edges)
  const canSplit = useMemo(() => {
    const sec = sections[selectedSection];
    if (!sec) return false;
    return currentFrame > sec.startFrame + 1 && currentFrame < sec.endFrame - 1;
  }, [sections, selectedSection, currentFrame]);

  const handleSplit = useCallback(() => {
    if (!canSplit) return;
    setSections((prev) => {
      const next = [...prev];
      const sec = next[selectedSection];
      if (!sec) return prev;
      next.splice(selectedSection, 1, {
        startFrame: sec.startFrame,
        endFrame: currentFrame,
      }, {
        startFrame: currentFrame,
        endFrame: sec.endFrame,
      });
      return next;
    });
  }, [canSplit, selectedSection, currentFrame]);

  const playheadPct =
    totalFrames > 0 ? (currentFrame / totalFrames) * 100 : 0;

  const handleSave = useCallback(() => {
    onSave({
      sections,
      viewportKeyframes: viewportKf.keyframes,
    });
  }, [onSave, sections, viewportKf.keyframes]);

  // Normalized viewport (0-1) from the 0-100 range returned by interpolateVideoViewport
  const normalizedViewport = useMemo(
    () => ({
      x: currentViewport.x / 100,
      y: currentViewport.y / 100,
      width: currentViewport.width / 100,
      height: currentViewport.height / 100,
    }),
    [currentViewport],
  );

  return (
    <DialogShell open={open} onClose={onClose} maxWidth="max-w-5xl" className="p-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Film className="h-5 w-5 text-[var(--color-text-muted)]" />
          <h2 className="text-base font-semibold text-[var(--color-text-base)]">
            {t('editorCore.videoEditor.title', 'Edit Video')}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={handleSave}>
            {t('editorCore.save', 'Save')}
          </Button>
          <IconButton
            icon={<X className="h-4 w-4" />}
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label={t('editorCore.close', 'Close')}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-3 p-4">
        {/* Video player with viewport overlay */}
        <div
          ref={handleContainerRef}
          className="relative w-full overflow-hidden rounded bg-black"
          style={{ aspectRatio: `${videoData.videoAspectRatio}` }}
        >
          <video
            ref={videoRef}
            src={videoData.videoSrc}
            className="absolute inset-0 h-full w-full object-contain"
            playsInline
            preload="auto"
          />

          {/* Video error overlay */}
          {playback.hasError && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80"
              data-testid="video-error-overlay"
            >
              <Film className="h-8 w-8 text-[var(--color-text-muted)]" />
              <p className="text-sm text-[var(--color-text-muted)]">
                {t('editorCore.videoEditor.videoLoadError', 'Video could not be loaded')}
              </p>
            </div>
          )}

          {/* Viewport box overlay */}
          {letterbox.width > 0 && (
            <div
              className="absolute"
              style={{
                left: `${letterbox.offsetX}px`,
                top: `${letterbox.offsetY}px`,
                width: `${letterbox.width}px`,
                height: `${letterbox.height}px`,
              }}
            >
              <ViewportBox
                x={normalizedViewport.x}
                y={normalizedViewport.y}
                width={normalizedViewport.width}
                height={normalizedViewport.height}
                containerWidth={letterbox.width}
                containerHeight={letterbox.height}
                onChange={handleViewportChange}
              />
            </div>
          )}
        </div>

        {/* Playback controls */}
        <div className="flex items-center justify-center gap-2">
          <TrimPlaybackControls
            isPlaying={playback.isPlaying}
            currentTime={playback.currentTime}
            duration={playback.duration}
            onTogglePlay={playback.togglePlay}
            fps={videoData.fps}
          />
          <IconButton
            icon={<Scissors className="h-4 w-4" />}
            aria-label={t('editorCore.videoEditor.splitSection', 'Split section')}
            variant="ghost"
            size="sm"
            onClick={handleSplit}
            disabled={!canSplit}
          />
        </div>

        {/* Timeline tracks with unified playhead */}
        <div className="relative flex flex-col gap-3" data-timeline-track>
          {/* Viewport keyframe timeline */}
          <ViewportKeyframeTimeline
            keyframes={viewportKf.keyframes}
            totalFrames={totalFrames}
            onSeek={handleSeek}
            onContextMenu={handleContextMenu}
          />

          {/* Section timeline */}
          <SectionTimeline
            sections={sections}
            totalFrames={totalFrames}
            fps={videoData.fps}
            selectedIndex={selectedSection}
            onSelectSection={setSelectedSection}
            onSectionChange={handleSectionChange}
            onSeek={handleSeek}
          />

          {/* Unified Playhead spanning both timelines */}
          <Playhead
            position={playheadPct}
            trackHeight={4}
            currentTime={playback.currentTime}
            currentFrame={currentFrame}
            fps={videoData.fps}
            onDrag={handlePlayheadDrag}
          />
        </div>
      </div>

      {/* Context menu for keyframe actions */}
      {contextMenu && (
        <ContextMenu
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
        >
          <ContextMenuItem
            onClick={() => {
              viewportKf.toggleInterpolation(contextMenu.frame);
              setContextMenu(null);
            }}
          >
            {contextMenu.interpolation === 'hold'
              ? t('editorCore.videoEditor.setLinear', 'Set to Linear')
              : t('editorCore.videoEditor.setHold', 'Set to Hold')}
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => {
              viewportKf.deleteAtFrame(contextMenu.frame);
              setContextMenu(null);
            }}
          >
            {t('editorCore.videoEditor.deleteKeyframe', 'Delete Keyframe')}
          </ContextMenuItem>
        </ContextMenu>
      )}
    </DialogShell>
  );
}

// ── View mode (drawing support for processed videos) ──

function VideoEditorViewMode({
  open,
  onClose,
  videoData,
  substepId,
  versionId,
  drawings,
  onAddDrawing,
  onUpdateDrawing,
  onDeleteDrawing,
  sections,
}: VideoEditorViewProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const drawingOverlayRef = useRef<HTMLDivElement>(null);
  const playback = useVideoPlayback(videoRef, videoData.videoSrc);

  // Local playing state decoupled from native video events.
  // This prevents the infinite loop where sectionPlaybackLoop's internal
  // pause→seek→play triggers native events that restart the section loop.
  const [isPlayingInline, setIsPlayingInline] = useState(false);

  // Bounds for coordinate space: the overlay div IS the content area,
  // so full bounds converts container % (0-100) ↔ local space (0-1).
  const FULL_BOUNDS = useMemo(() => ({ x: 0, y: 0, width: 100, height: 100 }), []);

  // Drawing resize hook (declared early so containerRef setter is available)
  // Mirror ImageEditDialog pattern: also update x/y for text shapes
  const applyTextCoordSync = useCallback(
    (id: string, updates: Partial<DrawingRow>) => {
      const finalUpdates: Partial<DrawingRow> = { ...updates };
      const drawing = drawings[id];
      if (drawing?.type === 'text' && updates.x1 != null) {
        finalUpdates.x = updates.x1;
        finalUpdates.y = updates.y1;
      }
      onUpdateDrawing(id, finalUpdates);
    },
    [drawings, onUpdateDrawing],
  );

  const handleResizeComplete = applyTextCoordSync;

  // Handle group move completion: update each drawing
  const handleGroupMoveComplete = useCallback(
    (moves: Array<{ id: string; updates: Partial<DrawingRow> }>) => {
      for (const { id, updates } of moves) {
        applyTextCoordSync(id, updates);
      }
    },
    [applyTextCoordSync],
  );

  const drawingResize = useDrawingResize({
    onResizeComplete: handleResizeComplete,
    onGroupMoveComplete: handleGroupMoveComplete,
    bounds: FULL_BOUNDS,
  });

  // Combined ref: sets both drawingOverlayRef and drawingResize.containerRef
  const setDrawingOverlayRef = useCallback(
    (el: HTMLDivElement | null) => {
      drawingOverlayRef.current = el;
      drawingResize.containerRef(el);
    },
    [drawingResize.containerRef],
  );

  // Track container size for letterbox computation
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = svgContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setContainerSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const effectiveDuration = videoData.durationSeconds || playback.duration;
  const totalFrames = effectiveDuration * videoData.fps;
  const currentFrame = timeToFrame(playback.currentTime, videoData.fps);

  // Section-aware percent: map absolute frame → substep percent when sections exist
  const preparedSections = useMemo(
    () => sections?.length ? prepareSections(sections) : null,
    [sections],
  );
  const currentPercent = preparedSections
    ? frameToSubstepPercent(currentFrame, preparedSections)
    : totalFrames > 0 ? (currentFrame / totalFrames) * 100 : 0;

  // Section-accumulated display values for time/frame readout
  const accumulatedFrame = preparedSections
    ? frameToAccumulatedFrame(currentFrame, preparedSections)
    : currentFrame;
  const displayCurrentTime = accumulatedFrame / videoData.fps;

  // Video drawing hook
  const videoDrawing = useVideoDrawing({
    substepId,
    versionId,
    drawings,
    addDrawing: onAddDrawing,
    updateDrawing: onUpdateDrawing,
    deleteDrawing: onDeleteDrawing,
    currentPercent,
  });

  // Transform text input position from container space (0-100%) to local space (0-1)
  // to match the bounds-based coordinate system used for drawn shapes.
  const handleTextInputLocal = useCallback(
    (position: { x: number; y: number }) => {
      videoDrawing.handleTextInput({ x: position.x / 100, y: position.y / 100 });
    },
    [videoDrawing.handleTextInput],
  );

  // Annotation drawing hook (mouse interaction for drawing on video)
  // Pass FULL_BOUNDS so coordinates are stored in local space (0-1),
  // matching what SubstepCard's ShapeLayer expects when rendering with bounds.
  const annotationDrawingHook = useAnnotationDrawing({
    tool: videoDrawing.drawingTool,
    color: videoDrawing.drawingColor,
    strokeWidth: videoDrawing.drawingStrokeWidth,
    onShapeCreate: videoDrawing.handleShapeDrawn,
    onTextInput: handleTextInputLocal,
    bounds: FULL_BOUNDS,
  });

  // Mouse handlers on content area div (matches ImageOverlay pattern)
  // Shapes remain clickable even when a drawing tool is active.
  const handleOverlayMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const isOnSvgElement = target.closest('svg') !== null || target.tagName === 'svg';

      if (videoDrawing.drawingTool && drawingOverlayRef.current) {
        if (!isOnSvgElement) {
          videoDrawing.deselectDrawing();
          annotationDrawingHook.handleMouseDown(e, drawingOverlayRef.current);
        }
      } else if (!isOnSvgElement) {
        videoDrawing.deselectDrawing();
      }
    },
    [videoDrawing.drawingTool, videoDrawing.deselectDrawing, annotationDrawingHook.handleMouseDown],
  );

  const handleOverlayMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (annotationDrawingHook.isDrawing && drawingOverlayRef.current) {
        annotationDrawingHook.handleMouseMove(e, drawingOverlayRef.current);
      }
    },
    [annotationDrawingHook.isDrawing, annotationDrawingHook.handleMouseMove],
  );

  const handleOverlayMouseUp = useCallback(() => {
    if (annotationDrawingHook.isDrawing) {
      annotationDrawingHook.handleMouseUp();
    }
  }, [annotationDrawingHook.isDrawing, annotationDrawingHook.handleMouseUp]);

  // Global mouse events for drawing continuation outside overlay (matches ImageOverlay)
  useEffect(() => {
    if (!annotationDrawingHook.isDrawing) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (drawingOverlayRef.current) {
        annotationDrawingHook.handleMouseMove(e, drawingOverlayRef.current);
      }
    };
    const handleGlobalMouseUp = () => {
      annotationDrawingHook.handleMouseUp();
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [annotationDrawingHook.isDrawing, annotationDrawingHook.handleMouseMove, annotationDrawingHook.handleMouseUp]);

  // Apply live coords during resize for real-time visual feedback
  const drawingsWithLiveCoords = useMemo(
    () => applyLiveCoords(videoDrawing.visibleDrawings, {
      isResizing: drawingResize.isResizing,
      liveGroupCoords: drawingResize.liveGroupCoords,
      liveCoords: drawingResize.liveCoords,
      resizingShapeId: drawingResize.resizingDrawingId,
    }),
    [videoDrawing.visibleDrawings, drawingResize.isResizing, drawingResize.liveCoords, drawingResize.liveGroupCoords, drawingResize.resizingDrawingId],
  );

  // Delete key handler (multi-select aware)
  useDrawingDeleteKey(open, videoDrawing.selectedDrawingId, videoDrawing.handleDrawingDelete, videoDrawing.selectedDrawingIds);

  // Shared viewport sync — replaces manual applyViewportTransformToElement + mount effect
  const viewportSync = useViewportPlaybackSync({
    videoRef,
    viewportKeyframes: videoData.viewportKeyframes ?? [],
    videoAspectRatio: videoData.videoAspectRatio ?? 16 / 9,
    fps: videoData.fps,
    continuousSync: playback.isPlaying && !sections?.length, // viewport-only rAF (non-section playback)
  });

  // Shared section playback — replaces manual playback loop effect
  useSectionPlayback({
    videoRef,
    sections: sections ?? [],
    fps: videoData.fps,
    isPlaying: isPlayingInline && !!sections?.length,
    onBeforePlay: useCallback(
      (_video: HTMLVideoElement, startFrame: number) => viewportSync.applyAtFrame(startFrame),
      [viewportSync],
    ),
    onTick: useCallback(
      (ctx: SectionPlaybackContext) => viewportSync.applyAtFrame(ctx.frame),
      [viewportSync],
    ),
    onComplete: useCallback(() => setIsPlayingInline(false), []),
  });

  // Toggle play: use local state for section playback, native toggle otherwise
  const handleTogglePlay = useCallback(() => {
    if (sections?.length) {
      setIsPlayingInline((prev) => !prev);
    } else {
      playback.togglePlay();
    }
  }, [sections?.length, playback.togglePlay]);

  // Seek by percent (section-aware when sections exist)
  const handleSeekPercent = useCallback(
    (percent: number) => {
      const frame = preparedSections
        ? substepPercentToFrame(percent, preparedSections)
        : Math.round((percent / 100) * totalFrames);
      playback.seek(frameToTime(frame, videoData.fps));
      viewportSync.applyAtFrame(frame);
    },
    [preparedSections, totalFrames, playback.seek, videoData.fps, viewportSync],
  );

  // Click-to-seek on timeline bar (viewport transform applied via handleSeekPercent)
  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      handleSeekPercent(Math.max(0, Math.min(100, pct)));
    },
    [handleSeekPercent],
  );

  // Handle drawing handle mouse down for resize (group move aware)
  const handleDrawingHandleMouseDown = useCallback(
    (drawingId: string, handle: string, e: React.MouseEvent) => {
      const drawing = drawings[drawingId];
      if (!drawing) return;
      setIsPlayingInline(false);
      playback.pause();

      // Group operations: if the shape is part of a multi-selection
      if (videoDrawing.selectedDrawingIds.size > 1 && videoDrawing.selectedDrawingIds.has(drawingId)) {
        const selectedDrawings = videoDrawing.visibleDrawings.filter(
          (d) => videoDrawing.selectedDrawingIds.has(d.id),
        );
        if (handle === 'move') {
          drawingResize.startGroupMove(selectedDrawings, drawingId, e);
        } else {
          drawingResize.startGroupResize(selectedDrawings, drawingId, handle as Parameters<typeof drawingResize.startGroupResize>[2], e);
        }
      } else {
        drawingResize.startResize(drawing, handle as Parameters<typeof drawingResize.startResize>[1], e);
      }
    },
    [drawings, playback.pause, drawingResize.startResize, drawingResize.startGroupMove, drawingResize.startGroupResize, videoDrawing.selectedDrawingIds, videoDrawing.visibleDrawings],
  );

  // Handle drawing click on overlay (multi-select aware)
  const handleDrawingClick = useCallback(
    (id: string | null) => {
      if (id) {
        videoDrawing.handleDrawingMultiSelect(id, null);
      } else {
        videoDrawing.deselectDrawing();
      }
    },
    [videoDrawing.handleDrawingMultiSelect, videoDrawing.deselectDrawing],
  );

  // Handle drawing click with event (for canvas multi-select)
  const handleDrawingClickWithEvent = useCallback(
    (id: string, e: React.MouseEvent) => {
      if (e.ctrlKey || e.metaKey) {
        videoDrawing.handleDrawingMultiSelect(id, 'ctrl');
      } else {
        videoDrawing.handleDrawingMultiSelect(id, null);
      }
    },
    [videoDrawing.handleDrawingMultiSelect],
  );

  return (
    <MediaEditDialog
      open={open}
      onClose={onClose}
      sidebar={
        <DrawingEditor
          activeTool={videoDrawing.drawingTool}
          activeColor={videoDrawing.drawingColor}
          activeStrokeWidth={videoDrawing.drawingStrokeWidth}
          selectedDrawingColor={videoDrawing.selectedDrawingColor}
          selectedDrawingStrokeWidth={videoDrawing.selectedDrawingStrokeWidth}
          onToolSelect={videoDrawing.handleDrawingToolSelect}
          onColorSelect={videoDrawing.handleDrawingColorSelect}
          onStrokeWidthSelect={videoDrawing.handleDrawingStrokeWidthSelect}
          drawings={videoDrawing.drawingCards}
          selectedDrawingId={videoDrawing.selectedDrawingId}
          onDrawingSelect={videoDrawing.handleDrawingSelect}
          selectedDrawingIds={videoDrawing.selectedDrawingIds}
          onDrawingMultiSelect={videoDrawing.handleDrawingMultiSelect}
          selectedDrawingFontSize={videoDrawing.selectedDrawingFontSize}
          onFontSizeSelect={videoDrawing.handleDrawingFontSizeSelect}
          onDrawingFrameUpdate={videoDrawing.handleDrawingFrameUpdate}
          onSeekPercent={handleSeekPercent}
          duration={effectiveDuration}
          onDrawingDelete={(ids) => {
            for (const id of ids) {
              videoDrawing.handleDrawingDelete(id);
            }
          }}
          onDeselectAll={videoDrawing.deselectDrawing}
          drawingMode="video"
          isInVideoSection
          onClose={onClose}
        />
      }
    >
      <div className="h-full flex flex-col">
        {/* Video area — matches ImageEditDialog centering + 1:1 pattern */}
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <div className="aspect-square h-full max-w-full overflow-hidden">
            <div
              ref={svgContainerRef}
              className="relative w-full h-full overflow-hidden rounded bg-black"
            >
              <video
                ref={videoRef}
                src={videoData.videoSrc}
                className="absolute inset-0 h-full w-full object-contain"
                playsInline
                preload="auto"
              />

              {/* Video error overlay */}
              {playback.hasError && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80"
                  data-testid="video-error-overlay"
                >
                  <Film className="h-8 w-8 text-[var(--color-text-muted)]" />
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {t('editorCore.videoEditor.videoLoadError', 'Video could not be loaded')}
                  </p>
                </div>
              )}

              {/* Drawing overlay — covers full 1:1 container so users can draw over letterbox areas */}
              {containerSize.width > 0 && containerSize.height > 0 && (
                <div
                  ref={setDrawingOverlayRef}
                  className={clsx('absolute inset-0', videoDrawing.drawingTool && 'cursor-crosshair')}
                  data-testid="drawing-overlay"
                  onMouseDown={handleOverlayMouseDown}
                  onMouseMove={handleOverlayMouseMove}
                  onMouseUp={handleOverlayMouseUp}
                >
                  {/* Existing drawings (pointer-events-none wrapper, shapes have pointer-events: auto) */}
                  <div className="absolute inset-0 pointer-events-none">
                    <DrawingLayer
                      drawings={drawingsWithLiveCoords}
                      containerWidth={containerSize.width}
                      containerHeight={containerSize.height}
                      selectedId={videoDrawing.selectedDrawingId}
                      selectedIds={videoDrawing.selectedDrawingIds}
                      onSelect={handleDrawingClick}
                      onSelectWithEvent={handleDrawingClickWithEvent}
                      onDeselect={videoDrawing.deselectDrawing}
                      onHandleMouseDown={handleDrawingHandleMouseDown}
                      onDoubleClick={videoDrawing.handleTextEdit}
                      bounds={FULL_BOUNDS}
                    />
                  </div>

                  {/* Drawing preview (pointer-events-none so it doesn't block shape interaction) */}
                  {annotationDrawingHook.isDrawing && annotationDrawingHook.startPoint && annotationDrawingHook.currentPoint && videoDrawing.drawingTool && videoDrawing.drawingTool !== 'text' && (
                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      data-testid="drawing-preview-svg"
                    >
                      <DrawingPreview
                        tool={videoDrawing.drawingTool}
                        color={videoDrawing.drawingColor}
                        startPoint={annotationDrawingHook.startPoint}
                        currentPoint={annotationDrawingHook.currentPoint}
                        containerWidth={containerSize.width}
                        containerHeight={containerSize.height}
                      />
                    </svg>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Text input modal (outside video container, sibling like ImageEditDialog) */}
        {videoDrawing.textInputState.isOpen && (
          <TextInputModal
            label={t('editorCore.editText', 'Edit text')}
            value={videoDrawing.textInputState.initialText ?? ''}
            inputType="textarea"
            onConfirm={(text: string) => videoDrawing.handleTextSubmit(text, videoDrawing.textInputState.initialFontSize ?? 5)}
            onCancel={videoDrawing.handleTextCancel}
          />
        )}

        {/* Playback controls + timeline — compact below video */}
        <div className="shrink-0 px-4 pb-3 pt-2 flex flex-col gap-2">
          <TrimPlaybackControls
            isPlaying={isPlayingInline || playback.isPlaying}
            currentTime={displayCurrentTime}
            duration={effectiveDuration}
            onTogglePlay={handleTogglePlay}
            fps={videoData.fps}
          />
          <div className="relative" data-timeline-track>
            <div
              className="relative h-6 w-full rounded bg-[var(--color-bg-surface)] border border-[var(--color-border-base)] cursor-pointer"
              onClick={handleTimelineClick}
            >
              <div
                className="absolute top-1 bottom-1 left-0 right-0 rounded-sm"
                style={{
                  backgroundColor: 'var(--color-element-drawing)',
                  opacity: 0.6,
                }}
              />
            </div>
            <Playhead
              position={currentPercent}
              trackHeight={2}
              currentTime={displayCurrentTime}
              currentFrame={accumulatedFrame}
              fps={videoData.fps}
              onDrag={handleSeekPercent}
            />
          </div>
        </div>
      </div>
    </MediaEditDialog>
  );
}
