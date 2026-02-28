import { useEffect, useRef } from 'react';
import { useEditorStore } from '../store';
import type { PersistenceAdapter, ProjectChanges } from '../persistence';

const DEFAULT_DEBOUNCE_MS = 1000;

export interface UseAutoSaveOptions {
  adapter: PersistenceAdapter;
  projectId: string;
  enabled: boolean;
  debounceMs?: number;
}

/**
 * Auto-save hook that watches the editor store for changes and
 * debounces saves through the persistence adapter.
 *
 * On unmount, flushes any pending save immediately.
 */
export function useAutoSave({
  adapter,
  projectId,
  enabled,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: UseAutoSaveOptions): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);

  // Keep latest values in refs so the subscription callback doesn't go stale
  const adapterRef = useRef(adapter);
  const projectIdRef = useRef(projectId);
  const enabledRef = useRef(enabled);
  adapterRef.current = adapter;
  projectIdRef.current = projectId;
  enabledRef.current = enabled;

  const performSave = useRef(async () => {
    if (isSavingRef.current) return;

    const store = useEditorStore.getState();
    if (!store.hasChanges()) return;

    isSavingRef.current = true;
    try {
      const changes: ProjectChanges = store.getChangedData();
      const result = await adapterRef.current.saveChanges(
        projectIdRef.current,
        changes,
      );
      if (result.success) {
        useEditorStore.getState().clearChanges();
      } else {
        console.warn('[useAutoSave] Save failed:', result.error);
      }
    } finally {
      isSavingRef.current = false;
    }
  }).current;

  useEffect(() => {
    if (!enabled) return;

    // Subscribe to store data changes
    const unsub = useEditorStore.subscribe(
      (state, prevState) => {
        if (state.data === prevState.data) return;
        if (!enabledRef.current) return;

        // Clear existing timer and start a new debounce
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          void performSave();
        }, debounceMs);
      },
    );

    return () => {
      unsub();

      // Flush pending save on unmount
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        void performSave();
      }
    };
  }, [enabled, debounceMs, performSave]);
}
