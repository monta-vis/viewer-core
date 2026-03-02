/**
 * Custom hook for handling drag operations on timeline regions.
 *
 * Uses refs for regions/onRegionsChange to avoid re-registering
 * mousemove/mouseup listeners on every drag tick.
 */

import { useState, useCallback, useEffect, useRef, type RefObject } from 'react';
import type { CutRegion } from '../../types/trim.types';
import { MIN_REGION_DURATION } from './trimConstants';

interface DragState {
  regionId: string;
  handle: 'start' | 'end' | 'move';
  startX: number;
  originalRegion: CutRegion;
}

interface UseTrimDragOptions {
  timelineRef: RefObject<HTMLDivElement | null>;
  duration: number;
  regions: CutRegion[];
  onRegionsChange: (regions: CutRegion[]) => void;
}

interface UseTrimDragReturn {
  dragging: DragState | null;
  handleDragStart: (e: React.MouseEvent, regionId: string, handle: 'start' | 'end' | 'move') => void;
}

export function useTrimDrag({
  timelineRef,
  duration,
  regions,
  onRegionsChange,
}: UseTrimDragOptions): UseTrimDragReturn {
  const [dragging, setDragging] = useState<DragState | null>(null);

  // Keep current values in refs so drag listeners don't need to re-register
  const regionsRef = useRef(regions);
  regionsRef.current = regions;

  const onRegionsChangeRef = useRef(onRegionsChange);
  onRegionsChangeRef.current = onRegionsChange;

  const durationRef = useRef(duration);
  durationRef.current = duration;

  const handleDragStart = useCallback(
    (e: React.MouseEvent, regionId: string, handle: 'start' | 'end' | 'move') => {
      e.stopPropagation();
      const region = regionsRef.current.find((r) => r.id === regionId);
      if (!region) return;

      setDragging({
        regionId,
        handle,
        startX: e.clientX,
        originalRegion: { ...region },
      });
    },
    [],
  );

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragging.startX;
      const rect = timelineRef.current?.getBoundingClientRect();
      if (!rect) return;

      const dur = durationRef.current;
      const deltaTime = (deltaX / rect.width) * dur;
      const region = { ...dragging.originalRegion };

      if (dragging.handle === 'start') {
        region.startTime = Math.max(
          0,
          Math.min(region.endTime - MIN_REGION_DURATION, region.startTime + deltaTime),
        );
      } else if (dragging.handle === 'end') {
        region.endTime = Math.min(
          dur,
          Math.max(region.startTime + MIN_REGION_DURATION, region.endTime + deltaTime),
        );
      } else {
        const regionDuration = region.endTime - region.startTime;
        region.startTime = Math.max(
          0,
          Math.min(dur - regionDuration, region.startTime + deltaTime),
        );
        region.endTime = region.startTime + regionDuration;
      }

      onRegionsChangeRef.current(
        regionsRef.current.map((r) => (r.id === dragging.regionId ? region : r)),
      );
    };

    const handleMouseUp = () => setDragging(null);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, timelineRef]);

  return { dragging, handleDragStart };
}
