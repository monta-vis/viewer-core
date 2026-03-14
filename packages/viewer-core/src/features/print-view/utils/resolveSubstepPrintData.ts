import type {
  InstructionData,
  DrawingRow,
  NoteRow,
  PartToolRow,
  SafetyIconCategory,
} from '@/features/instruction';
import { isImageDrawing, getCategoryPriority } from '@/features/instruction';
import type { MediaResolver } from '@/lib/mediaResolver';
import { byOrder } from '@/lib/sortedValues';

export interface PrintNoteData {
  text: string;
  safetyIconCategory: SafetyIconCategory;
  safetyIconId: string;
}

export interface PrintPartToolData {
  name: string;
  position: string | null;
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
  resolver: MediaResolver,
): PrintSubstepData {
  const substep = data.substeps[substepId];
  if (!substep) {
    return { imageUrl: null, substepImageId: null, imageDrawings: [], descriptions: [], notes: [], partTools: [] };
  }

  // ── Image URL (first substep image) ──
  const firstImageRowId = substep.imageRowIds[0] ?? null;
  const firstImage = firstImageRowId ? data.substepImages[firstImageRowId] : null;
  const resolved = firstImage ? resolver.resolveImage(firstImage.videoFrameAreaId) : null;
  const imageUrl = resolved?.kind === 'url' ? resolved.url : null;

  // ── Image drawings (keyed by videoFrameAreaId) ──
  const imageVfaId = firstImage?.videoFrameAreaId ?? null;
  const imageDrawings = imageVfaId
    ? Object.values(data.drawings).filter(
        (d) => isImageDrawing(d) && d.videoFrameAreaId === imageVfaId,
      )
    : [];

  if (imageVfaId && imageDrawings.length === 0) {
    const imageDrawingsAll = Object.values(data.drawings).filter(d => isImageDrawing(d));
    if (imageDrawingsAll.length > 0) {
      console.warn(
        `[resolveSubstepPrintData] Substep ${substepId}: has videoFrameAreaId=${imageVfaId} ` +
        `but 0 matching drawings. Total image drawings in data: ${imageDrawingsAll.length}. ` +
        `Their videoFrameAreaIds: ${imageDrawingsAll.map(d => d.videoFrameAreaId).join(', ')}`,
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
        position: pt.position,
        type: pt.type,
        amount: spt.amount,
      };
    })
    .filter((p): p is PrintPartToolData => p !== null);

  return {
    imageUrl,
    substepImageId: firstImage?.id ?? null,
    imageDrawings,
    descriptions,
    notes,
    partTools,
  };
}
