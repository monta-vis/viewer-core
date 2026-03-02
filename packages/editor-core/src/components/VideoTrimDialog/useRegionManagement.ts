/**
 * Hook for managing cut regions - selection, deletion, and keyboard events.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { CutRegion } from '../../types/trim.types';

interface UseRegionManagementOptions {
  regions: CutRegion[];
  onRegionsChange: (regions: CutRegion[]) => void;
}

interface UseRegionManagementReturn {
  selectedRegionId: string | null;
  setSelectedRegionId: (id: string | null) => void;
  handleDeleteRegion: (regionId: string) => void;
}

export function useRegionManagement({
  regions,
  onRegionsChange,
}: UseRegionManagementOptions): UseRegionManagementReturn {
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);

  // Use refs to avoid re-registering the listener on every regions/callback change
  const regionsRef = useRef(regions);
  regionsRef.current = regions;
  const onRegionsChangeRef = useRef(onRegionsChange);
  onRegionsChangeRef.current = onRegionsChange;

  // Handle keyboard delete — only re-register when selection changes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedRegionId || (e.key !== 'Delete' && e.key !== 'Backspace')) return;

      // Don't intercept keyboard events from text inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      onRegionsChangeRef.current(regionsRef.current.filter((r) => r.id !== selectedRegionId));
      setSelectedRegionId(null);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedRegionId]);

  const handleDeleteRegion = useCallback(
    (regionId: string) => {
      onRegionsChangeRef.current(regionsRef.current.filter((r) => r.id !== regionId));
      if (selectedRegionId === regionId) setSelectedRegionId(null);
    },
    [selectedRegionId],
  );

  return {
    selectedRegionId,
    setSelectedRegionId,
    handleDeleteRegion,
  };
}
