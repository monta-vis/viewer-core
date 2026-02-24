import { useRef, useCallback } from 'react';

interface UseDoubleTapOptions {
  onDoubleTap: (side: 'left' | 'right') => void;
  /** Max ms between taps to count as double-tap (default 300) */
  threshold?: number;
}

/**
 * Detects double-tap on left/right half of an element.
 *
 * Single tap is NOT delayed — it fires instantly via the existing onClick.
 * This hook only detects the *second* tap within the threshold window
 * and calls `onDoubleTap` with `'left'` or `'right'` based on tap position.
 */
export function useDoubleTap({ onDoubleTap, threshold = 300 }: UseDoubleTapOptions) {
  const lastTapTimeRef = useRef(0);

  const handleTap = useCallback((e: React.MouseEvent) => {
    const now = Date.now();
    const elapsed = now - lastTapTimeRef.current;

    if (elapsed <= threshold && lastTapTimeRef.current > 0) {
      // Double-tap detected — determine side
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const midpoint = rect.left + rect.width / 2;
      const side: 'left' | 'right' = e.clientX < midpoint ? 'left' : 'right';
      onDoubleTap(side);
      // Reset so third tap starts fresh
      lastTapTimeRef.current = 0;
    } else {
      // First tap — just record time
      lastTapTimeRef.current = now;
    }
  }, [onDoubleTap, threshold]);

  return { handleTap };
}
