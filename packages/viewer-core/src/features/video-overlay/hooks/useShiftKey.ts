import { useSyncExternalStore } from 'react';

/**
 * Shared singleton that tracks the Shift key state with a single set of
 * global event listeners, no matter how many components call useShiftKey().
 */
let shiftPressed = false;
const listeners = new Set<() => void>();

function subscribe(cb: () => void): () => void {
  listeners.add(cb);

  // Register global listeners lazily on first subscriber
  if (listeners.size === 1) {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
  }

  return () => {
    listeners.delete(cb);
    // Tear down global listeners when no subscribers remain
    if (listeners.size === 0) {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    }
  };
}

function getSnapshot(): boolean {
  return shiftPressed;
}

function notify() {
  for (const cb of listeners) cb();
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Shift' && !shiftPressed) {
    shiftPressed = true;
    notify();
  }
}

function handleKeyUp(e: KeyboardEvent) {
  if (e.key === 'Shift' && shiftPressed) {
    shiftPressed = false;
    notify();
  }
}

function handleBlur() {
  if (shiftPressed) {
    shiftPressed = false;
    notify();
  }
}

/**
 * Hook to track whether the Shift key is currently pressed.
 * Uses a shared singleton — only one set of global listeners regardless of
 * how many components consume this hook.
 */
export function useShiftKey(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot);
}
