import type { DrawingRow } from '@/features/instruction';
import { isImageDrawing, isVideoDrawing } from '@/features/instruction';

/** Get image drawings that belong to a specific video frame area */
export function getImageDrawings(
  drawings: Record<string, DrawingRow>,
  videoFrameAreaId: string | null,
): DrawingRow[] {
  if (!videoFrameAreaId) return [];
  return Object.values(drawings).filter(
    (d) => isImageDrawing(d) && d.videoFrameAreaId === videoFrameAreaId,
  );
}

/** Get all video drawings for a given substep */
export function getVideoDrawings(
  drawings: Record<string, DrawingRow>,
  substepId: string,
): DrawingRow[] {
  return Object.values(drawings).filter(
    (d) => isVideoDrawing(d) && d.substepId === substepId,
  );
}

/** Filter video drawings to only those visible at the given frame */
export function getVisibleVideoDrawings(
  videoDrawings: DrawingRow[],
  currentFrame: number,
): DrawingRow[] {
  return videoDrawings.filter(
    (d) => d.startFrame !== null && d.endFrame !== null &&
      currentFrame >= d.startFrame && currentFrame <= d.endFrame,
  );
}
