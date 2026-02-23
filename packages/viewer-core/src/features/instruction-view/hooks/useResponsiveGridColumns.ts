import { useState, useEffect, type RefObject } from 'react';

/** Card sizing constants for the substep grid (in rem for accessibility) */
export const CARD_MIN_WIDTH_REM = 18;
export const CARD_MAX_WIDTH_REM = 60;
export const CARD_GAP_REM = 0.75;

/**
 * Hook to track responsive grid column count based on container width.
 * Uses ResizeObserver for accurate container-based calculation.
 * Cards have minimum width of 18rem with 2rem gap.
 *
 * @param containerRef - Ref to the container element to observe
 * @returns Number of columns (1-2) based on container width
 */
export function useResponsiveGridColumns(
  containerRef: RefObject<HTMLElement | null>
): number {
  const [columns, setColumns] = useState(1);

  useEffect(() => {
    // Get root font size for rem calculation
    const rootFontSize =
      parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const minWidthPx = CARD_MIN_WIDTH_REM * rootFontSize;
    const gapPx = CARD_GAP_REM * rootFontSize;

    const updateColumns = () => {
      const container = containerRef.current;
      if (!container) {
        // Fallback to window-based calculation
        const w = window.innerWidth;
        setColumns(w >= 640 ? 2 : 1);
        return;
      }

      const containerWidth = container.clientWidth;

      // Calculate max columns that fit with minimum card width
      // Formula: (availableWidth + gap) / (minWidth + gap)
      const maxCols = Math.floor(
        (containerWidth + gapPx) / (minWidthPx + gapPx)
      );
      setColumns(Math.max(1, Math.min(maxCols, 2))); // Cap at 2 columns max
    };

    updateColumns();

    // Use ResizeObserver for container-based updates
    const container = containerRef.current;
    if (container) {
      const observer = new ResizeObserver(updateColumns);
      observer.observe(container);
      return () => observer.disconnect();
    } else {
      // Fallback to window resize
      window.addEventListener('resize', updateColumns);
      return () => window.removeEventListener('resize', updateColumns);
    }
  }, [containerRef]);

  return columns;
}
