import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ArrowUpRight, Circle, Square, Type, Pencil, Image, Video } from 'lucide-react';
import { clsx } from 'clsx';

import {
  DrawingToolbar,
  ColorPalette,
  TEXT_SIZES,
  type ShapeType,
  type ShapeColor,
} from '@monta-vis/viewer-core';

/**
 * Drawing data for minicards - can be either Image Annotation or Video Drawing
 */
export interface DrawingCardData {
  id: string;
  type: 'image' | 'video';
  shapeType: string; // arrow, circle, rectangle, text, freehand
  color: string;
  // Video drawings have frame range
  startFrame?: number;
  endFrame?: number;
}

export type DrawingMode = 'image' | 'video';

interface DrawingEditorProps {
  // Drawing tools
  activeTool: ShapeType | null;
  activeColor: ShapeColor;
  selectedDrawingColor?: ShapeColor | null;
  onToolSelect: (tool: ShapeType | null) => void;
  onColorSelect: (color: ShapeColor) => void;

  // All drawings (image annotations + video drawings)
  drawings?: DrawingCardData[];
  selectedDrawingId?: string | null;
  onDrawingSelect?: (id: string) => void;

  // Multi-select (optional, backward compatible)
  selectedDrawingIds?: ReadonlySet<string>;
  onDrawingMultiSelect?: (id: string, modifier: 'ctrl' | 'shift' | null) => void;

  // Font size for text drawings
  selectedDrawingFontSize?: number | null;
  onFontSizeSelect?: (fontSize: number) => void;

  // Video drawing frame range editing (values are 0-100% of substep duration)
  minFrame?: number;
  maxFrame?: number;
  onDrawingFrameUpdate?: (id: string, startFrame: number, endFrame: number) => void;
  /** Seek video to a given percentage (0-100) of substep duration */
  onSeekPercent?: (percent: number) => void;
  /** Total substep video duration in seconds (used for timeline labels) */
  duration?: number;

  // Mode control
  isInVideoSection?: boolean; // Is playhead inside a VideoSection?
  drawingMode: DrawingMode; // Current mode (image or video)

  /** Called when a minicard click changes the active section type */
  onDrawingSectionChange?: (section: 'image' | 'video') => void;

  // Actions
  onClose: () => void;
}

// Helper: Get icon component for shape type
const getShapeIcon = (shapeType: string) => {
  switch (shapeType) {
    case 'arrow': return ArrowUpRight;
    case 'circle': return Circle;
    case 'rectangle': return Square;
    case 'text': return Type;
    default: return Pencil; // freehand or unknown
  }
};

/** Small drag handle for the drawing timeline range. */
function TimelineMarker({
  position,
  isDragging,
  zIndex,
  onMouseDown,
  ariaLabel,
}: {
  position: number;
  isDragging: boolean;
  zIndex: number;
  onMouseDown: (e: React.MouseEvent) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      className={clsx(
        'absolute top-0 bottom-0 w-3 cursor-ew-resize',
        'flex items-center justify-center',
        'hover:bg-white/20 transition-colors',
        isDragging && 'bg-white/30'
      )}
      style={{
        left: `calc(${position}% - 0.375rem)`,
        zIndex,
      }}
      onMouseDown={onMouseDown}
      aria-label={ariaLabel}
    >
      <div className="w-0.5 h-4 bg-white rounded-full" />
    </button>
  );
}

/**
 * DrawingEditor - Unified editor for both Image Annotations and Video Drawings.
 *
 * Mode is driven by element selection in the parent (image element → image mode,
 * video section element → video mode). Only context-relevant minicards are shown.
 */
