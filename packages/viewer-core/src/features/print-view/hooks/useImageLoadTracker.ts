import { useCallback, useEffect, useRef } from 'react';

interface UseImageLoadTrackerOptions {
  expectedCount: number;
  onComplete: () => void;
  /** Safety timeout in ms — fires completion even if not all images loaded. Default: 10000 */
  timeoutMs?: number;
}

/**
 * Tracks image load/error events and fires `onComplete` when all images
 * have resolved (or on safety timeout). Used by PrintView to know when
 * all pre-rendered images are ready for PDF capture.
 */
export function useImageLoadTracker({
  expectedCount,
  onComplete,
  timeoutMs = 10_000,
}: UseImageLoadTrackerOptions) {
  const loadedRef = useRef(0);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const tryComplete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onCompleteRef.current();
  }, []);

  const increment = useCallback(() => {
    loadedRef.current += 1;
    if (loadedRef.current >= expectedCount) {
      tryComplete();
    }
  }, [expectedCount, tryComplete]);

  // Immediate completion when nothing to track
  useEffect(() => {
    if (expectedCount <= 0) {
      tryComplete();
    }
  }, [expectedCount, tryComplete]);

  // Safety timeout
  useEffect(() => {
    if (expectedCount <= 0) return;
    const timer = setTimeout(tryComplete, timeoutMs);
    return () => clearTimeout(timer);
  }, [expectedCount, timeoutMs, tryComplete]);

  return {
    onImageLoad: increment,
    onImageError: increment,
  };
}
