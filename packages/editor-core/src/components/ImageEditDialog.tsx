import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ImageOverlay,
  TextInputModal,
  VideoFrameCapture,
  useAnnotationDrawing,
  useAnnotationResize,
  type Rectangle,
  type DrawingRow,
  type ImageOverlayMode,
  type FrameCaptureData,
} from '@monta-vis/viewer-core';
import { useImageDrawing } from '../hooks/useImageDrawing';
import { useDrawingDeleteKey } from '../hooks/useDrawingDeleteKey';
import { DrawingEditor } from './DrawingEditor';
import { MediaEditDialog } from './MediaEditDialog';

const FULL_IMAGE_BOUNDS: Rectangle = { x: 0, y: 0, width: 100, height: 100 };

export interface ImageEditDialogProps {
  open: boolean;
  onClose: () => void;
  imageSrc?: string;
  /** Frame capture data — when provided, captures a frame from raw video as image source */
  frameCaptureData?: FrameCaptureData;
  /** Drawing data + callbacks */
  videoFrameAreaId: string | null;
  versionId: string;
  drawings: Record<string, DrawingRow>;
  onAddDrawing: (drawing: DrawingRow) => void;
  onUpdateDrawing: (id: string, updates: Partial<DrawingRow>) => void;
  onDeleteDrawing: (id: string) => void;
}

/**
 * ImageEditDialog — full-screen modal combining ImageOverlay + DrawingSidebar + useImageDrawing.
 *
 * Layout:
 * ┌──────────────────────────────────────────────────┐
 * │ [Edit Image]                          [X Close]  │
 * ├──────────────────────────────────────────────────┤
 * │                                │ [→] [○] [□] [T] │
 * │                                │ ● ● (colors)    │
 * │   ImageOverlay                 │ [S] [M] [L]     │
 * │   ┌──────────────────┐        │                  │
 * │   │   Annotations    │        │ ■ ■ ■ (cards)    │
 * │   └──────────────────┘        │                  │
 * │                                │                  │
 * ├──────────────────────────────────────────────────┤
 * │                                  [Close]          │
 * └──────────────────────────────────────────────────┘
 */
