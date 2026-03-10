import { useState, useCallback, useMemo, useRef } from 'react';
import { v4 as uuid } from 'uuid';
import type {
  DrawingRow,
  DrawnShape,
  Point,
  Rectangle,
} from '@monta-vis/viewer-core';
import type { DrawingCardData } from '../components/DrawingEditor';
import { useDrawingState } from './useDrawingState';

export interface UseImageDrawingProps {
  videoFrameAreaId: string | null;
  versionId: string;
  /** All drawings in the store (keyed by id) */
  drawings: Record<string, DrawingRow>;
  addDrawing: (drawing: DrawingRow) => void;
  updateDrawing: (id: string, updates: Partial<DrawingRow>) => void;
  deleteDrawing: (id: string) => void;
  /** Area bounds for constraining annotations (normalized 0-1, from VideoFrameArea) */
  areaBounds: Rectangle | null;
}

/**
 * useImageDrawing — image-only drawing state management.
 *
 * Standardized version of creator's useEditorDrawing for image mode only.
 * No video drawings, no frame ranges, no timeline.
 *
 * Owns: drawingTool, drawingColor, selectedDrawingId, textInputState
 * Derives: annotations (filtered by videoFrameAreaId), drawingCards, isDrawingMode
 */
export function useImageDrawing({
  videoFrameAreaId,
  versionId,
  drawings,
  addDrawing,
  updateDrawing,
  deleteDrawing,
  areaBounds,
}: UseImageDrawingProps) {
  const shared = useDrawingState({ drawings, updateDrawing, deleteDrawing });

  const [textInputState, setTextInputState] = useState<{
    isOpen: boolean;
    initialText?: string;
    initialFontSize?: number;
    editingDrawingId?: string | null;
  }>({ isOpen: false });

  // Filter drawings for current substep image
  const annotations = useMemo(() => {
    if (!videoFrameAreaId) return [];
    return Object.values(drawings).filter(
      (d) => d.videoFrameAreaId === videoFrameAreaId
    );
  }, [drawings, videoFrameAreaId]);

  const annotationsLengthRef = useRef(0);
  annotationsLengthRef.current = annotations.length;

  const isDrawingMode = shared.drawingTool !== null;

  // Minicard data for DrawingEditor
  const drawingCards: DrawingCardData[] = useMemo(
    () => annotations.map((d) => ({ id: d.id, type: 'image' as const, shapeType: d.type, color: d.color as string })),
    [annotations]
  );

  // --- Handlers ---

  const handleShapeDrawn = useCallback(
    (shape: DrawnShape) => {
      if (!videoFrameAreaId) return;
      const newDrawing: DrawingRow = {
        id: uuid(),
        versionId,
        videoFrameAreaId,
        substepId: null,
        startFrame: null,
        endFrame: null,
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
        points: shape.points ?? null,
        order: annotationsLengthRef.current,
      };
      addDrawing(newDrawing);
      shared.setSelectedDrawingId(newDrawing.id);
    },
    [videoFrameAreaId, versionId, addDrawing, shared.setSelectedDrawingId]
  );

  const drawingsRef = useRef(drawings);
  drawingsRef.current = drawings;

  const areaBoundsRef = useRef(areaBounds);
  areaBoundsRef.current = areaBounds;

  const handleDrawingDoubleClick = useCallback((id: string) => {
    const drawing = drawingsRef.current[id];
    if (!drawing || drawing.type !== 'text') return;

    setTextInputState({
      isOpen: true,
      initialText: drawing.content ?? '',
      initialFontSize: drawing.fontSize ?? 5,
      editingDrawingId: id,
    });
  }, []);

  const handleTextInput = useCallback((position: Point) => {
    if (!videoFrameAreaId) return;

    // Transform from container space (0-100%) to local space (0-1)
    const bounds = areaBoundsRef.current;
    const pos = bounds
      ? {
          x: Math.max(0, Math.min(1, (position.x - bounds.x) / bounds.width)),
          y: Math.max(0, Math.min(1, (position.y - bounds.y) / bounds.height)),
        }
      : position;

    const newId = uuid();
    const newDrawing: DrawingRow = {
      id: newId,
      versionId,
      videoFrameAreaId,
      substepId: null,
      startFrame: null,
      endFrame: null,
      type: 'text',
      color: shared.drawingColor,
      strokeWidth: 2,
      x1: pos.x,
      y1: pos.y,
      x2: null,
      y2: null,
      x: pos.x,
      y: pos.y,
      content: '',
      fontSize: 5,
      points: null,
      order: annotationsLengthRef.current,
    };
    addDrawing(newDrawing);
    shared.setSelectedDrawingId(newId);

    // Open edit modal immediately so user can type
    setTextInputState({
      isOpen: true,
      initialText: '',
      initialFontSize: 5,
      editingDrawingId: newId,
    });
  }, [videoFrameAreaId, versionId, shared.drawingColor, addDrawing, shared.setSelectedDrawingId]);

  const handleTextSubmit = useCallback(
    (text: string, fontSize: number) => {
      if (textInputState.editingDrawingId) {
        updateDrawing(textInputState.editingDrawingId, { content: text, fontSize });
      }
      setTextInputState({ isOpen: false });
    },
    [textInputState.editingDrawingId, updateDrawing]
  );

  const handleTextCancel = useCallback(() => {
    setTextInputState({ isOpen: false });
  }, []);

  const deselectDrawing = useCallback(() => {
    shared.deselectDrawing();
    setTextInputState({ isOpen: false });
  }, [shared.deselectDrawing]);

  return {
    // State
    drawingTool: shared.drawingTool,
    drawingColor: shared.drawingColor,
    selectedDrawingId: shared.selectedDrawingId,
    selectedDrawingIds: shared.selectedDrawingIds,
    textInputState,
    isDrawingMode,

    // Derived data
    annotations,
    annotationBounds: areaBounds,
    drawingCards,
    selectedDrawingColor: shared.selectedDrawingColor,
    selectedDrawingFontSize: shared.selectedDrawingFontSize,

    // Handlers
    handleShapeDrawn,
    handleDrawingSelect: shared.handleDrawingSelect,
    handleDrawingMultiSelect: shared.handleDrawingMultiSelect,
    handleDrawingDoubleClick,
    handleDrawingDelete: shared.handleDrawingDelete,
    handleDrawingToolSelect: shared.handleDrawingToolSelect,
    handleDrawingColorSelect: shared.handleDrawingColorSelect,
    handleDrawingFontSizeSelect: shared.handleDrawingFontSizeSelect,
    handleTextInput,
    handleTextSubmit,
    handleTextCancel,
    deselectDrawing,
    deselectAll: shared.deselectAll,
  };
}
