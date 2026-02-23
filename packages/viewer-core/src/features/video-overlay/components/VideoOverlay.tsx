import { type ReactNode, useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { clsx } from 'clsx';

import { useVideo } from '@/features/video-player';
import type { AnnotationRow, DrawingRow, ViewportKeyframe } from '@/features/instruction';
import {
  type Rectangle,
  type AreaData,
  type AreaResizeHandle,
  type ShapeType,
  type ShapeColor,
  type ShapeHandleType,
  type OverlayMode,
} from '../types';
import { useAreaSelection } from '../hooks/useAreaSelection';
import { useAreaResize } from '../hooks/useAreaResize';
import { useVideoBounds } from '../hooks/useVideoBounds';
import { AreaHighlight } from './AreaHighlight';
import { AnnotationLayer } from './AnnotationLayer';
import { DrawingLayer } from './DrawingLayer';
import { DrawingPreview } from './DrawingPreview';
import { TextInputPopover } from './TextInputPopover';

// Re-export for backwards compatibility
export type DrawingMode = OverlayMode;
export type VideoFrameAreaData = AreaData;
export type ResizeHandle = AreaResizeHandle;
export type AnnotationType = ShapeType;
export type AnnotationColor = ShapeColor;
export type AnnotationHandleType = ShapeHandleType;
export type DrawingHandleType = ShapeHandleType;

interface VideoOverlayProps {
  /** Slot for VideoPlayer component */
  children: ReactNode;
  /** Current drawing mode */
  mode?: DrawingMode;
  /** Existing areas to display */
  areas?: VideoFrameAreaData[];
  /** Selected area ID */
  selectedAreaId?: string | null;
  /** Area currently being frame-edited (frame follows playhead) */
  editingAreaId?: string | null;
  /** Called when an area is clicked */
  onAreaClick?: (areaId: string) => void;
  /** Called when a new area is drawn */
  onAreaCreate?: (rect: Rectangle) => void;
  /** Called when an area is deleted */
  onAreaDelete?: (areaId: string) => void;
  /** Called when an area is right-clicked (context menu) */
  onAreaContextMenu?: (areaId: string, e: React.MouseEvent) => void;
  /** Called when an area is resized */
  onAreaUpdate?: (areaId: string, newRect: Rectangle) => void;
  /** Called when area selection should be cleared (e.g., background click in draw mode) */
  onAreaDeselect?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Annotations to display */
  annotations?: AnnotationRow[];
  /** Selected annotation ID */
  selectedAnnotationId?: string | null;
  /** Called when an annotation is clicked (null = deselect) */
  onAnnotationClick?: (annotationId: string | null) => void;
  /** Called when an annotation is deleted via DEL key */
  onAnnotationDelete?: (annotationId: string) => void;
  /** Current annotation tool (when mode is 'annotation') */
  annotationTool?: AnnotationType | null;
  /** Current annotation color */
  annotationColor?: AnnotationColor;
  /** Annotation drawing state */
  annotationDrawing?: {
    isDrawing: boolean;
    startPoint: { x: number; y: number } | null;
    currentPoint: { x: number; y: number } | null;
  };
  /** Annotation drawing handlers */
  onAnnotationMouseDown?: (e: React.MouseEvent, container: HTMLElement) => void;
  onAnnotationMouseMove?: (e: React.MouseEvent, container: HTMLElement) => void;
  onAnnotationMouseUp?: () => void;
  /** Called when an annotation resize handle is clicked */
  onAnnotationHandleMouseDown?: (annotationId: string, handle: AnnotationHandleType, e: React.MouseEvent) => void;
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
  };
  /** Text input state for text annotations */
  textInputState?: {
    isOpen: boolean;
    position: { x: number; y: number } | null;
    initialText?: string;
    initialFontSize?: number;
  };
  /** Called when text annotation is submitted */
  onTextSubmit?: (text: string, fontSize: number) => void;
  /** Called when text input is cancelled */
  onTextCancel?: () => void;
  /** Called when user clicks on empty background (deselects all) */
  onBackgroundClick?: () => void;
  /** Current viewport for Ken Burns effect (always visible) */
  currentViewport?: ViewportKeyframe | null;
  /** Whether the viewport is selected for editing */
  isViewportSelected?: boolean;
  /** Called when the viewport is clicked (select for editing) */
  onViewportClick?: () => void;
  /** Called when the viewport is resized (updates keyframe at current frame) */
  onViewportUpdate?: (viewport: ViewportKeyframe) => void;
  /** Video drawings to display (already filtered by visible frame range) */
  drawings?: DrawingRow[];
  /** Selected drawing ID */
  selectedDrawingId?: string | null;
  /** Called when a drawing is clicked (null = deselect) */
  onDrawingClick?: (drawingId: string | null) => void;
  /** Called when a drawing is deleted via DEL key */
  onDrawingDelete?: (drawingId: string) => void;
  /** Called when a drawing resize handle is clicked */
  onDrawingHandleMouseDown?: (drawingId: string, handle: DrawingHandleType, e: React.MouseEvent) => void;
  /** Optional: setter for drawing resize hook's container ref */
  drawingResizeContainerRef?: (element: HTMLDivElement | null) => void;
  /** Drawing resize state for live preview */
  drawingResizeState?: {
    isResizing: boolean;
    resizingDrawingId: string | null;
    liveCoords: {
      x1: number;
      y1: number;
      x2: number | null;
      y2: number | null;
    } | null;
  };
  /** Bounds for annotation (image) drawings - coordinates in Video-Local Space (0-100%) */
  annotationBounds?: Rectangle | null;
  /** Bounds for video drawings - coordinates in Video-Local Space (0-100%) */
  drawingBounds?: Rectangle | null;
  /** Called when a selected drawing is double-clicked (for text editing) */
  onDrawingDoubleClick?: (drawingId: string) => void;
  /** Called when a selected annotation is double-clicked (for text editing) */
  onAnnotationDoubleClick?: (annotationId: string) => void;
  /** Ref to expose area selection state and cancel function */
  areaSelectionRef?: React.MutableRefObject<{ isDrawing: boolean; cancel: () => void } | null>;
}

