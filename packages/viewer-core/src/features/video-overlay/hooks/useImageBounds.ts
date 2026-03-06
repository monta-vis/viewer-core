import { useState, useEffect, useCallback, useRef, type RefObject } from 'react';
import { computeVideoBounds, type VideoBounds } from './useVideoBounds';

/**
 * Hook to calculate image bounds within a container.
 *
 * Like `useVideoBounds` but for `<img>` elements — no `useVideo()` dependency.
 * Reuses `computeVideoBounds` pure function with image natural dimensions.
 *
 * The image uses object-fit: contain, so it's centered with letterboxing.
 * This hook calculates the actual image position and size within the container.
 */
export function useImageBounds(
  containerRef: RefObject<HTMLElement | null>,
  imageRef: RefObject<HTMLImageElement | null>,
): VideoBounds | null {
  const [bounds, setBounds] = useState<VideoBounds | null>(null);
  const rafRef = useRef<number | null>(null);

  const calculateBounds = useCallback(() => {
    const container = containerRef.current;
    const image = imageRef.current;
    if (!container || !image) return;

    const result = computeVideoBounds(container, {
      videoWidth: image.naturalWidth,
      videoHeight: image.naturalHeight,
    });
    if (result) setBounds(result);
  }, [containerRef, imageRef]);

  useEffect(() => {
    const container = containerRef.current;
    const image = imageRef.current;
    if (!container || !image) {
      setBounds(null);
      return;
    }

    // Calculate immediately (image may already be loaded)
    calculateBounds();

    // Listen for image load (handles async loading)
    const handleLoad = () => calculateBounds();
    image.addEventListener('load', handleLoad);

    // Observe container resize
    const resizeObserver = new ResizeObserver(() => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(calculateBounds);
    });
    resizeObserver.observe(container);

    return () => {
      image.removeEventListener('load', handleLoad);
      resizeObserver.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [containerRef, imageRef, calculateBounds]);

  return bounds;
}
