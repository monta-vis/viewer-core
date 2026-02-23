import { useRef, useCallback } from 'react';

interface Position { x: number; y: number }

interface UseLongPressOptions {
  onLongPress: (pos: Position) => void;
  onMove?: (pos: Position) => void;
  onRelease?: () => void;
  /** Delay in ms before long press fires (default 350) */
  delay?: number;
  /** Move tolerance in px before cancelling (default 8) */
  tolerance?: number;
}

/**
 * Detects long press (tap-and-hold) with scroll tolerance.
 * Returns pointer event handlers to spread onto a DOM element.
 *
 * Uses document-level listeners instead of setPointerCapture so that
 * native scrolling is not blocked during the long-press detection window.
 */
export function useLongPress({
  onLongPress,
  onMove,
  onRelease,
  delay = 350,
  tolerance = 8,
}: UseLongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = useRef<Position | null>(null);
  const activeRef = useRef(false);
  /** True if a long press was detected in the current gesture (used for click suppression) */
  const didLongPressRef = useRef(false);
  const elementRef = useRef<HTMLElement | null>(null);
  const docListenersRef = useRef<{ move: (e: PointerEvent) => void; up: (e: PointerEvent) => void } | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    // Also remove document listeners so unmount during active press doesn't leak
    if (docListenersRef.current) {
      document.removeEventListener('pointermove', docListenersRef.current.move);
      document.removeEventListener('pointerup', docListenersRef.current.up);
      document.removeEventListener('pointercancel', docListenersRef.current.up);
      docListenersRef.current = null;
    }
  }, []);

  const removeDocListeners = useCallback(() => {
    if (docListenersRef.current) {
      document.removeEventListener('pointermove', docListenersRef.current.move);
      document.removeEventListener('pointerup', docListenersRef.current.up);
      document.removeEventListener('pointercancel', docListenersRef.current.up);
      docListenersRef.current = null;
    }
  }, []);

  const getRelativePosFromClient = useCallback((clientX: number, clientY: number): Position => {
    if (!elementRef.current) return { x: clientX, y: clientY };
    const rect = elementRef.current.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const release = useCallback(() => {
    clear();
    removeDocListeners();
    if (activeRef.current) {
      onRelease?.();
    }
    activeRef.current = false;
    startPosRef.current = null;
  }, [clear, removeDocListeners, onRelease]);

  const onPointerDown = useCallback((e: PointerEvent | React.PointerEvent) => {
    didLongPressRef.current = false;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    startPosRef.current = pos;
    activeRef.current = false;
    elementRef.current = e.currentTarget as HTMLElement;

    timerRef.current = setTimeout(() => {
      activeRef.current = true;
      didLongPressRef.current = true;

      // Add document-level listeners to track pointer even outside the element.
      // This replaces setPointerCapture which blocks native scrolling.
      const moveHandler = (ev: PointerEvent) => {
        const p = getRelativePosFromClient(ev.clientX, ev.clientY);
        onMove?.(p);
      };
      const upHandler = () => {
        release();
      };
      docListenersRef.current = { move: moveHandler, up: upHandler };
      document.addEventListener('pointermove', moveHandler);
      document.addEventListener('pointerup', upHandler);
      document.addEventListener('pointercancel', upHandler);

      onLongPress(pos);
    }, delay);
  }, [onLongPress, onMove, delay, getRelativePosFromClient, release]);

  const onPointerMove = useCallback((e: PointerEvent | React.PointerEvent) => {
    // If long press is active, document listeners handle movement — skip here
    if (activeRef.current) return;

    // Before activation: check if moved beyond tolerance → cancel
    if (startPosRef.current && timerRef.current) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const dx = pos.x - startPosRef.current.x;
      const dy = pos.y - startPosRef.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > tolerance) {
        clear();
      }
    }
  }, [tolerance, clear]);

  const onPointerUp = useCallback(() => {
    release();
  }, [release]);

  return { onPointerDown, onPointerMove, onPointerUp, didLongPressRef };
}
