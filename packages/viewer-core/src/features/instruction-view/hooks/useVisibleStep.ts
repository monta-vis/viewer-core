import { useState, useEffect, type RefObject } from 'react';

/**
 * Tracks which step section is currently at the top of the scroll container
 * using IntersectionObserver.
 *
 * Returns the ID of the topmost visible step, or null if none are visible.
 */
export function useVisibleStep(
  stepSectionRefs: RefObject<Map<string, HTMLElement> | null>,
  scrollContainer: RefObject<HTMLElement | null>,
  stepIds: string[],
): string | null {
  const [visibleStepId, setVisibleStepId] = useState<string | null>(null);

  useEffect(() => {
    const container = scrollContainer.current;
    const refs = stepSectionRefs.current;
    if (!container || !refs || refs.size === 0 || stepIds.length === 0) return;

    // Track which step elements are currently intersecting
    const visibleSet = new Set<string>();
    // Reverse lookup: element → stepId (O(1) per entry)
    const elementToStepId = new WeakMap<Element, string>();
    for (const [id, el] of refs.entries()) {
      elementToStepId.set(el, id);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const entryStepId = elementToStepId.get(entry.target) ?? null;
          if (!entryStepId) continue;

          if (entry.isIntersecting) {
            visibleSet.add(entryStepId);
          } else {
            visibleSet.delete(entryStepId);
          }
        }

        // Pick the topmost visible step (earliest in stepIds order)
        const topmost = stepIds.find((id) => visibleSet.has(id)) ?? null;
        setVisibleStepId(topmost);
      },
      {
        root: container,
        // Trigger when any part of the step section is in the top portion
        rootMargin: '0px 0px -70% 0px',
        threshold: 0,
      },
    );

    for (const el of refs.values()) {
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, [stepSectionRefs, scrollContainer, stepIds]);

  return visibleStepId;
}