export function ImageEditDialog({
  open,
  onClose,
  imageSrc,
  frameCaptureData,
  videoFrameAreaId,
  versionId,
  drawings,
  onAddDrawing,
  onUpdateDrawing,
  onDeleteDrawing,
}: ImageEditDialogProps) {
  const { t } = useTranslation();

  // Frame capture support: capture a frame from raw video as image source
  const [capturedImageSrc, setCapturedImageSrc] = useState<string | null>(null);
  const effectiveImageSrc = capturedImageSrc ?? imageSrc ?? '';

  // Reset captured image when frameCaptureData changes
  useEffect(() => {
    setCapturedImageSrc(null);
  }, [frameCaptureData?.videoSrc, frameCaptureData?.frameNumber]);

  // Drawing state management
  const imageDrawing = useImageDrawing({
    videoFrameAreaId,
    versionId,
    drawings,
    addDrawing: onAddDrawing,
    updateDrawing: onUpdateDrawing,
    deleteDrawing: onDeleteDrawing,
  });

  // Annotation drawing hook (actual mouse interaction)
  const annotationDrawingHook = useAnnotationDrawing({
    tool: imageDrawing.drawingTool,
    color: imageDrawing.drawingColor,
    strokeWidth: imageDrawing.drawingStrokeWidth,
    onShapeCreate: imageDrawing.handleShapeDrawn,
    onTextInput: imageDrawing.handleTextInput,
    bounds: FULL_IMAGE_BOUNDS,
  });

  // Annotation resize hook (with group move/resize support)
  const annotationResize = useAnnotationResize({
    onResizeComplete: (id, coords) => {
      const updates: Partial<DrawingRow> = {
        x1: coords.x1,
        y1: coords.y1,
        x2: coords.x2,
        y2: coords.y2,
      };
      // Text shapes use x/y for positioning (preferred over x1/y1 by renderer)
      const drawing = drawings[id];
      if (drawing?.type === 'text') {
        updates.x = coords.x1;
        updates.y = coords.y1;
      }
      onUpdateDrawing(id, updates);
    },
    onGroupMoveComplete: (moves) => {
      for (const { id, updates } of moves) {
        const finalUpdates: Partial<DrawingRow> = { ...updates };
        const drawing = drawings[id];
        if (drawing?.type === 'text' && updates.x1 !== undefined) {
          finalUpdates.x = updates.x1;
          finalUpdates.y = updates.y1;
        }
        onUpdateDrawing(id, finalUpdates);
      }
    },
    bounds: FULL_IMAGE_BOUNDS,
  });

  // Delete key handler for selected annotation (multi-select aware)
  useDrawingDeleteKey(open, imageDrawing.selectedDrawingId, imageDrawing.handleDrawingDelete, imageDrawing.selectedDrawingIds);

  // Mode logic: tool selected → annotation mode, else none (area resizable)
  const overlayMode: ImageOverlayMode = imageDrawing.drawingTool ? 'annotation' : 'none';

  // Handle background click (deselect annotation)
  const handleBackgroundClick = useCallback(() => {
    imageDrawing.deselectDrawing();
  }, [imageDrawing.deselectDrawing]);

  // Handle annotation click
  const handleAnnotationClick = useCallback(
    (id: string | null) => {
      if (id) {
        imageDrawing.handleDrawingMultiSelect(id, null);
      } else {
        imageDrawing.deselectDrawing();
      }
    },
    [imageDrawing.handleDrawingMultiSelect, imageDrawing.deselectDrawing]
  );

  // Handle annotation click with event (for multi-select via Ctrl+click)
  const handleAnnotationClickWithEvent = useCallback(
    (id: string, e: React.MouseEvent) => {
      if (e.ctrlKey || e.metaKey) {
        imageDrawing.handleDrawingMultiSelect(id, 'ctrl');
      } else {
        imageDrawing.handleDrawingMultiSelect(id, null);
      }
    },
    [imageDrawing.handleDrawingMultiSelect],
  );


  // Handle annotation resize start (group move/resize aware)
  const handleAnnotationHandleMouseDown = useCallback(
    (annotationId: string, handle: string, e: React.MouseEvent) => {
      const annotation = drawings[annotationId];
      if (!annotation) return;

      // Group operations: if the annotation is part of a multi-selection
      if (imageDrawing.selectedDrawingIds.size > 1 && imageDrawing.selectedDrawingIds.has(annotationId)) {
        const selectedAnnotations = imageDrawing.annotations.filter(
          (a) => imageDrawing.selectedDrawingIds.has(a.id),
        );
        if (handle === 'move') {
          annotationResize.startGroupMove(selectedAnnotations, annotationId, e);
        } else {
          annotationResize.startGroupResize(selectedAnnotations, annotationId, handle as Parameters<typeof annotationResize.startGroupResize>[2], e);
        }
      } else {
        annotationResize.startResize(annotation, handle as Parameters<typeof annotationResize.startResize>[1], e);
      }
    },
    [drawings, annotationResize, imageDrawing.selectedDrawingIds, imageDrawing.annotations]
  );

  return (
    <MediaEditDialog
      open={open}
      onClose={onClose}
      disableBackdropClick
      sidebar={
        <DrawingEditor
          activeTool={imageDrawing.drawingTool}
          activeColor={imageDrawing.drawingColor}
          activeStrokeWidth={imageDrawing.drawingStrokeWidth}
          selectedDrawingColor={imageDrawing.selectedDrawingColor}
          selectedDrawingStrokeWidth={imageDrawing.selectedDrawingStrokeWidth}
          onToolSelect={imageDrawing.handleDrawingToolSelect}
          onColorSelect={imageDrawing.handleDrawingColorSelect}
          onStrokeWidthSelect={imageDrawing.handleDrawingStrokeWidthSelect}
          drawings={imageDrawing.drawingCards}
          selectedDrawingId={imageDrawing.selectedDrawingId}
          onDrawingSelect={imageDrawing.handleDrawingSelect}
          selectedDrawingIds={imageDrawing.selectedDrawingIds}
          onDrawingMultiSelect={imageDrawing.handleDrawingMultiSelect}
          selectedDrawingFontSize={imageDrawing.selectedDrawingFontSize}
          onFontSizeSelect={imageDrawing.handleDrawingFontSizeSelect}
          drawingMode="image"
          onClose={onClose}
        />
      }
    >
      {/* Frame capture (hidden, captures frame from raw video) */}
      {frameCaptureData && !capturedImageSrc && (
        <VideoFrameCapture
          videoId={frameCaptureData.videoId}
          videoSrc={frameCaptureData.videoSrc}
          fps={frameCaptureData.fps}
          frameNumber={frameCaptureData.frameNumber}
          cropArea={frameCaptureData.cropArea}
          onCapture={(_size, dataUrl) => setCapturedImageSrc(dataUrl)}
        />
      )}

      {/* Image overlay area — square container, bg-black provides letterbox bars */}
      <div className="h-full flex items-center justify-center">
        <div className="aspect-square h-full max-w-full overflow-hidden">
          <ImageOverlay
            imageSrc={effectiveImageSrc}
            mode={overlayMode}
            annotations={imageDrawing.annotations}
            selectedAnnotationId={imageDrawing.selectedDrawingId}
            selectedAnnotationIds={imageDrawing.selectedDrawingIds}
            onAnnotationClick={handleAnnotationClick}
            onAnnotationClickWithEvent={handleAnnotationClickWithEvent}
            onAnnotationDoubleClick={imageDrawing.handleDrawingDoubleClick}
            onAnnotationDelete={imageDrawing.handleDrawingDelete}
            annotationTool={imageDrawing.drawingTool}
            annotationColor={imageDrawing.drawingColor}
            annotationDrawing={annotationDrawingHook}
            onAnnotationMouseDown={annotationDrawingHook.handleMouseDown}
            onAnnotationMouseMove={annotationDrawingHook.handleMouseMove}
            onAnnotationMouseUp={annotationDrawingHook.handleMouseUp}
            onAnnotationHandleMouseDown={handleAnnotationHandleMouseDown}
            annotationResizeContainerRef={annotationResize.containerRef}
            annotationResizeState={annotationResize}
            onBackgroundClick={handleBackgroundClick}
            annotationBounds={FULL_IMAGE_BOUNDS}
            annotationsFullContainer
          />
        </div>
      </div>

      {/* Text editing modal */}
      {imageDrawing.textInputState.isOpen && (
        <TextInputModal
          label={t('editorCore.editText', 'Edit text')}
          value={imageDrawing.textInputState.initialText ?? ''}
          onConfirm={(text) => imageDrawing.handleTextSubmit(text, imageDrawing.textInputState.initialFontSize ?? 5)}
          onCancel={imageDrawing.handleTextCancel}
        />
      )}
    </MediaEditDialog>
  );
}
