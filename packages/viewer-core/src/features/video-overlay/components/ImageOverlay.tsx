import { useCallback, useRef, useEffect, useMemo } from 'react';
import { clsx } from 'clsx';

import type { DrawingRow } from '@/features/instruction';
import type {
  Rectangle,
  AreaData,
  AreaResizeHandle,
  ShapeType,
  ShapeColor,
  ShapeHandleType,
} from '../types';
import { useAreaSelection } from '../hooks/useAreaSelection';
import { useAreaResize } from '../hooks/useAreaResize';
import { useImageBounds } from '../hooks/useImageBounds';
import { applyLiveCoords } from '../utils/applyLiveCoords';
import { AreaHighlight } from './AreaHighlight';
import { AnnotationLayer } from './AnnotationLayer';
import { DrawingPreview } from './DrawingPreview';

/** Simplified overlay mode for ImageOverlay (no viewport) */
export type ImageOverlayMode = 'none' | 'area' | 'annotation';

interface ImageOverlayProps {
  /** Image source URL */
  imageSrc: string;
  /** Current overlay mode */
  mode?: ImageOverlayMode;
  /** Existing areas to display */
  areas?: AreaData[];
  /** Selected area ID */
  selectedAreaId?: string | null;
  /** Called when an area is clicked */
  onAreaClick?: (areaId: string) => void;
  /** Called when a new area is drawn */
  onAreaCreate?: (rect: Rectangle) => void;
  /** Called when an area is resized */
  onAreaUpdate?: (areaId: string, newRect: Rectangle) => void;
  /** Called when area selection should be cleared */
  onAreaDeselect?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Annotations to display (image drawings) */
  annotations?: DrawingRow[];
  /** Selected annotation ID */
  selectedAnnotationId?: string | null;
  /** Called when an annotation is clicked (null = deselect) */
  onAnnotationClick?: (annotationId: string | null) => void;
  /** Called when an annotation is deleted via DEL key */
  onAnnotationDelete?: (annotationId: string) => void;
  /** Current annotation tool (when mode is 'annotation') */
  annotationTool?: ShapeType | null;
  /** Current annotation color */
  annotationColor?: ShapeColor;
  /** Annotation drawing state */
  annotationDrawing?: {
    isDrawing: boolean;
    startPoint: { x: number; y: number } | null;
    currentPoint: { x: number; y: number } | null;
    freehandPoints?: { x: number; y: number }[];
  };
  /** Annotation drawing handlers */
  onAnnotationMouseDown?: (e: React.MouseEvent, container: HTMLElement) => void;
  onAnnotationMouseMove?: (e: MouseEvent | React.MouseEvent, container: HTMLElement) => void;
  onAnnotationMouseUp?: () => void;
  /** Called when an annotation resize handle is clicked */
  onAnnotationHandleMouseDown?: (annotationId: string, handle: ShapeHandleType, e: React.MouseEvent) => void;
  /** Optional: setter for annotation resize hook's container ref */
  annotationResizeContainerRef?: (element: HTMLDivElement | null) => void;
  /** Annotation resize state for live preview */
  annotationResizeState?: {
    isResizing: boolean;
    resizingAnnotationId: string | null;
    liveCoords: {
      x1: number;
      y1: number;
      x2: number | null;
      y2: number | null;
      radius: number | null;
    } | null;
    /** Live coordinates for all shapes during group move/resize */
    liveGroupCoords?: ReadonlyMap<string, {
      x1: number;
      y1: number;
      x2: number | null;
      y2: number | null;
      radius: number | null;
    }> | null;
  };
  /** Multi-select: set of selected annotation IDs */
  selectedAnnotationIds?: ReadonlySet<string>;
  /** Called with event for multi-select support (Ctrl+click) */
  onAnnotationClickWithEvent?: (id: string, e: React.MouseEvent) => void;
  /** Called when user clicks on empty background (deselects all) */
  onBackgroundClick?: () => void;
  /** Bounds for annotation (image) drawings - coordinates in Video-Local Space (0-100%) */
  annotationBounds?: Rectangle | null;
  /** Called when a selected annotation is double-clicked (for text editing) */
  onAnnotationDoubleClick?: (annotationId: string) => void;
  /** Whether to show the black background behind the image (default: true) */
  showBackground?: boolean;
}

/**
 * ImageOverlay Component
 *
 * Like VideoOverlay but for static images. Same overlay architecture
 * (areas → annotations → preview → text input) but:
 * - Takes `imageSrc` prop instead of `children` VideoPlayer
 * - Uses `useImageBounds` instead of `useVideoBounds`
 * - No `useVideo()` / `pause()` calls
 * - Supports modes: 'none', 'area', 'annotation'
 */
