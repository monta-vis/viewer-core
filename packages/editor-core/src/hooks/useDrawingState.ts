import { useState, useCallback } from 'react';
import type { ShapeType, ShapeColor } from '@monta-vis/viewer-core';

export interface UseDrawingStateProps {
  drawings: Record<string, { color?: string; type?: string; fontSize?: number | null }>;
  updateDrawing: (id: string, updates: Record<string, unknown>) => void;
  deleteDrawing: (id: string) => void;
}

/**
 * Shared drawing UI state used by both useImageDrawing and useVideoDrawing.
 *
 * Owns: drawingTool, drawingColor, selectedDrawingId
 * Derives: selectedDrawingColor, selectedDrawingFontSize
 */
export function useDrawingState({
  drawings,
  updateDrawing,
  deleteDrawing: deleteDrawingFromStore,
}: UseDrawingStateProps) {
  const [drawingTool, setDrawingTool] = useState<ShapeType | null>(null);
  const [drawingColor, setDrawingColor] = useState<ShapeColor>('black');
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);

  const selectedDrawing = selectedDrawingId ? drawings[selectedDrawingId] : null;
  const selectedDrawingColor = selectedDrawing ? (selectedDrawing.color as ShapeColor) : null;
  const selectedDrawingFontSize =
    selectedDrawing?.type === 'text' ? (selectedDrawing.fontSize ?? 5) : null;

  const handleDrawingSelect = useCallback((id: string) => {
    setSelectedDrawingId(id);
  }, []);

  const handleDrawingDelete = useCallback(
    (id: string) => {
      deleteDrawingFromStore(id);
      setSelectedDrawingId((prev) => (prev === id ? null : prev));
    },
    [deleteDrawingFromStore],
  );

  const handleDrawingToolSelect = useCallback((tool: ShapeType | null) => {
    setDrawingTool(tool);
    setSelectedDrawingId(null);
  }, []);

  const handleDrawingColorSelect = useCallback(
    (color: ShapeColor) => {
      setDrawingColor(color);
      if (selectedDrawingId && drawings[selectedDrawingId]) {
        updateDrawing(selectedDrawingId, { color });
      }
    },
    [selectedDrawingId, drawings, updateDrawing],
  );

  const handleDrawingFontSizeSelect = useCallback(
    (fontSize: number) => {
      if (selectedDrawingId && drawings[selectedDrawingId]?.type === 'text') {
        updateDrawing(selectedDrawingId, { fontSize });
      }
    },
    [selectedDrawingId, drawings, updateDrawing],
  );

  const deselectDrawing = useCallback(() => {
    setSelectedDrawingId(null);
  }, []);

  return {
    drawingTool,
    drawingColor,
    selectedDrawingId,
    selectedDrawingColor,
    selectedDrawingFontSize,
    setSelectedDrawingId,
    handleDrawingSelect,
    handleDrawingDelete,
    handleDrawingToolSelect,
    handleDrawingColorSelect,
    handleDrawingFontSizeSelect,
    deselectDrawing,
  };
}
