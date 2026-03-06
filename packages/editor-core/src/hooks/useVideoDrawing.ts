import { useState, useCallback, useMemo, useRef } from 'react';
import { v4 as uuid } from 'uuid';
import type {
  DrawingRow,
  DrawnShape,
  Point,
} from '@monta-vis/viewer-core';
import type { DrawingCardData } from '../components/DrawingEditor';
import { useDrawingState } from './useDrawingState';

export interface UseVideoDrawingProps {
  substepId: string | null;
  versionId: string;
  /** All drawings in the store (keyed by id) */
  drawings: Record<string, DrawingRow>;
  addDrawing: (drawing: DrawingRow) => void;
  updateDrawing: (id: string, updates: Partial<DrawingRow>) => void;
  deleteDrawing: (id: string) => void;
  /** Current playhead position as 0-100% of video duration (caller computes) */
  currentPercent: number;
}

/**
 * useVideoDrawing — video-only drawing state management.
 *
 * Simplified version of Creator's useEditorDrawing for video drawings only.
 * No image annotations, no cross-substep navigation.
 *
 * Owns: drawingTool, drawingColor, selectedDrawingId, textInputState
 * Derives: visibleDrawings (filtered by currentPercent), drawingCards
 */
export function useVideoDrawing({
  substepId,
  versionId,
  drawings,
  addDrawing,
  updateDrawing,
  deleteDrawing: deleteDrawingFromStore,
  currentPercent,
}: UseVideoDrawingProps) {
  const shared = useDrawingState({ drawings, updateDrawing, deleteDrawing: deleteDrawingFromStore });

  const [textInputState, setTextInputState] = useState<{
    isOpen: boolean;
    position: Point | null;
    initialText?: string;
    initialFontSize?: number;
    editingDrawingId?: string | null;
  }>({ isOpen: false, position: null });

  // Filter to video drawings for the current substep
  const substepDrawings = useMemo(() => {
    if (!substepId) return [];
    return Object.values(drawings).filter(
      (d) => d.substepId === substepId && d.substepImageId === null,
    );
  }, [drawings, substepId]);

  // Drawings visible at current playhead percent
  const visibleDrawings = useMemo(() => {
    return substepDrawings.filter(
      (d) =>
        d.startFrame !== null &&
        d.endFrame !== null &&
        currentPercent >= d.startFrame &&
        currentPercent <= d.endFrame,
    );
  }, [substepDrawings, currentPercent]);

  const substepDrawingsLengthRef = useRef(0);
  substepDrawingsLengthRef.current = substepDrawings.length;

  // DrawingCardData for the DrawingEditor panel
  const drawingCards = useMemo<DrawingCardData[]>(
    () =>
      substepDrawings
        .sort((a, b) => (a.startFrame ?? 0) - (b.startFrame ?? 0))
        .map((d) => ({
          id: d.id,
          type: 'video' as const,
          shapeType: d.type,
          color: d.color,
          startFrame: d.startFrame ?? undefined,
          endFrame: d.endFrame ?? undefined,
        })),
    [substepDrawings],
  );

  // --- Handlers ---

  const handleShapeDrawn = useCallback(
    (shape: DrawnShape) => {
      if (!substepId) return;
      const startPercent = Math.min(currentPercent, 99);

      const newDrawing: DrawingRow = {
        id: uuid(),
        versionId,
        substepImageId: null,
        substepId,
        startFrame: startPercent,
        endFrame: 100,
        type: shape.type,
        color: shape.color,
        strokeWidth: shape.strokeWidth,
        x1: shape.x1,
        y1: shape.y1,
        x2: shape.x2 ?? null,
        y2: shape.y2 ?? null,
        x: shape.type === 'text' ? shape.x1 : null,
        y: shape.type === 'text' ? shape.y1 : null,
        content: shape.text ?? null,
        fontSize: shape.fontSize ?? null,
        points: null,
        order: substepDrawingsLengthRef.current,
      };
      addDrawing(newDrawing);
      shared.setSelectedDrawingId(newDrawing.id);
    },
    [substepId, versionId, currentPercent, addDrawing, shared.setSelectedDrawingId],
  );

  const handleDrawingFrameUpdate = useCallback(
    (id: string, startFrame: number, endFrame: number) =>
      updateDrawing(id, { startFrame, endFrame }),
    [updateDrawing],
  );

  const handleTextInput = useCallback((position: Point) => {
    setTextInputState({ isOpen: true, position });
  }, []);

  const drawingsRef = useRef(drawings);
  drawingsRef.current = drawings;

  /** Open text modal in edit mode for an existing text drawing */
  const handleTextEdit = useCallback(
    (drawingId: string) => {
      const drawing = drawingsRef.current[drawingId];
      if (!drawing || drawing.type !== 'text') return;
      setTextInputState({
        isOpen: true,
        position: { x: drawing.x ?? drawing.x1 ?? 0, y: drawing.y ?? drawing.y1 ?? 0 },
        initialText: drawing.content ?? '',
        initialFontSize: drawing.fontSize ?? 5,
        editingDrawingId: drawingId,
      });
    },
    [],
  );

  const handleTextSubmit = useCallback(
    (text: string, fontSize: number) => {
      if (!textInputState.position) return;
      if (textInputState.editingDrawingId) {
        updateDrawing(textInputState.editingDrawingId, { content: text, fontSize });
      } else {
        handleShapeDrawn({
          type: 'text',
          color: shared.drawingColor,
          strokeWidth: 2,
          x1: textInputState.position.x,
          y1: textInputState.position.y,
          x2: null,
          y2: null,
          text,
          fontSize,
        });
      }
      setTextInputState({ isOpen: false, position: null });
    },
    [textInputState, shared.drawingColor, handleShapeDrawn, updateDrawing],
  );

  const handleTextCancel = useCallback(() => {
    setTextInputState({ isOpen: false, position: null });
  }, []);

  return {
    // State
    drawingTool: shared.drawingTool,
    drawingColor: shared.drawingColor,
    selectedDrawingId: shared.selectedDrawingId,
    textInputState,

    // Derived data
    drawingCards,
    visibleDrawings,
    annotations: visibleDrawings, // alias for overlay compatibility
    selectedDrawingColor: shared.selectedDrawingColor,
    selectedDrawingFontSize: shared.selectedDrawingFontSize,

    // Handlers
    handleShapeDrawn,
    handleDrawingSelect: shared.handleDrawingSelect,
    handleDrawingDelete: shared.handleDrawingDelete,
    handleDrawingToolSelect: shared.handleDrawingToolSelect,
    handleDrawingColorSelect: shared.handleDrawingColorSelect,
    handleDrawingFontSizeSelect: shared.handleDrawingFontSizeSelect,
    handleDrawingFrameUpdate,
    handleTextInput,
    handleTextEdit,
    handleTextSubmit,
    handleTextCancel,
    deselectDrawing: shared.deselectDrawing,
  };
}
