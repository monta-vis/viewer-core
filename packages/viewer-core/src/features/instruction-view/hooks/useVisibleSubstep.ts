import { useState, useEffect, type RefObject } from 'react';

/**
 * Tracks which substep card is currently at the top of the scroll container
 * using IntersectionObserver.
 *
 * Returns the ID of the topmost visible substep, or null if none are visible.
 */
export function useVisibleSubstep(
  substepRefs: RefObject<Map<string, HTMLElement> | null>,
  scrollContainer: RefObject<HTMLElement | null>,
  substepIds: string[],
): string | null {
  const [visibleSubstepId, setVisibleSubstepId] = useState<string | null>(null);

  useEffect(() => {
    const container = scrollContainer.current;
    const refs = substepRefs.current;
    if (!container || !refs || refs.size === 0 || substepIds.length === 0) return;

    // Track which substep elements are currently intersecting
    const visibleSet = new Set<string>();
    // Reverse lookup: element → substepId (O(1) per entry)
    const elementToSubstepId = new WeakMap<Element, string>();
    for (const [id, el] of refs.entries()) {
      elementToSubstepId.set(el, id);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const entrySubstepId = elementToSubstepId.get(entry.target) ?? null;
          if (!entrySubstepId) continue;

          if (entry.isIntersecting) {
            visibleSet.add(entrySubstepId);
          } else {
            visibleSet.delete(entrySubstepId);
          }
        }

        // Pick the topmost visible substep (earliest in substepIds order)
        const topmost = substepIds.find((id) => visibleSet.has(id)) ?? null;
        setVisibleSubstepId(topmost);
      },
      {
        root: container,
        // Top half of viewport = visible
        rootMargin: '0px 0px -50% 0px',
        threshold: 0,
      },
    );

    for (const el of refs.values()) {
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, [substepRefs, scrollContainer, substepIds]);

  return visibleSubstepId;
}