export function DrawingEditor({
  activeTool,
  activeColor,
  selectedDrawingColor,
  onToolSelect,
  onColorSelect,
  drawings = [],
  selectedDrawingId,
  onDrawingSelect,
  selectedDrawingIds: selectedDrawingIdsProp,
  onDrawingMultiSelect,
  selectedDrawingFontSize,
  onFontSizeSelect,
  minFrame: _minFrame = 0,
  maxFrame: _maxFrame = 100,
  onDrawingFrameUpdate,
  onSeekPercent,
  duration = 0,
  isInVideoSection = false,
  drawingMode,
  onDrawingSectionChange,
  onClose,
}: DrawingEditorProps) {
  const { t } = useTranslation();

  // Tools disabled based on current mode:
  // - Image mode: enabled (ImageArea must exist for checkbox to appear)
  // - Video mode: only enabled when playhead is inside a VideoSection
  const isToolsDisabled = drawingMode === 'image' ? false : !isInVideoSection;

  // Get selected drawing data
  const selectedDrawing = useMemo(() => {
    return drawings.find((d) => d.id === selectedDrawingId) ?? null;
  }, [drawings, selectedDrawingId]);

  // Derive effective selection set (backward compat: single selectedDrawingId → Set)
  const effectiveSelectedIds = useMemo(
    () => selectedDrawingIdsProp ?? (selectedDrawingId ? new Set([selectedDrawingId]) : new Set<string>()),
    [selectedDrawingIdsProp, selectedDrawingId],
  );

  // Selected video drawings with valid frame range (used for timeline drag + render)
  const selectedVideoDrawings = useMemo(
    () =>
      drawings.filter(
        (d) =>
          d.type === 'video' &&
          effectiveSelectedIds.has(d.id) &&
          d.startFrame !== undefined &&
          d.endFrame !== undefined,
      ),
    [drawings, effectiveSelectedIds],
  );

  // Show selected drawing's color if one is selected, otherwise show active color
  const displayColor = selectedDrawingColor ?? activeColor;

  // Split drawings into image and video arrays
  const imageDrawings = useMemo(
    () => drawings.filter((d) => d.type === 'image'),
    [drawings],
  );
  const videoDrawings = useMemo(
    () => drawings.filter((d) => d.type === 'video').sort((a, b) => (a.startFrame ?? 0) - (b.startFrame ?? 0)),
    [drawings],
  );

  // Local state for timeline dragging
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Handle timeline drag
  const handleMouseDown = useCallback((marker: 'start' | 'end') => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(marker);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !trackRef.current) return;

    if (selectedVideoDrawings.length === 0) return;

    const rect = trackRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));

    for (const d of selectedVideoDrawings) {
      const startPercent = d.startFrame ?? 0;
      const endPercent = d.endFrame ?? 100;

      if (isDragging === 'start') {
        const newStart = Math.min(percent, endPercent - 1);
        onDrawingFrameUpdate?.(d.id, newStart, endPercent);
      } else {
        const newEnd = Math.max(percent, startPercent + 1);
        onDrawingFrameUpdate?.(d.id, startPercent, newEnd);
      }
    }

    onSeekPercent?.(percent);
  }, [isDragging, selectedVideoDrawings, onDrawingFrameUpdate, onSeekPercent]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  // Global mouse events for timeline dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Keyboard shortcut: Escape to close (ref avoids re-registering on every onClose identity change)
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Render a single minicard button
  const renderMinicard = (drawing: DrawingCardData, section: 'image' | 'video') => {
    const Icon = getShapeIcon(drawing.shapeType);
    const isInSelection = effectiveSelectedIds.has(drawing.id);
    const bgColor = drawing.type === 'image'
      ? 'var(--color-element-image)'
      : 'var(--color-element-drawing)';
    const TypeIcon = drawing.type === 'image' ? Image : Video;

    const handleMinicardClick = (e: React.MouseEvent) => {
      onDrawingSectionChange?.(section);
      if (onDrawingMultiSelect) {
        if (e.ctrlKey || e.metaKey) {
          onDrawingMultiSelect(drawing.id, 'ctrl');
        } else if (e.shiftKey) {
          onDrawingMultiSelect(drawing.id, 'shift');
        } else {
          onDrawingMultiSelect(drawing.id, null);
        }
      } else {
        onDrawingSelect?.(drawing.id);
      }
    };

    return (
      <button
        key={drawing.id}
        type="button"
        onClick={handleMinicardClick}
        className={clsx(
          'relative w-7 h-7 rounded flex items-center justify-center transition-all',
          'hover:scale-110',
          isInSelection && 'ring-2 ring-white',
        )}
        style={{ backgroundColor: bgColor }}
        aria-label={t('editorCore.selectDrawing')}
        aria-pressed={isInSelection}
      >
        <Icon className="h-3.5 w-3.5 text-white" />
        <TypeIcon
          className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 text-white opacity-80"
          style={{ filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }}
        />
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-2 p-3">
      {/* Header row: Close button */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-[var(--item-bg-hover)] transition-colors"
          aria-label={t('common.close')}
          data-testid="drawing-editor-close"
        >
          <X className="h-4 w-4 text-[var(--color-text-muted)]" />
        </button>
      </div>

      {/* Tools row: Drawing tools | Colors */}
      <div
        data-testid="drawing-tools-row"
        className={clsx(
          'flex items-center gap-2 flex-wrap',
          isToolsDisabled && 'opacity-40 pointer-events-none'
        )}
      >
        <DrawingToolbar
          activeTool={activeTool}
          onToolSelect={onToolSelect}
        />
        <div className="h-5 w-px bg-[var(--color-border-base)]" />
        <ColorPalette activeColor={displayColor} onColorSelect={onColorSelect} />
      </div>

      {/* Font size buttons - only visible when a text drawing is selected */}
      {selectedDrawing?.shapeType === 'text' && onFontSizeSelect && (
        <div className="flex items-center gap-1">
          {TEXT_SIZES.map(({ label, value, ariaLabel }) => (
            <button
              key={label}
              type="button"
              onClick={() => onFontSizeSelect(value)}
              aria-label={ariaLabel}
              className={clsx(
                'px-2 py-0.5 text-xs rounded font-medium transition-colors',
                (selectedDrawingFontSize ?? 5) === value
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-bg-base)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Drawing Minicards - only show section matching current mode */}
      {drawingMode === 'image' && imageDrawings.length > 0 && (
        <div className="mt-1" data-testid="image-drawings-section">
          <div className="flex items-center gap-1 mb-1">
            <Image className="h-3 w-3 text-[var(--color-element-image)]" />
            <span className="text-xs text-[var(--color-text-muted)]">
              {t('editorCore.imageDrawings', 'Image')}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {imageDrawings.map((drawing) => renderMinicard(drawing, 'image'))}
          </div>
        </div>
      )}
      {drawingMode === 'video' && videoDrawings.length > 0 && (
        <div className="mt-1" data-testid="video-drawings-section">
          <div className="flex items-center gap-1 mb-1">
            <Video className="h-3 w-3 text-[var(--color-element-drawing)]" />
            <span className="text-xs text-[var(--color-text-muted)]">
              {t('editorCore.videoDrawings', 'Video')}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {videoDrawings.map((drawing) => renderMinicard(drawing, 'video'))}
          </div>
        </div>
      )}

      {/* Timeline for video mode */}
      {drawingMode === 'video' && (
        <div className="mt-2">
          {/* Timeline track */}
          <div
            ref={trackRef}
            className="relative h-6 bg-[var(--color-bg-surface)] rounded border border-[var(--color-border-base)]"
          >
            {/* Drawing range bar - supports multi-select combined range */}
            {(() => {
              if (selectedVideoDrawings.length === 0) return null;

              const combinedStart = Math.min(...selectedVideoDrawings.map((d) => d.startFrame ?? 0));
              const combinedEnd = Math.max(...selectedVideoDrawings.map((d) => d.endFrame ?? 100));

              return (
                <>
                  <div
                    className="absolute top-1 bottom-1 rounded-sm"
                    style={{
                      left: `${combinedStart}%`,
                      width: `${combinedEnd - combinedStart}%`,
                      backgroundColor: 'var(--color-element-drawing)',
                      opacity: 0.6,
                    }}
                  />

                  {/* Start/End markers */}
                  <TimelineMarker
                    position={combinedEnd}
                    isDragging={isDragging === 'end'}
                    zIndex={combinedEnd - combinedStart < 5 ? 1 : 2}
                    onMouseDown={handleMouseDown('end')}
                    ariaLabel={t('editorCore.drawingEnd', 'End')}
                  />
                  <TimelineMarker
                    position={combinedStart}
                    isDragging={isDragging === 'start'}
                    zIndex={combinedEnd - combinedStart < 5 ? 2 : 1}
                    onMouseDown={handleMouseDown('start')}
                    ariaLabel={t('editorCore.drawingStart', 'Start')}
                  />
                </>
              );
            })()}
          </div>

          {/* Time labels */}
          <div className="flex justify-between text-xs text-[var(--color-text-subtle)] mt-0.5">
            <span>0s</span>
            <span>{duration.toFixed(1)}s</span>
          </div>
        </div>
      )}

      {/* Info text when tools are disabled (only in video mode outside VideoSection) */}
      {isToolsDisabled && (
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          {t('editorCore.moveToVideoSection', 'Move playhead inside a video section to draw')}
        </p>
      )}
    </div>
  );
}
