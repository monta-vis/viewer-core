import { useState, useCallback, useRef } from 'react';
import { useEditorStore } from '../store';
import type { InstructionData } from '@monta-vis/viewer-core';

const MAX_HISTORY = 20;

export interface UseSessionHistoryReturn {
  canUndo: boolean;
  canRedo: boolean;
  /** Capture current store state as a snapshot (call after each edit action) */
  captureSnapshot: () => void;
  /** Undo to the previous snapshot */
  undo: () => void;
  /** Redo to the next snapshot */
  redo: () => void;
  /** Clear all history (call when popover closes) */
  reset: () => void;
}

/**
 * Scoped undo/redo for a popover session.
 *
 * On init, captures the current store data as the base snapshot.
 * Each call to `captureSnapshot()` saves the *previous* state to the past stack
 * before the current edit was applied.
 *
 * Unlike the global historyStore, this uses local React state so it's
 * automatically cleaned up when the component unmounts.
 */
export function useSessionHistory(): UseSessionHistoryReturn {
  const [past, setPast] = useState<InstructionData[]>([]);
  const [future, setFuture] = useState<InstructionData[]>([]);

  // Mirror refs so we can read current values synchronously outside updaters
  const pastRef = useRef(past);
  pastRef.current = past;
  const futureRef = useRef(future);
  futureRef.current = future;

  // Capture the store data at the moment before the most recent action
  const lastSnapshotRef = useRef<InstructionData | null>(
    useEditorStore.getState().data ?? null,
  );

  const captureSnapshot = useCallback(() => {
    const prev = lastSnapshotRef.current;
    if (!prev) return;

    setPast((p) => [...p.slice(-(MAX_HISTORY - 1)), prev]);
    setFuture([]); // New action clears redo stack

    // Update ref to current state (post-action)
    lastSnapshotRef.current = useEditorStore.getState().data ?? null;
  }, []);

  const undo = useCallback(() => {
    const prevPast = pastRef.current;
    if (prevPast.length === 0) return;

    const current = useEditorStore.getState().data;
    const target = prevPast[prevPast.length - 1];

    // Update state (no side effects inside updaters)
    setPast(prevPast.slice(0, -1));
    if (current) {
      setFuture((f) => [current, ...f]);
    }

    // Apply restore outside updater
    useEditorStore.getState().restoreData(target);
    lastSnapshotRef.current = target;
  }, []);

  const redo = useCallback(() => {
    const prevFuture = futureRef.current;
    if (prevFuture.length === 0) return;

    const current = useEditorStore.getState().data;
    const target = prevFuture[0];

    // Update state (no side effects inside updaters)
    setFuture(prevFuture.slice(1));
    if (current) {
      setPast((p) => [...p, current]);
    }

    // Apply restore outside updater
    useEditorStore.getState().restoreData(target);
    lastSnapshotRef.current = target;
  }, []);

  const reset = useCallback(() => {
    setPast([]);
    setFuture([]);
    lastSnapshotRef.current = useEditorStore.getState().data ?? null;
  }, []);

  return {
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    captureSnapshot,
    undo,
    redo,
    reset,
  };
}
