import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ImageOverlay,
  TextInputModal,
  useAnnotationDrawing,
  useAnnotationResize,
  type AreaData,
  type Rectangle,
  type DrawingRow,
  type ImageOverlayMode,
} from '@monta-vis/viewer-core';
import { useImageDrawing } from '../hooks/useImageDrawing';
import { useDrawingDeleteKey } from '../hooks/useDrawingDeleteKey';
import { DrawingEditor } from './DrawingEditor';
import { MediaEditDialog } from './MediaEditDialog';

const FULL_IMAGE_BOUNDS: Rectangle = { x: 0, y: 0, width: 100, height: 100 };

export interface ImageEditDialogProps {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
  /** Area/viewport (the "crop rectangle") */
  area?: AreaData | null;
  onAreaUpdate?: (areaId: string, rect: Rectangle) => void;
  /** Drawing data + callbacks */
  substepImageId: string | null;
  versionId: string;
  drawings: Record<string, DrawingRow>;
  onAddDrawing: (drawing: DrawingRow) => void;
  onUpdateDrawing: (id: string, updates: Partial<DrawingRow>) => void;
  onDeleteDrawing: (id: string) => void;
  /** Area bounds for annotation constraint (in 0-100% video-local space) */
  areaBounds?: Rectangle | null;
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
 * │   │  AreaHighlight   │        │ ■ ■ ■ (cards)    │
 * │   │  + Annotations   │        │                  │
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
  area,
  onAreaUpdate,
  substepImageId,
  versionId,
  drawings,
  onAddDrawing,
  onUpdateDrawing,
  onDeleteDrawing,
  areaBounds,
}: ImageEditDialogProps) {
  const { t } = useTranslation();

  const effectiveBounds = areaBounds ?? FULL_IMAGE_BOUNDS;

  // Drawing state management
  const imageDrawing = useImageDrawing({
    substepImageId,
    versionId,
    drawings,
    addDrawing: onAddDrawing,
    updateDrawing: onUpdateDrawing,
    deleteDrawing: onDeleteDrawing,
    areaBounds: effectiveBounds,
  });

  // Annotation drawing hook (actual mouse interaction)
  const annotationDrawingHook = useAnnotationDrawing({
    tool: imageDrawing.drawingTool,
    color: imageDrawing.drawingColor,
    onShapeCreate: imageDrawing.handleShapeDrawn,
    onTextInput: imageDrawing.handleTextInput,
    bounds: effectiveBounds,
  });

  // Annotation resize hook
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
    bounds: effectiveBounds,
  });

  // Delete key handler for selected annotation
  useDrawingDeleteKey(open, imageDrawing.selectedDrawingId, imageDrawing.handleDrawingDelete);

  // Mode logic: tool selected → annotation mode, else none (area resizable)
  const overlayMode: ImageOverlayMode = imageDrawing.drawingTool ? 'annotation' : 'none';

  // Areas to display
  const areas: AreaData[] = useMemo(() => {
    if (!area) return [];
    return [area];
  }, [area]);

  // Handle background click (deselect annotation)
  const handleBackgroundClick = useCallback(() => {
    imageDrawing.deselectDrawing();
  }, [imageDrawing.deselectDrawing]);

  // Handle annotation click
  const handleAnnotationClick = useCallback(
    (id: string | null) => {
      if (id) {
        imageDrawing.handleDrawingSelect(id);
      } else {
        imageDrawing.deselectDrawing();
      }
    },
    [imageDrawing.handleDrawingSelect, imageDrawing.deselectDrawing]
  );

  // Handle area update
  const handleAreaUpdate = useCallback(
    (areaId: string, rect: Rectangle) => {
      onAreaUpdate?.(areaId, rect);
    },
    [onAreaUpdate]
  );

  // Handle annotation resize start
  const handleAnnotationHandleMouseDown = useCallback(
    (annotationId: string, handle: string, e: React.MouseEvent) => {
      const annotation = drawings[annotationId];
      if (!annotation) return;
      annotationResize.startResize(annotation, handle as Parameters<typeof annotationResize.startResize>[1], e);
    },
    [drawings, annotationResize]
  );

  return (
    <MediaEditDialog
      open={open}
      onClose={onClose}
      sidebar={
        <DrawingEditor
          activeTool={imageDrawing.drawingTool}
          activeColor={imageDrawing.drawingColor}
          selectedDrawingColor={imageDrawing.selectedDrawingColor}
          onToolSelect={imageDrawing.handleDrawingToolSelect}
          onColorSelect={imageDrawing.handleDrawingColorSelect}
          drawings={imageDrawing.drawingCards}
          selectedDrawingId={imageDrawing.selectedDrawingId}
          onDrawingSelect={imageDrawing.handleDrawingSelect}
          selectedDrawingFontSize={imageDrawing.selectedDrawingFontSize}
          onFontSizeSelect={imageDrawing.handleDrawingFontSizeSelect}
          drawingMode="image"
          hasImageArea
          showModeToggle={false}
          onDrawingModeChange={() => {}}
          onClose={onClose}
        />
      }
    >
      {/* Image overlay area */}
      <div className="p-4 h-full">
        <ImageOverlay
          imageSrc={imageSrc}
          showBackground={false}
          mode={overlayMode}
          areas={areas}
          selectedAreaId={area?.id}
          onAreaUpdate={handleAreaUpdate}
          annotations={imageDrawing.annotations}
          selectedAnnotationId={imageDrawing.selectedDrawingId}
          onAnnotationClick={handleAnnotationClick}
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
          annotationBounds={effectiveBounds}
        />
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
