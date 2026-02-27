import { create } from 'zustand';
import { useEffect, useRef } from 'react';
import { useEditorStore } from '@monta-vis/editor-core';
import type { InstructionData } from '@monta-vis/viewer-core';

/**
 * History Store for Undo/Redo functionality
 *
 * Uses snapshot-based approach:
 * - Each action creates a snapshot of the full data state
 * - Undo restores previous snapshot
 * - Redo restores next snapshot
 *
 * Integration:
 * - Use useHistorySync() hook in ViewPage to auto-capture changes
 */

const MAX_HISTORY_SIZE = 50;
const DEBOUNCE_MS = 300;

interface HistoryState {
  past: InstructionData[];
  future: InstructionData[];
  isUndoRedoAction: boolean;
}

interface HistoryActions {
  pushSnapshot: (data: InstructionData) => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  undo: () => void;
  redo: () => void;
  clear: () => void;
}

const initialState: HistoryState = {
  past: [],
  future: [],
  isUndoRedoAction: false,
};

export const useHistoryStore = create<HistoryState & HistoryActions>((set, get) => ({
  ...initialState,

  pushSnapshot: (data) => {
    const { isUndoRedoAction } = get();

    if (isUndoRedoAction) {
      set({ isUndoRedoAction: false });
      return;
    }

    set((state) => {
      const newPast = state.past.length >= MAX_HISTORY_SIZE
        ? [...state.past.slice(-(MAX_HISTORY_SIZE - 1)), data]
        : [...state.past, data];

      return {
        past: newPast,
        future: [],
      };
    });
  },

  canUndo: () => get().past.length > 0,

  canRedo: () => get().future.length > 0,

  undo: () => {
    const { past, future } = get();
    if (past.length === 0) return;

    const simpleStore = useEditorStore.getState();
    const currentData = simpleStore.data;
    if (!currentData) return;

    const previousData = past[past.length - 1];
    const newPast = past.slice(0, -1);

    set({
      past: newPast,
      future: [currentData, ...future],
      isUndoRedoAction: true,
    });

    simpleStore.restoreData(previousData);
  },

  redo: () => {
    const { past, future } = get();
    if (future.length === 0) return;

    const simpleStore = useEditorStore.getState();
    const currentData = simpleStore.data;
    if (!currentData) return;

    const nextData = future[0];
    const newFuture = future.slice(1);

    set({
      past: [...past, currentData],
      future: newFuture,
      isUndoRedoAction: true,
    });

    simpleStore.restoreData(nextData);
  },

  clear: () => {
    set(initialState);
  },
}));

/**
 * Hook to sync history with simpleStore changes.
 * Call this in ViewPage to enable undo/redo functionality.
 *
 * Debounces snapshot pushes so rapid edits group into one history entry.
 */
export function useHistorySync() {
  const data = useEditorStore((state) => state.data);
  const previousDataRef = useRef<InstructionData | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!data) return;

    const historyStore = useHistoryStore.getState();

    if (historyStore.isUndoRedoAction) {
      useHistoryStore.setState({ isUndoRedoAction: false });
      previousDataRef.current = data;
      return;
    }

    if (previousDataRef.current && previousDataRef.current !== data) {
      const snapshotData = previousDataRef.current;

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        historyStore.pushSnapshot(snapshotData);
        debounceRef.current = null;
      }, DEBOUNCE_MS);
    }

    previousDataRef.current = data;
  }, [data]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      useHistoryStore.getState().clear();
    };
  }, []);
}
