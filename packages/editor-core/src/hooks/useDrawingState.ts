import { useState, useCallback, useRef } from 'react';
import type { ShapeType, ShapeColor } from '@monta-vis/viewer-core';

const EMPTY_SET: ReadonlySet<string> = new Set();

/** Ref-synchronized copy of selectedDrawingIds for use in callbacks without stale closures */
function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

export interface UseDrawingStateProps {
  drawings: Record<string, { color?: string; type?: string; fontSize?: number | null; strokeWidth?: number | null }>;
  updateDrawing: (id: string, updates: Record<string, unknown>) => void;
  deleteDrawing: (id: string) => void;
}

/**
 * Shared drawing UI state used by both useImageDrawing and useVideoDrawing.
 *
 * Owns: drawingTool, drawingColor, selectedDrawingIds (Set), primarySelectedId
 * Derives: selectedDrawingId (= primarySelectedId), selectedDrawingColor, selectedDrawingFontSize
 */
export function useDrawingState({
  drawings,
  updateDrawing,
  deleteDrawing: deleteDrawingFromStore,
}: UseDrawingStateProps) {
  const [drawingTool, setDrawingTool] = useState<ShapeType | null>(null);
  const [drawingColor, setDrawingColor] = useState<ShapeColor>('black');
  const [drawingStrokeWidth, setDrawingStrokeWidth] = useState(2);
  const [selectedDrawingIds, setSelectedDrawingIds] = useState<ReadonlySet<string>>(new Set());
  const selectedDrawingIdsRef = useLatestRef(selectedDrawingIds);
  const [primarySelectedId, setPrimarySelectedId] = useState<string | null>(null);

  // Backward compat: selectedDrawingId = primarySelectedId
  const selectedDrawingId = primarySelectedId;

  const selectedDrawing = primarySelectedId ? drawings[primarySelectedId] : null;
  const selectedDrawingColor = selectedDrawing ? (selectedDrawing.color as ShapeColor) : null;
  const selectedDrawingFontSize =
    selectedDrawing?.type === 'text' ? (selectedDrawing.fontSize ?? 5) : null;
  const selectedDrawingStrokeWidth =
    selectedDrawing ? (selectedDrawing.strokeWidth ?? 2) : null;

  const handleDrawingSelect = useCallback((id: string) => {
    setSelectedDrawingIds(new Set([id]));
    setPrimarySelectedId(id);
  }, []);

  const handleDrawingMultiSelect = useCallback(
    (id: string, modifier: 'ctrl' | 'shift' | null, orderedIds?: string[]) => {
      if (modifier === null) {
        setSelectedDrawingIds(new Set([id]));
        setPrimarySelectedId(id);
        return;
      }

      if (modifier === 'ctrl') {
        setSelectedDrawingIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
          // If set is empty after toggle, clear primary
          if (next.size === 0) {
            setPrimarySelectedId(null);
          } else if (!next.has(id)) {
            // Removed: set primary to first remaining
            const remaining = Array.from(next);
            setPrimarySelectedId(remaining[0] ?? null);
          } else {
            setPrimarySelectedId(id);
          }
          return next;
        });
        return;
      }

      if (modifier === 'shift') {
        setPrimarySelectedId((currentPrimary) => {
          if (!currentPrimary || !orderedIds) {
            // No primary or no ordering info: behave as single click
            setSelectedDrawingIds(new Set([id]));
            return id;
          }

          const startIdx = orderedIds.indexOf(currentPrimary);
          const endIdx = orderedIds.indexOf(id);
          if (startIdx === -1 || endIdx === -1) {
            setSelectedDrawingIds(new Set([id]));
            return id;
          }

          const min = Math.min(startIdx, endIdx);
          const max = Math.max(startIdx, endIdx);
          const rangeIds = orderedIds.slice(min, max + 1);
          setSelectedDrawingIds(new Set(rangeIds));
          return currentPrimary; // Keep original primary
        });
      }
    },
    [],
  );

  const handleDrawingDelete = useCallback(
    (id: string) => {
      const currentIds = selectedDrawingIdsRef.current;
      if (currentIds.size > 1 && currentIds.has(id)) {
        currentIds.forEach((selectedId) => deleteDrawingFromStore(selectedId));
      } else {
        deleteDrawingFromStore(id);
      }
      setSelectedDrawingIds(EMPTY_SET);
      setPrimarySelectedId(null);
    },
    [deleteDrawingFromStore, selectedDrawingIdsRef],
  );

  const handleDrawingToolSelect = useCallback((tool: ShapeType | null) => {
    setDrawingTool(tool);
    setSelectedDrawingIds(EMPTY_SET);
    setPrimarySelectedId(null);
  }, []);

  const drawingsRef = useLatestRef(drawings);

  const handleDrawingColorSelect = useCallback(
    (color: ShapeColor) => {
      setDrawingColor(color);
      const currentIds = selectedDrawingIdsRef.current;
      const currentDrawings = drawingsRef.current;
      if (currentIds.size > 0) {
        currentIds.forEach((selectedId) => {
          if (currentDrawings[selectedId]) {
            updateDrawing(selectedId, { color });
          }
        });
      }
    },
    [updateDrawing, selectedDrawingIdsRef, drawingsRef],
  );

  const handleDrawingFontSizeSelect = useCallback(
    (fontSize: number) => {
      const currentIds = selectedDrawingIdsRef.current;
      const currentDrawings = drawingsRef.current;
      currentIds.forEach((selectedId) => {
        if (currentDrawings[selectedId]?.type === 'text') {
          updateDrawing(selectedId, { fontSize });
        }
      });
    },
    [updateDrawing, selectedDrawingIdsRef, drawingsRef],
  );

  const handleDrawingStrokeWidthSelect = useCallback(
    (strokeWidth: number) => {
      setDrawingStrokeWidth(strokeWidth);
      const currentIds = selectedDrawingIdsRef.current;
      const currentDrawings = drawingsRef.current;
      if (currentIds.size > 0) {
        currentIds.forEach((selectedId) => {
          if (currentDrawings[selectedId]) {
            updateDrawing(selectedId, { strokeWidth });
          }
        });
      }
    },
    [updateDrawing, selectedDrawingIdsRef, drawingsRef],
  );

  const deselectDrawing = useCallback(() => {
    setSelectedDrawingIds(EMPTY_SET);
    setPrimarySelectedId(null);
  }, []);

  const setSelectedDrawingId = useCallback((id: string | null) => {
    if (id) {
      setSelectedDrawingIds(new Set([id]));
      setPrimarySelectedId(id);
    } else {
      setSelectedDrawingIds(EMPTY_SET);
      setPrimarySelectedId(null);
    }
  }, []);

  return {
    drawingTool,
    drawingColor,
    drawingStrokeWidth,
    selectedDrawingId,
    selectedDrawingIds,
    selectedDrawingColor,
    selectedDrawingFontSize,
    selectedDrawingStrokeWidth,
    setSelectedDrawingId,
    handleDrawingSelect,
    handleDrawingMultiSelect,
    handleDrawingDelete,
    handleDrawingToolSelect,
    handleDrawingColorSelect,
    handleDrawingFontSizeSelect,
    handleDrawingStrokeWidthSelect,
    deselectDrawing,
    deselectAll: deselectDrawing,
  };
}
