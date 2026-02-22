import { useState, useMemo, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { useVideo } from '@/features/video-player';
import { useSimpleStore } from '@/features/instruction';
import type { AreaData, Rectangle } from '../types';
import { rectToNormalized, normalizedToRect } from '../utils/coordinates';

// Re-export for backwards compatibility
export type VideoFrameAreaData = AreaData;

// ============================================
// Types
// ============================================

export interface UseVideoFrameAreaManagerProps {
  videoId: string | null;
  versionId: string;
  selectedSubstepId: string | null;
}

export interface CreateAreaResult {
  /** The created VideoFrameArea ID */
  areaId: string;
  /** The created junction row ID (SubstepImage / SubstepPartTool) */
  junctionId?: string;
}

export interface UseVideoFrameAreaManagerReturn {
  /** All areas for the current video frame (based on playhead position) */
  areasForCurrentFrame: VideoFrameAreaData[];

  /** Currently selected area ID */
  selectedAreaId: string | null;

  /** Select an area */
  selectArea: (id: string | null) => void;

  /** Create a SubstepImage area at current frame. Returns IDs for selection. */
  createImageArea: (rect: Rectangle) => CreateAreaResult | null;

  /** Create a PartToolScan area at current frame. Returns IDs for selection. */
  createPartToolScanArea: (rect: Rectangle, partToolId: string) => CreateAreaResult | null;

  /** Create a PartToolScan area at current frame WITHOUT linking to a PartTool yet. */
  createPartToolAreaOnly: (rect: Rectangle) => CreateAreaResult | null;

  /** Update an area's coordinates */
  updateArea: (areaId: string, rect: Rectangle) => void;

  /** Update an area's frame number (move to different frame) */
  updateAreaFrame: (areaId: string, newFrameNumber: number) => void;

  /** Get the current frame number of an area */
  getAreaFrameNumber: (areaId: string) => number | null;

  /** Delete an area and its junction entries */
  deleteArea: (areaId: string) => void;

  /** Jump video to an area's frame and select it */
  jumpToAreaFrame: (areaId: string) => void;
}

// ============================================
// Hook
// ============================================

export function useVideoFrameAreaManager({
  videoId,
  versionId,
  selectedSubstepId,
}: UseVideoFrameAreaManagerProps): UseVideoFrameAreaManagerReturn {
  const { currentFrame, seekFrame } = useVideo();
  const {
    data,
    addVideoFrameArea,
    updateVideoFrameArea,
    deleteVideoFrameArea,
    addSubstepImage,
    deleteSubstepImage,
    addPartToolVideoFrameArea,
    deletePartToolVideoFrameArea,
  } = useSimpleStore();

  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);

  // ========================================
  // Build frame-to-areas index for O(1) lookup
  // ========================================
  const frameToAreaIds = useMemo(() => {
    if (!data || !videoId) return {};

    const index: Record<number, string[]> = {};
    for (const area of Object.values(data.videoFrameAreas)) {
      if (area.videoId !== videoId || area.frameNumber == null) continue;
      const frame = area.frameNumber;
      if (!index[frame]) index[frame] = [];
      index[frame].push(area.id);
    }
    return index;
  }, [data?.videoFrameAreas, videoId]);

  // ========================================
  // Get areas for current frame as display format
  // ========================================
  const areasForCurrentFrame = useMemo((): VideoFrameAreaData[] => {
    if (!data) return [];

    const areaIds = frameToAreaIds[currentFrame] ?? [];

    return areaIds
      .map((id) => data.videoFrameAreas[id])
      .filter(Boolean)
      .map((area) => {
        const rect = normalizedToRect({
          x: area.x ?? undefined,
          y: area.y ?? undefined,
          width: area.width ?? undefined,
          height: area.height ?? undefined,
        });

        return {
          id: area.id,
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          type: area.type as VideoFrameAreaData['type'],
        };
      });
  }, [data, frameToAreaIds, currentFrame]);

  // ========================================
  // Create SubstepImage area
  // ========================================
  const createImageArea = useCallback(
    (rect: Rectangle): CreateAreaResult | null => {
      if (!selectedSubstepId || !videoId || !data) {
        console.warn('Cannot create image area: no substep selected or no video');
        return null;
      }

      const normalized = rectToNormalized(rect);

      const areaId = uuidv4();
      const area = {
        id: areaId,
        versionId,
        videoId,
        frameNumber: currentFrame,
        imageId: null,
        x: normalized.x,
        y: normalized.y,
        width: normalized.width,
        height: normalized.height,
        type: 'SubstepImage' as const,
      };

      // Add area to store (also updates Video.frameAreaIds automatically)
      addVideoFrameArea(area);

      // Create SubstepImageRow junction
      const substep = data.substeps[selectedSubstepId];
      const maxOrder = substep?.imageRowIds?.length ?? 0;

      const junctionId = uuidv4();
      addSubstepImage({
        id: junctionId,
        versionId,
        videoFrameAreaId: areaId,
        substepId: selectedSubstepId,
        order: maxOrder,
      });

      // Select the newly created area
      setSelectedAreaId(areaId);

      return { areaId, junctionId };
    },
    [
      selectedSubstepId,
      videoId,
      data,
      currentFrame,
      versionId,
      addVideoFrameArea,
      addSubstepImage,
    ]
  );

  // ========================================
  // Create PartToolScan area
  // ========================================
  const createPartToolScanArea = useCallback(
    (rect: Rectangle, partToolId: string): CreateAreaResult | null => {
      if (!videoId || !data) {
        console.warn('Cannot create part/tool area: no video');
        return null;
      }

      const normalized = rectToNormalized(rect);

      const areaId = uuidv4();
      const area = {
        id: areaId,
        versionId,
        videoId,
        frameNumber: currentFrame,
        imageId: null,
        x: normalized.x,
        y: normalized.y,
        width: normalized.width,
        height: normalized.height,
        type: 'PartToolScan' as const,
      };

      // Add area to store (also updates Video.frameAreaIds automatically)
      addVideoFrameArea(area);

      // Get existing areas for this partTool to determine order
      const existingAreas = Object.values(data.partToolVideoFrameAreas || {})
        .filter((row) => row.partToolId === partToolId);
      const maxOrder = existingAreas.length > 0
        ? Math.max(...existingAreas.map((r) => r.order)) + 1
        : 0;

      // Create PartToolVideoFrameArea junction
      addPartToolVideoFrameArea({
        id: uuidv4(),
        versionId,
        partToolId,
        videoFrameAreaId: areaId,
        order: maxOrder,
        isPreviewImage: existingAreas.length === 0, // First area is preview
      });

      // Select the newly created area
      setSelectedAreaId(areaId);

      return { areaId };
    },
    [
      videoId,
      data,
      currentFrame,
      versionId,
      addVideoFrameArea,
      addPartToolVideoFrameArea,
    ]
  );

  // ========================================
  // Create PartToolScan area WITHOUT junction (for draw-first workflow)
  // ========================================
  const createPartToolAreaOnly = useCallback(
    (rect: Rectangle): CreateAreaResult | null => {
      if (!videoId || !data) {
        console.warn('Cannot create part/tool area: no video');
        return null;
      }

      const normalized = rectToNormalized(rect);

      const areaId = uuidv4();
      const area = {
        id: areaId,
        versionId,
        videoId,
        frameNumber: currentFrame,
        imageId: null,
        x: normalized.x,
        y: normalized.y,
        width: normalized.width,
        height: normalized.height,
        type: 'PartToolScan' as const,
      };

      // Add area to store (also updates Video.frameAreaIds automatically)
      // Note: Junction entry will be created later when PartTool is saved
      addVideoFrameArea(area);

      // Select the newly created area
      setSelectedAreaId(areaId);

      return { areaId };
    },
    [videoId, data, currentFrame, versionId, addVideoFrameArea]
  );

  // ========================================
  // Update area coordinates
  // ========================================
  const updateArea = useCallback(
    (areaId: string, rect: Rectangle) => {
      const normalized = rectToNormalized(rect);
      updateVideoFrameArea(areaId, {
        x: normalized.x,
        y: normalized.y,
        width: normalized.width,
        height: normalized.height,
      });
    },
    [updateVideoFrameArea]
  );

  // ========================================
  // Update area frame number (move to different frame)
  // ========================================
  const updateAreaFrame = useCallback(
    (areaId: string, newFrameNumber: number) => {
      updateVideoFrameArea(areaId, { frameNumber: newFrameNumber });
    },
    [updateVideoFrameArea]
  );

  // ========================================
  // Get area's current frame number
  // ========================================
  const getAreaFrameNumber = useCallback(
    (areaId: string): number | null => {
      if (!data) return null;

      const area = data.videoFrameAreas[areaId];
      return area?.frameNumber ?? null;
    },
    [data]
  );

  // ========================================
  // Delete area and its junction entries
  // ========================================
  const deleteArea = useCallback(
    (areaId: string) => {
      if (!data) return;

      const area = data.videoFrameAreas[areaId];
      if (!area) return;

      // Delete junction entries based on type
      if (area.type === 'SubstepImage') {
        // Find and delete SubstepImageRow that references this area
        const substepImageRow = Object.values(data.substepImages).find(
          (row) => row.videoFrameAreaId === areaId
        );
        if (substepImageRow) {
          deleteSubstepImage(substepImageRow.id);
        }
      } else if (area.type === 'PartToolScan') {
        // Find and delete PartToolVideoFrameArea that references this area
        const partToolRow = Object.values(data.partToolVideoFrameAreas).find(
          (row) => row.videoFrameAreaId === areaId
        );
        if (partToolRow) {
          deletePartToolVideoFrameArea(partToolRow.id);
        }
      }

      // Delete the area itself
      deleteVideoFrameArea(areaId);

      // Clear selection if this area was selected
      if (selectedAreaId === areaId) {
        setSelectedAreaId(null);
      }
    },
    [data, selectedAreaId, deleteVideoFrameArea, deleteSubstepImage, deletePartToolVideoFrameArea]
  );

  // ========================================
  // Jump to area's frame
  // ========================================
  const jumpToAreaFrame = useCallback(
    (areaId: string) => {
      if (!data) return;

      const area = data.videoFrameAreas[areaId];
      if (!area || area.frameNumber == null) return;

      seekFrame(area.frameNumber);
      setSelectedAreaId(areaId);
    },
    [data, seekFrame]
  );

  return {
    areasForCurrentFrame,
    selectedAreaId,
    selectArea: setSelectedAreaId,
    createImageArea,
    createPartToolScanArea,
    createPartToolAreaOnly,
    updateArea,
    updateAreaFrame,
    getAreaFrameNumber,
    deleteArea,
    jumpToAreaFrame,
  };
}
