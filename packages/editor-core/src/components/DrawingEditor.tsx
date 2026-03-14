import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ArrowUpRight, Minus, Circle, Square, Type, Pencil, CheckSquare, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';

import {
  DrawingToolbar,
  ColorPalette,
  ConfirmDeleteDialog,
  TEXT_SIZES,
  STROKE_WIDTHS,
  getShapeColorValue,
  type ShapeType,
  type ShapeColor,
} from '@monta-vis/viewer-core';

/**
 * Drawing data for list rows - can be either Image Annotation or Video Drawing
 */
export interface DrawingCardData {
  id: string;
  type: 'image' | 'video';
  shapeType: string; // arrow, line, circle, rectangle, text, freehand
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
  activeStrokeWidth?: number;
  selectedDrawingColor?: ShapeColor | null;
  selectedDrawingStrokeWidth?: number | null;
  onToolSelect: (tool: ShapeType | null) => void;
  onColorSelect: (color: ShapeColor) => void;
  onStrokeWidthSelect?: (strokeWidth: number) => void;

  // All drawings (image annotations + video drawings)
  drawings?: DrawingCardData[];
  selectedDrawingId?: string | null;
  onDrawingSelect?: (id: string) => void;

  // Multi-select (optional, backward compatible)
  selectedDrawingIds?: ReadonlySet<string>;
  onDrawingMultiSelect?: (id: string, modifier: 'ctrl' | 'shift' | null, orderedIds?: string[]) => void;

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

  /** Called when a drawing row click changes the active section type */
  onDrawingSectionChange?: (section: 'image' | 'video') => void;

  /** Batch-delete selected drawings (receives the set of IDs to remove) */
  onDrawingDelete?: (ids: ReadonlySet<string>) => void;

  /** Called when exiting select mode to deselect all */
  onDeselectAll?: () => void;

  // Actions
  onClose: () => void;
}

// Helper: Get icon component for shape type
const getShapeIcon = (shapeType: string) => {
  switch (shapeType) {
    case 'arrow': return ArrowUpRight;
    case 'line': return Minus;
    case 'circle': return Circle;
    case 'rectangle': return Square;
    case 'text': return Type;
    default: return Pencil; // freehand or unknown
  }
};

// Shape type → { i18nKey, defaultLabel }
const SHAPE_I18N: Record<string, { key: string; label: string }> = {
  arrow: { key: 'editorCore.shapeArrow', label: 'Arrow' },
  line: { key: 'editorCore.shapeLine', label: 'Line' },
  circle: { key: 'editorCore.shapeCircle', label: 'Circle' },
  rectangle: { key: 'editorCore.shapeRectangle', label: 'Rectangle' },
  text: { key: 'editorCore.shapeText', label: 'Text' },
  freehand: { key: 'editorCore.shapeFreehand', label: 'Freehand' },
};
const DEFAULT_SHAPE_I18N = SHAPE_I18N.freehand;

/** Uppercase section label */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[0.5625rem] uppercase tracking-[0.08em] text-[var(--color-text-muted)] font-medium block mb-1.5 select-none">
      {children}
    </span>
  );
}

/** Segmented toggle button for stroke width / font size */
function TogglePill({
  label,
  active,
  onClick,
  ariaLabel,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={active}
      className={clsx(
        'flex-1 py-1 text-[0.6875rem] font-semibold rounded transition-colors text-center',
        active
          ? 'bg-[var(--color-primary)] text-white'
          : 'bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]'
      )}
    >
      {label}
    </button>
  );
}

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
        'hover:bg-[var(--color-bg-hover)] transition-colors',
        isDragging && 'bg-[var(--item-bg-active)]'
      )}
      style={{
        left: `calc(${position}% - 0.375rem)`,
        zIndex,
      }}
      onMouseDown={onMouseDown}
      aria-label={ariaLabel}
    >
      <div className="w-0.5 h-4 bg-[var(--color-text-base)] rounded-full" />
    </button>
  );
}