/**
 * VideoOverlay Component
 *
 * Wraps the video player with an interactive overlay for:
 * - Drawing rectangle areas (for VideoFrameArea creation)
 * - Displaying existing areas
 * - Annotations and drawings (SVG shapes)
 *
 * ARCHITECTURE: All interactive layers are positioned relative to the VIDEO area (not the container).
 * This means:
 * - Coordinates are always 0-100% of the video
 * - Letterbox regions are automatically excluded
 * - No coordinate transformation needed between input and rendering
 */
export function VideoOverlay({
  children,
  mode = 'none',
  areas = [],
  selectedAreaId,
  editingAreaId,
  onAreaClick,
  onAreaCreate,
  onAreaDelete: _onAreaDelete,
  onAreaContextMenu,
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
  textInputState,
  onTextSubmit,
  onTextCancel,
  onBackgroundClick,
  currentViewport,
  isViewportSelected,
  onViewportClick,
  onViewportUpdate,
  drawings = [],
  selectedDrawingId,
  onDrawingClick,
  onDrawingDelete,
  onDrawingHandleMouseDown,
  drawingResizeContainerRef,
  drawingResizeState,
  annotationBounds,
  onDrawingDoubleClick,
  onAnnotationDoubleClick,
  drawingBounds,
  areaSelectionRef,
}: VideoOverlayProps) {
  const { pause } = useVideo();
  const outerContainerRef = useRef<HTMLDivElement | null>(null);
  const videoOverlayRef = useRef<HTMLDivElement | null>(null);

  // Get actual video bounds (position within container, accounting for letterboxing)
  const videoBounds = useVideoBounds(outerContainerRef);

  // Track video overlay dimensions for rendering
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });

  // Update dimensions when videoBounds changes
  useEffect(() => {
    if (videoBounds) {
      setVideoDimensions({ width: videoBounds.width, height: videoBounds.height });
    }
  }, [videoBounds]);

  // Area selection hook - no videoBounds needed since we're already in video space
  const {
    isDrawing,
    currentRect: drawingRect,
    setContainerRef: setDrawingContainerRef,
    startDrawing,
    updateDrawing,
    finishDrawing,
    cancelDrawing,
  } = useAreaSelection({
    onComplete: (rect) => {
      onAreaCreate?.(rect);
    },
  });

  // Expose area selection state via ref for ESC handling in parent
  useEffect(() => {
    if (areaSelectionRef) {
      areaSelectionRef.current = { isDrawing, cancel: cancelDrawing };
    }
  }, [areaSelectionRef, isDrawing, cancelDrawing]);

  // Area resize hook - no videoBounds needed
  const {
    isResizing,
    currentRect: resizingRect,
    resizingAreaId,
    containerRef: setResizeContainerRef,
    startResize,
  } = useAreaResize({
    onResizeComplete: (areaId, newRect) => {
      if (areaId === '__viewport__') {
        // Convert to 0-1 normalized for viewport update
        onViewportUpdate?.({
          x: newRect.x / 100,
          y: newRect.y / 100,
          width: newRect.width / 100,
          height: newRect.height / 100,
        });
      } else {
        onAreaUpdate?.(areaId, newRect);
      }
    },
  });

  // Combined ref setter for all hooks - points to video overlay div
  const setVideoOverlayRef = useCallback((element: HTMLDivElement | null) => {
    videoOverlayRef.current = element;
    setDrawingContainerRef(element);
    setResizeContainerRef(element);
    annotationResizeContainerRef?.(element);
    drawingResizeContainerRef?.(element);
  }, [setDrawingContainerRef, setResizeContainerRef, annotationResizeContainerRef, drawingResizeContainerRef]);

  const handleResizeStart = useCallback(
    (areaId: string, handle: ResizeHandle, initialRect: Rectangle, e?: React.MouseEvent) => {
      pause();
      startResize(areaId, handle, initialRect, e);
    },
    [pause, startResize]
  );

  const isDrawMode = mode !== 'none';
  const isAnnotationMode = mode === 'annotation';
  const isAreaDrawMode = mode === 'area' || mode === 'partToolScan' || mode === 'viewport';

  // Apply live coords to annotation being resized
  const annotationsWithLiveCoords = useMemo(() => {
    if (!annotationResizeState?.isResizing || !annotationResizeState.liveCoords) {
      return annotations;
    }
    return annotations.map((annotation) => {
      if (annotation.id === annotationResizeState.resizingAnnotationId) {
        return {
          ...annotation,
          x1: annotationResizeState.liveCoords!.x1,
          y1: annotationResizeState.liveCoords!.y1,
          x2: annotationResizeState.liveCoords!.x2,
          y2: annotationResizeState.liveCoords!.y2,
          radius: annotationResizeState.liveCoords!.radius,
        };
      }
      return annotation;
    });
  }, [annotations, annotationResizeState]);

  // Apply live coords to drawing being resized
  const drawingsWithLiveCoords = useMemo(() => {
    if (!drawingResizeState?.isResizing || !drawingResizeState.liveCoords) {
      return drawings;
    }
    return drawings.map((drawing) => {
      if (drawing.id === drawingResizeState.resizingDrawingId) {
        return {
          ...drawing,
          x1: drawingResizeState.liveCoords!.x1,
          y1: drawingResizeState.liveCoords!.y1,
          x2: drawingResizeState.liveCoords!.x2,
          y2: drawingResizeState.liveCoords!.y2,
        };
      }
      return drawing;
    });
  }, [drawings, drawingResizeState]);

  // Viewport as area data (already in 0-100% format)
  const viewportArea: VideoFrameAreaData | null = useMemo(() => {
    if (!currentViewport) return null;
    return {
      id: '__viewport__',
      x: currentViewport.x,
      y: currentViewport.y,
      width: currentViewport.width,
      height: currentViewport.height,
      type: 'Viewport',
      label: 'Viewport',
    };
  }, [currentViewport]);

  const handleViewportAreaClick = useCallback((areaId: string) => {
    if (areaId === '__viewport__') {
      onViewportClick?.();
    }
  }, [onViewportClick]);

  // Mouse handlers for the video overlay div
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isOnSvgElement = target.closest('svg') !== null || target.tagName === 'svg';

    if (isAreaDrawMode) {
      // Don't call onBackgroundClick here - we want to keep the current element selected
      // (e.g., PartTool) so the new area gets linked to it.
      // Deselect any highlighted area though (new draw starts fresh selection).
      if (!isOnSvgElement) onAreaDeselect?.();
      pause();
      startDrawing(e);
    } else if (isAnnotationMode && annotationTool && videoOverlayRef.current) {
      if (!isOnSvgElement) {
        onBackgroundClick?.();
        pause();
        onAnnotationMouseDown?.(e, videoOverlayRef.current);
      }
    } else {
      if (!isOnSvgElement) onBackgroundClick?.();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDrawing) {
      updateDrawing(e);
    } else if (isAnnotationMode && annotationDrawing?.isDrawing && videoOverlayRef.current) {
      onAnnotationMouseMove?.(e, videoOverlayRef.current);
    }
  };

  const handleMouseUp = useCallback(() => {
    if (isDrawing) {
      finishDrawing();
    } else if (isAnnotationMode && annotationDrawing?.isDrawing) {
      onAnnotationMouseUp?.();
    }
  }, [isDrawing, finishDrawing, isAnnotationMode, annotationDrawing?.isDrawing, onAnnotationMouseUp]);

  // Global mouseup handler - allows finishing draw even when mouse leaves the div
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDrawing) {
        updateDrawing(e);
      } else if (isAnnotationMode && annotationDrawing?.isDrawing && videoOverlayRef.current) {
        onAnnotationMouseMove?.(e as unknown as React.MouseEvent, videoOverlayRef.current);
      }
    };

    if (isDrawing || annotationDrawing?.isDrawing) {
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('mousemove', handleGlobalMouseMove);
      return () => {
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('mousemove', handleGlobalMouseMove);
      };
    }
  }, [isDrawing, annotationDrawing?.isDrawing, handleMouseUp, updateDrawing, isAnnotationMode, onAnnotationMouseMove]);

  // Drawing preview color by mode
  const PREVIEW_COLORS: Record<string, string> = {
    partToolScan: 'hsla(45, 100%, 50%, 1)',
    viewport: 'hsla(142, 71%, 45%, 1)',
  };
  const drawingPreviewColor = PREVIEW_COLORS[mode] ?? 'hsla(200, 70%, 50%, 1)';

  return (
    <div
      ref={outerContainerRef}
      className={clsx('relative w-full h-full bg-black', className)}
    >
      {/* Video player slot */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        {children}
      </div>

      {/* Video overlay div - positioned exactly over the video, excluding letterbox */}
      {videoBounds && (
        <div
          ref={setVideoOverlayRef}
          className={clsx(
            'absolute',
            isDrawMode && 'cursor-crosshair',
            isResizing && 'cursor-nwse-resize'
          )}
          style={{
            left: videoBounds.x,
            top: videoBounds.y,
            width: videoBounds.width,
            height: videoBounds.height,
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {/* Areas layer - borders are always clickable for selection */}
          {areas.map((area) => {
            if (isResizing && resizingAreaId === area.id) return null;
            return (
              <AreaHighlight
                key={area.id}
                area={area}
                selected={selectedAreaId === area.id}
                editing={editingAreaId === area.id}
                onClick={onAreaClick}
                onResizeStart={handleResizeStart}
                onContextMenu={onAreaContextMenu}
              />
            );
          })}

          {/* Viewport overlay */}
          {viewportArea && !(isResizing && resizingAreaId === '__viewport__') && (
            <AreaHighlight
              area={viewportArea}
              selected={isViewportSelected}
              onClick={handleViewportAreaClick}
              onResizeStart={handleResizeStart}
              onContextMenu={onAreaContextMenu}
            />
          )}

          {/* Annotations layer (ImageDrawings) */}
          {annotationsWithLiveCoords.length > 0 && videoDimensions.width > 0 && (
            <div className="absolute inset-0 pointer-events-none">
              <AnnotationLayer
                annotations={annotationsWithLiveCoords}
                containerWidth={videoDimensions.width}
                containerHeight={videoDimensions.height}
                selectedId={selectedAnnotationId}
                onSelect={onAnnotationClick ?? undefined}
                onDeselect={onAnnotationClick ? () => onAnnotationClick(null) : undefined}
                onDelete={onAnnotationDelete}
                onHandleMouseDown={onAnnotationHandleMouseDown}
                bounds={annotationBounds}
                isDrawModeActive={isAreaDrawMode}
                onDoubleClick={onAnnotationDoubleClick}
              />
            </div>
          )}

          {/* Video drawings layer */}
          {drawingsWithLiveCoords.length > 0 && videoDimensions.width > 0 && (
            <div className="absolute inset-0 pointer-events-none">
              <DrawingLayer
                drawings={drawingsWithLiveCoords}
                containerWidth={videoDimensions.width}
                containerHeight={videoDimensions.height}
                selectedId={selectedDrawingId}
                onSelect={onDrawingClick ?? undefined}
                onDeselect={onDrawingClick ? () => onDrawingClick(null) : undefined}
                onDelete={onDrawingDelete}
                onHandleMouseDown={onDrawingHandleMouseDown}
                bounds={drawingBounds}
                isDrawModeActive={isAreaDrawMode}
                onDoubleClick={onDrawingDoubleClick}
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
            videoDimensions.width > 0 && (
              <svg
                className="absolute inset-0 pointer-events-none"
                width={videoDimensions.width}
                height={videoDimensions.height}
              >
                <DrawingPreview
                  tool={annotationTool}
                  color={annotationColor}
                  startPoint={annotationDrawing.startPoint}
                  currentPoint={annotationDrawing.currentPoint}
                  containerWidth={videoDimensions.width}
                  containerHeight={videoDimensions.height}
                />
              </svg>
            )}

          {/* Resize preview */}
          {isResizing && resizingRect && (() => {
            const resizingArea = areas.find((a) => a.id === resizingAreaId);

            let previewColor = 'hsla(200, 70%, 50%, 1)';
            if (resizingAreaId === '__viewport__') previewColor = 'hsla(30, 100%, 50%, 1)';
            else if (resizingArea?.type === 'PartToolScan') previewColor = 'hsla(45, 100%, 50%, 1)';

            return (
              <div
                className="absolute border-2 pointer-events-none"
                style={{
                  left: `${resizingRect.x}%`,
                  top: `${resizingRect.y}%`,
                  width: `${resizingRect.width}%`,
                  height: `${resizingRect.height}%`,
                  borderColor: previewColor,
                  backgroundColor: `${previewColor}15`,
                }}
              />
            );
          })()}

          {/* Drawing rectangle preview */}
          {isDrawing && drawingRect && isAreaDrawMode && (
            <div
              className="absolute border-2 border-dashed rounded-sm pointer-events-none"
              style={{
                left: `${drawingRect.x}%`,
                top: `${drawingRect.y}%`,
                width: `${drawingRect.width}%`,
                height: `${drawingRect.height}%`,
                borderColor: drawingPreviewColor,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }}
            />
          )}

          {/* Text input popover */}
          {textInputState?.isOpen && textInputState.position && videoDimensions.width > 0 && (
            <TextInputPopover
              position={textInputState.position}
              containerWidth={videoDimensions.width}
              containerHeight={videoDimensions.height}
              onSubmit={(text, fontSize) => onTextSubmit?.(text, fontSize)}
              onCancel={() => onTextCancel?.()}
              initialText={textInputState.initialText}
              initialFontSize={textInputState.initialFontSize}
            />
          )}
        </div>
      )}

      {/* Draw mode indicator - outside video overlay, at container level */}
      {isDrawMode && (
        <div className="absolute top-2 left-2 px-2 py-1 rounded text-xs text-white bg-black/50 z-50">
          {mode === 'area' && 'Draw area (Shift = free)'}
          {mode === 'partToolScan' && 'Scan part/tool (Shift = free)'}
          {mode === 'viewport' && 'Draw viewport (Shift = free)'}
        </div>
      )}
    </div>
  );
}
