import type {
  InstructionData,
  DrawingRow,
  NoteRow,
  PartToolRow,
  SafetyIconCategory,
} from '@/features/instruction';
import { isImageDrawing, getCategoryPriority } from '@/features/instruction';
import { buildMediaUrl, MediaPaths } from '@/lib/media';
import { byOrder } from '@/lib/sortedValues';

export interface PrintNoteData {
  text: string;
  safetyIconCategory: SafetyIconCategory;
  safetyIconId: string;
}

export interface PrintPartToolData {
  name: string;
  label: string | null;
  type: PartToolRow['type'];
  amount: number;
}

export interface PrintSubstepData {
  imageUrl: string | null;
  substepImageId: string | null;
  imageDrawings: DrawingRow[];
  descriptions: string[];
  notes: PrintNoteData[];
  partTools: PrintPartToolData[];
}

/**
 * Resolve all print-relevant data for a single substep.
 * Pure function — no hooks or side effects.
 */
export function resolveSubstepPrintData(
  data: InstructionData,
  substepId: string,
  folderName: string,
): PrintSubstepData {
  const substep = data.substeps[substepId];
  if (!substep) {
    return { imageUrl: null, substepImageId: null, imageDrawings: [], descriptions: [], notes: [], partTools: [] };
  }

  // ── Image URL (first substep image) ──
  const firstImageRowId = substep.imageRowIds[0] ?? null;
  const firstImage = firstImageRowId ? data.substepImages[firstImageRowId] : null;
  const imageUrl = firstImage
    ? buildMediaUrl(folderName, MediaPaths.frame(firstImage.videoFrameAreaId))
    : null;

  // ── Image drawings ──
  const substepImageId = firstImage?.id ?? null;
  const imageDrawings = substepImageId
    ? Object.values(data.drawings).filter(
        (d) => isImageDrawing(d) && d.substepImageId === substepImageId,
      )
    : [];

  if (substepImageId) {
    const allDrawings = Object.values(data.drawings);
    const imageDrawingsAll = allDrawings.filter(d => isImageDrawing(d));
    if (imageDrawings.length === 0 && imageDrawingsAll.length > 0) {
      console.warn(
        `[resolveSubstepPrintData] Substep ${substepId}: has substepImageId=${substepImageId} ` +
        `but 0 matching drawings. Total image drawings in data: ${imageDrawingsAll.length}. ` +
        `Their substepImageIds: ${imageDrawingsAll.map(d => d.substepImageId).join(', ')}`,
      );
    } else {
      console.debug(
        `[resolveSubstepPrintData] Substep ${substepId}: substepImageId=${substepImageId}, ` +
        `found ${imageDrawings.length} drawings`,
      );
    }
  }

  // ── Descriptions (sorted by order) ──
  const descriptions = substep.descriptionRowIds
    .map((id) => data.substepDescriptions[id])
    .filter(Boolean)
    .sort(byOrder)
    .map((d) => d.text);

  // ── Notes (sorted by category priority) ──
  const notes = substep.noteRowIds
    .map((id) => data.substepNotes[id])
    .filter(Boolean)
    .map((sn) => data.notes[sn.noteId])
    .filter((n): n is NoteRow => !!n)
    .sort((a, b) => getCategoryPriority(a.safetyIconCategory) - getCategoryPriority(b.safetyIconCategory))
    .map((n) => ({
      text: n.text,
      safetyIconCategory: n.safetyIconCategory as SafetyIconCategory,
      safetyIconId: n.safetyIconId,
    }));

  // ── Part/tools (with substep-specific amounts) ──
  const partTools = substep.partToolRowIds
    .map((id) => data.substepPartTools[id])
    .filter(Boolean)
    .sort(byOrder)
    .map((spt) => {
      const pt = data.partTools[spt.partToolId];
      if (!pt) return null;
      return {
        name: pt.name,
        label: pt.label,
        type: pt.type,
        amount: spt.amount,
      };
    })
    .filter((p): p is PrintPartToolData => p !== null);

  return {
    imageUrl,
    substepImageId,
    imageDrawings,
    descriptions,
    notes,
    partTools,
  };
}