/**
 * DrawingEditor - Unified editor for both Image Annotations and Video Drawings.
 *
 * Redesigned with grouped sections, icon-only tool row, expanded color palette,
 * stroke width selector, and list-row drawing items.
 */
export function DrawingEditor({
  activeTool,
  activeColor,
  activeStrokeWidth = 2,
  selectedDrawingColor,
  selectedDrawingStrokeWidth,
  onToolSelect,
  onColorSelect,
  onStrokeWidthSelect,
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
  onDrawingDelete,
  onDeselectAll,
  onClose,
}: DrawingEditorProps) {
  const { t } = useTranslation();

  // Select mode state
  const [selectMode, setSelectMode] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Tools disabled when in video mode and playhead is outside a VideoSection
  const isToolsDisabled = drawingMode === 'video' && !isInVideoSection;

  // Get selected drawing data
  const selectedDrawing = useMemo(() => {
    return drawings.find((d) => d.id === selectedDrawingId) ?? null;
  }, [drawings, selectedDrawingId]);

  // Derive effective selection set
  const effectiveSelectedIds = useMemo(
    () => selectedDrawingIdsProp ?? (selectedDrawingId ? new Set([selectedDrawingId]) : new Set<string>()),
    [selectedDrawingIdsProp, selectedDrawingId],
  );

  // Selected video drawings with valid frame range
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
  // Show selected drawing's stroke width if one is selected, otherwise show active
  const displayStrokeWidth = selectedDrawingStrokeWidth ?? activeStrokeWidth;

  // Split drawings into image and video arrays
  const imageDrawings = useMemo(
    () => drawings.filter((d) => d.type === 'image'),
    [drawings],
  );
  const videoDrawings = useMemo(
    () => drawings.filter((d) => d.type === 'video').sort((a, b) => (a.startFrame ?? 0) - (b.startFrame ?? 0)),
    [drawings],
  );

  // Active drawings list based on mode
  const activeDrawings = drawingMode === 'image' ? imageDrawings : videoDrawings;

  // Ordered IDs for the active drawing list (used for shift+click range selection)
  const orderedIds = useMemo(() => activeDrawings.map((d) => d.id), [activeDrawings]);

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

  // Keyboard shortcut: Escape to close
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

  // Toggle select mode — clear selection when exiting
  const handleToggleSelectMode = useCallback(() => {
    setSelectMode((prev) => {
      if (prev) {
        onDeselectAll?.();
      }
      return !prev;
    });
  }, [onDeselectAll]);

  // Handle delete selected drawings
  const handleDeleteSelected = useCallback(() => {
    onDrawingDelete?.(effectiveSelectedIds);
    setSelectMode(false);
    setConfirmDeleteOpen(false);
  }, [onDrawingDelete, effectiveSelectedIds]);

  // Handle drawing list row click
  const handleDrawingRowClick = useCallback((drawing: DrawingCardData, e: React.MouseEvent) => {
    onDrawingSectionChange?.(drawing.type);
    if (selectMode && onDrawingMultiSelect) {
      // In select mode, always toggle (ctrl modifier) without needing modifier keys
      onDrawingMultiSelect(drawing.id, 'ctrl', orderedIds);
    } else if (onDrawingMultiSelect) {
      const modifier = (e.ctrlKey || e.metaKey) ? 'ctrl' : e.shiftKey ? 'shift' : null;
      onDrawingMultiSelect(drawing.id, modifier, orderedIds);
    } else {
      onDrawingSelect?.(drawing.id);
    }
  }, [selectMode, onDrawingSectionChange, onDrawingMultiSelect, onDrawingSelect, orderedIds]);

  // Format time from percent
  const formatTime = useCallback((percent: number): string => {
    const seconds = (percent / 100) * duration;
    return `${seconds.toFixed(1)}s`;
  }, [duration]);

  return (
    <div className="flex flex-col p-3 gap-3">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-[var(--color-text-base)] tracking-wide">
          {t('editorCore.drawingTools', 'Drawing Tools')}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md hover:bg-[var(--item-bg-hover)] transition-colors"
          aria-label={t('common.close')}
          data-testid="drawing-editor-close"
        >
          <X className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
        </button>
      </div>

      {/* ── Tools ── */}
      <div
        data-testid="drawing-tools-row"
        className={clsx(isToolsDisabled && 'opacity-40 pointer-events-none')}
      >
        <SectionLabel>{t('editorCore.sectionShape', 'Shape')}</SectionLabel>
        <DrawingToolbar activeTool={activeTool} onToolSelect={onToolSelect} />
      </div>

      {/* ── Divider ── */}
      <div className="h-px bg-[var(--color-border-base)]" />

      {/* ── Color ── */}
      <div className={clsx(isToolsDisabled && 'opacity-40 pointer-events-none')}>
        <SectionLabel>{t('editorCore.sectionColor', 'Color')}</SectionLabel>
        <ColorPalette activeColor={displayColor} onColorSelect={onColorSelect} />
      </div>

      {/* ── Stroke width ── */}
      <div className={clsx(isToolsDisabled && 'opacity-40 pointer-events-none')}>
        <SectionLabel>{t('editorCore.sectionStroke', 'Stroke')}</SectionLabel>
        <div className="flex gap-1">
          {STROKE_WIDTHS.map(({ label, value, ariaLabel }) => (
            <TogglePill
              key={label}
              label={label}
              active={displayStrokeWidth === value}
              onClick={() => onStrokeWidthSelect?.(value)}
              ariaLabel={t(`editorCore.stroke${label}`, ariaLabel)}
            />
          ))}
        </div>
      </div>

      {/* ── Font size (text drawings only) ── */}
      {selectedDrawing?.shapeType === 'text' && onFontSizeSelect && (
        <div>
          <SectionLabel>{t('editorCore.sectionFontSize', 'Font Size')}</SectionLabel>
          <div className="flex gap-1">
            {TEXT_SIZES.map(({ label, value, ariaLabel }) => (
              <TogglePill
                key={label}
                label={label}
                active={(selectedDrawingFontSize ?? 5) === value}
                onClick={() => onFontSizeSelect(value)}
                ariaLabel={ariaLabel}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Drawings list ── */}
      {activeDrawings.length > 0 && (
        <>
          <div className="h-px bg-[var(--color-border-base)]" />
          <div>
            <div className="flex items-center justify-between">
              <SectionLabel>
                {t('editorCore.sectionDrawings', 'Drawings')}
                <span className="ml-1 text-[var(--color-text-subtle)]">
                  {activeDrawings.length}
                </span>
              </SectionLabel>
              <div className="flex items-center gap-1">
                {onDrawingMultiSelect && (
                  <button
                    type="button"
                    data-testid="select-mode-toggle"
                    onClick={handleToggleSelectMode}
                    aria-label={t('editorCore.selectMode', 'Select mode')}
                    aria-pressed={selectMode}
                    className={clsx(
                      'p-1 rounded-md transition-colors',
                      selectMode
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'text-[var(--color-text-muted)] hover:bg-[var(--item-bg-hover)]'
                    )}
                  >
                    <CheckSquare className="h-3.5 w-3.5" />
                  </button>
                )}
                {effectiveSelectedIds.size > 0 && onDrawingDelete && (
                  <button
                    type="button"
                    data-testid="delete-selected-btn"
                    onClick={() => setConfirmDeleteOpen(true)}
                    aria-label={t('editorCore.deleteSelected', 'Delete selected')}
                    className="p-1 rounded-md text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors flex items-center gap-0.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="text-[0.625rem] font-semibold">{effectiveSelectedIds.size}</span>
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-0.5" data-testid={`${drawingMode}-drawings-section`}>
              {activeDrawings.map((drawing) => {
                const Icon = getShapeIcon(drawing.shapeType);
                const isSelected = effectiveSelectedIds.has(drawing.id);
                const colorValue = getShapeColorValue(drawing.color);

                return (
                  <button
                    key={drawing.id}
                    type="button"
                    onClick={(e) => handleDrawingRowClick(drawing, e)}
                    className={clsx(
                      'group flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
                      'border-l-2',
                      isSelected
                        ? 'bg-[var(--item-bg-selected)] border-l-[var(--color-primary)]'
                        : 'bg-transparent hover:bg-[var(--item-bg-hover)]'
                    )}
                    style={isSelected ? undefined : { borderLeftColor: colorValue }}
                    aria-label={t('editorCore.selectDrawing')}
                    aria-pressed={isSelected}
                  >
                    {selectMode && (
                      <span data-testid={`drawing-checkbox-${drawing.id}`}>
                        {isSelected ? (
                          <CheckSquare className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />
                        ) : (
                          <Square className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />
                        )}
                      </span>
                    )}
                    <Icon
                      className="h-3.5 w-3.5 shrink-0"
                      style={{ color: colorValue }}
                    />
                    <span className={clsx(
                      'text-[0.6875rem] truncate flex-1',
                      isSelected
                        ? 'text-[var(--color-text-base)]'
                        : 'text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-base)]'
                    )}>
                      {(() => {
                        const { key, label } = SHAPE_I18N[drawing.shapeType] ?? DEFAULT_SHAPE_I18N;
                        return t(key, label);
                      })()}
                    </span>
                    {drawing.type === 'video' && drawing.startFrame != null && drawing.endFrame != null && (
                      <span className="text-[0.5625rem] tabular-nums text-[var(--color-text-muted)] whitespace-nowrap">
                        {formatTime(drawing.startFrame)}–{formatTime(drawing.endFrame)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Timeline (video mode only) ── */}
      {drawingMode === 'video' && (
        <>
          <div className="h-px bg-[var(--color-border-base)]" />
          <div>
            <SectionLabel>{t('editorCore.sectionTimeline', 'Timeline')}</SectionLabel>
            <div
              ref={trackRef}
              className="relative h-5 rounded bg-[var(--color-bg-surface)] border border-[var(--color-border-base)]"
            >
              {(() => {
                if (selectedVideoDrawings.length === 0) return null;

                const combinedStart = Math.min(...selectedVideoDrawings.map((d) => d.startFrame ?? 0));
                const combinedEnd = Math.max(...selectedVideoDrawings.map((d) => d.endFrame ?? 100));

                return (
                  <>
                    <div
                      className="absolute top-0.5 bottom-0.5 rounded-sm"
                      style={{
                        left: `${combinedStart}%`,
                        width: `${combinedEnd - combinedStart}%`,
                        backgroundColor: 'var(--color-element-drawing)',
                        opacity: 0.6,
                      }}
                    />
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
            <div className="flex justify-between text-[0.5625rem] tabular-nums text-[var(--color-text-muted)] mt-0.5 px-0.5">
              <span>0s</span>
              <span>{duration.toFixed(1)}s</span>
            </div>
          </div>
        </>
      )}

      {/* ── Disabled info ── */}
      {isToolsDisabled && (
        <p className="text-[0.6875rem] text-[var(--color-text-muted)] leading-snug">
          {t('editorCore.moveToVideoSection', 'Move playhead inside a video section to draw')}
        </p>
      )}

      {/* ── Confirm batch delete dialog ── */}
      <ConfirmDeleteDialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDeleteSelected}
        title={t('editorCore.deleteDrawingsTitle', 'Delete Drawings')}
        message={t('editorCore.deleteDrawingsConfirm', {
          count: effectiveSelectedIds.size,
          defaultValue: 'Delete {{count}} selected drawing(s)?',
        })}
      />
    </div>
  );
}