export function ImageOverlay({
  imageSrc,
  mode = 'none',
  areas = [],
  selectedAreaId,
  onAreaClick,
  onAreaCreate,
  onAreaUpdate,
  onAreaDeselect,
  className,
  annotations = [],
  selectedAnnotationId,
  onAnnotationClick,
  onAnnotationDelete,
  annotationTool,
  annotationColor = 'teal',
  annotationDrawing,
  onAnnotationMouseDown,
  onAnnotationMouseMove,
  onAnnotationMouseUp,
  onAnnotationHandleMouseDown,
  annotationResizeContainerRef,
  annotationResizeState,
  selectedAnnotationIds,
  onAnnotationClickWithEvent,
  onBackgroundClick,
  annotationBounds,
  onAnnotationDoubleClick,
  showBackground = true,
}: ImageOverlayProps) {
  const outerContainerRef = useRef<HTMLDivElement | null>(null);
  const imageOverlayRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Get actual image bounds (position within container, accounting for letterboxing)
  const imageBounds = useImageBounds(outerContainerRef, imageRef);

  // Derive overlay dimensions directly from imageBounds (no extra render cycle)
  const overlayWidth = imageBounds?.width ?? 0;
  const overlayHeight = imageBounds?.height ?? 0;

  // Area selection hook
  const {
    isDrawing,
    currentRect: drawingRect,
    setContainerRef: setDrawingContainerRef,
    startDrawing,
    updateDrawing,
    finishDrawing,
  } = useAreaSelection({
    onComplete: (rect) => onAreaCreate?.(rect),
  });

  // Area resize hook
  const {
    isResizing,
    currentRect: resizingRect,
    resizingAreaId,
    containerRef: setResizeContainerRef,
    startResize,
  } = useAreaResize({
    onResizeComplete: (areaId, newRect) => onAreaUpdate?.(areaId, newRect),
  });

  // Combined ref setter for all hooks
  const setImageOverlayRef = useCallback((element: HTMLDivElement | null) => {
    imageOverlayRef.current = element;
    setDrawingContainerRef(element);
    setResizeContainerRef(element);
    annotationResizeContainerRef?.(element);
  }, [setDrawingContainerRef, setResizeContainerRef, annotationResizeContainerRef]);

  const handleResizeStart = useCallback(
    (areaId: string, handle: AreaResizeHandle, initialRect: Rectangle, e?: React.MouseEvent) => {
      startResize(areaId, handle, initialRect, e);
    },
    [startResize]
  );

  const isDrawMode = mode !== 'none';
  const isAnnotationMode = mode === 'annotation';
  const isAreaDrawMode = mode === 'area';

  // Apply live coords to annotation being resized (single or group)
  const annotationsWithLiveCoords = useMemo(
    () => applyLiveCoords(annotations, {
      isResizing: annotationResizeState?.isResizing ?? false,
      liveGroupCoords: annotationResizeState?.liveGroupCoords,
      liveCoords: annotationResizeState?.liveCoords ?? null,
      resizingShapeId: annotationResizeState?.resizingAnnotationId ?? null,
    }),
    [annotations, annotationResizeState],
  );

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isOnSvgElement = target.closest('svg') !== null || target.tagName === 'svg';

    if (isAreaDrawMode) {
      if (!isOnSvgElement) onAreaDeselect?.();
      startDrawing(e);
    } else if (isAnnotationMode && annotationTool && imageOverlayRef.current) {
      if (!isOnSvgElement) {
        onBackgroundClick?.();
        onAnnotationMouseDown?.(e, imageOverlayRef.current);
      }
    } else {
      if (!isOnSvgElement) onBackgroundClick?.();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDrawing) {
      updateDrawing(e);
    } else if (isAnnotationMode && annotationDrawing?.isDrawing && imageOverlayRef.current) {
      onAnnotationMouseMove?.(e, imageOverlayRef.current);
    }
  };

  const handleMouseUp = () => {
    if (isDrawing) {
      finishDrawing();
    } else if (isAnnotationMode && annotationDrawing?.isDrawing) {
      onAnnotationMouseUp?.();
    }
  };

  // Global mouseup/mousemove handlers (for dragging outside the overlay)
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDrawing) {
        finishDrawing();
      } else if (isAnnotationMode && annotationDrawing?.isDrawing) {
        onAnnotationMouseUp?.();
      }
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDrawing) {
        updateDrawing(e);
      } else if (isAnnotationMode && annotationDrawing?.isDrawing && imageOverlayRef.current) {
        onAnnotationMouseMove?.(e, imageOverlayRef.current);
      }
    };

    if (isDrawing || annotationDrawing?.isDrawing) {
      window.addEventListener('mouseup', handleGlobalMouseUp);
      window.addEventListener('mousemove', handleGlobalMouseMove);
      return () => {
        window.removeEventListener('mouseup', handleGlobalMouseUp);
        window.removeEventListener('mousemove', handleGlobalMouseMove);
      };
    }
  }, [isDrawing, annotationDrawing?.isDrawing, finishDrawing, updateDrawing, isAnnotationMode, onAnnotationMouseMove, onAnnotationMouseUp]);

  return (
    <div
      ref={outerContainerRef}
      className={clsx('relative w-full h-full', showBackground && 'bg-black', className)}
    >
      {/* Image slot */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <img
          ref={imageRef}
          src={imageSrc}
          alt=""
          className="max-w-full max-h-full object-contain"
          draggable={false}
        />
      </div>

      {/* Image overlay div - positioned exactly over the image, excluding letterbox */}
      {imageBounds && (
        <div
          ref={setImageOverlayRef}
          className={clsx(
            'absolute',
            isDrawMode && 'cursor-crosshair',
            isResizing && 'cursor-nwse-resize'
          )}
          style={{
            left: imageBounds.x,
            top: imageBounds.y,
            width: imageBounds.width,
            height: imageBounds.height,
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {/* Areas layer */}
          {areas.map((area) => {
            if (isResizing && resizingAreaId === area.id) return null;
            return (
              <AreaHighlight
                key={area.id}
                area={area}
                selected={selectedAreaId === area.id}
                onClick={onAreaClick}
                onResizeStart={handleResizeStart}
              />
            );
          })}

          {/* Annotations layer (ImageDrawings) */}
          {annotationsWithLiveCoords.length > 0 && overlayWidth > 0 && (
            <div className="absolute inset-0 pointer-events-none">
              <AnnotationLayer
                annotations={annotationsWithLiveCoords}
                containerWidth={overlayWidth}
                containerHeight={overlayHeight}
                selectedId={selectedAnnotationId}
                selectedIds={selectedAnnotationIds}
                onSelect={onAnnotationClick ?? undefined}
                onSelectWithEvent={onAnnotationClickWithEvent}
                onDeselect={onAnnotationClick ? () => onAnnotationClick(null) : undefined}
                onDelete={onAnnotationDelete}
                onHandleMouseDown={onAnnotationHandleMouseDown}
                bounds={annotationBounds}
                isDrawModeActive={isAreaDrawMode}
                onDoubleClick={onAnnotationDoubleClick}
              />
            </div>
          )}

          {/* Annotation drawing preview */}
          {isAnnotationMode &&
            annotationDrawing?.isDrawing &&
            annotationDrawing.startPoint &&
            annotationDrawing.currentPoint &&
            annotationTool &&
            annotationTool !== 'text' &&
            overlayWidth > 0 && (
              <svg
                className="absolute inset-0 pointer-events-none"
                width={overlayWidth}
                height={overlayHeight}
              >
                <DrawingPreview
                  tool={annotationTool}
                  color={annotationColor}
                  startPoint={annotationDrawing.startPoint}
                  currentPoint={annotationDrawing.currentPoint}
                  containerWidth={overlayWidth}
                  containerHeight={overlayHeight}
                  freehandPoints={annotationDrawing.freehandPoints}
                />
              </svg>
            )}

          {/* Resize preview */}
          {isResizing && resizingRect && (
            <div
              className="absolute border-2 pointer-events-none"
              style={{
                left: `${resizingRect.x}%`,
                top: `${resizingRect.y}%`,
                width: `${resizingRect.width}%`,
                height: `${resizingRect.height}%`,
                borderColor: 'hsla(200, 70%, 50%, 1)',
                backgroundColor: 'hsla(200, 70%, 50%, 0.08)',
              }}
            />
          )}

          {/* Drawing rectangle preview */}
          {isDrawing && drawingRect && isAreaDrawMode && (
            <div
              className="absolute border-2 border-dashed rounded-sm pointer-events-none"
              style={{
                left: `${drawingRect.x}%`,
                top: `${drawingRect.y}%`,
                width: `${drawingRect.width}%`,
                height: `${drawingRect.height}%`,
                borderColor: 'hsla(200, 70%, 50%, 1)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }}
            />
          )}

        </div>
      )}
    </div>
  );
}
