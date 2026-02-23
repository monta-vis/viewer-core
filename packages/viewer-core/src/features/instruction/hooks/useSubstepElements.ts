/**
 * useSubstepElements Hook
 *
 * Holt alle Elemente eines Substeps und reichert sie an.
 * Single Responsibility: Nur Substep-Element-Zugriff.
 *
 * Verwendet die gruppierten IDs im Substep für schnellen Zugriff.
 */
import { useMemo } from 'react';
import type {
  Substep,
  SubstepImageRow,
  SubstepPartToolRow,
  SubstepNoteRow,
  SubstepDescriptionRow,
  SubstepVideoSectionRow,
  VideoFrameAreaRow,
  VideoSectionRow,
  PartToolRow,
  NoteRow,
  EnrichedSubstepImage,
  EnrichedSubstepPartTool,
  EnrichedSubstepNote,
  EnrichedSubstepVideoSection,
} from '../types/enriched';

// ============================================
// Props Interface
// ============================================

export interface UseSubstepElementsProps {
  /** Der ausgewählte Substep (mit gruppierten IDs) */
  substep: Substep | null;

  /** Dictionaries für schnellen ID-Lookup */
  imageRowsDict: Record<string, SubstepImageRow>;
  partToolRowsDict: Record<string, SubstepPartToolRow>;
  noteRowsDict: Record<string, SubstepNoteRow>;
  descriptionRowsDict: Record<string, SubstepDescriptionRow>;
  videoSectionRowsDict: Record<string, SubstepVideoSectionRow>;

  /** Referenz-Dictionaries für Anreicherung */
  videoFrameAreasDict: Record<string, VideoFrameAreaRow>;
  videoSectionsDict: Record<string, VideoSectionRow>;
  partToolsDict: Record<string, PartToolRow>;
  notesDict: Record<string, NoteRow>;
}

// ============================================
// Return Interface
// ============================================

export interface UseSubstepElementsReturn {
  /** Angereicherte Bilder (sortiert nach order) */
  images: EnrichedSubstepImage[];

  /** Angereicherte Parts (nur type='Part') */
  parts: EnrichedSubstepPartTool[];

  /** Angereicherte Tools (nur type='Tool') */
  tools: EnrichedSubstepPartTool[];

  /** Angereicherte Notes */
  notes: EnrichedSubstepNote[];

  /** Beschreibungen (sortiert nach order) */
  descriptions: SubstepDescriptionRow[];

  /** Angereicherte VideoSections */
  videoSections: EnrichedSubstepVideoSection[];
}

// ============================================
// Hook Implementation
// ============================================

export function useSubstepElements({
  substep,
  imageRowsDict,
  partToolRowsDict,
  noteRowsDict,
  descriptionRowsDict,
  videoSectionRowsDict,
  videoFrameAreasDict,
  videoSectionsDict,
  partToolsDict,
  notesDict,
}: UseSubstepElementsProps): UseSubstepElementsReturn {

  // ========================================
  // Images
  // ========================================
  const images = useMemo(() => {
    if (!substep) return [];

    return substep.imageRowIds
      .map((id) => {
        const row = imageRowsDict[id];
        if (!row) return null;

        const area = videoFrameAreasDict[row.videoFrameAreaId];
        if (!area) return null;

        return {
          ...row,
          area,
        } satisfies EnrichedSubstepImage;
      })
      .filter((item): item is EnrichedSubstepImage => item !== null)
      .sort((a, b) => a.order - b.order);
  }, [substep, imageRowsDict, videoFrameAreasDict]);

  // ========================================
  // Parts & Tools
  // ========================================
  const { parts, tools } = useMemo(() => {
    if (!substep) return { parts: [], tools: [] };

    const enriched = substep.partToolRowIds
      .map((id, index) => {
        const row = partToolRowsDict[id];
        if (!row) return null;

        const partTool = partToolsDict[row.partToolId];
        if (!partTool) return null;

        // Use order from data, fallback to array index if not set
        const order = row.order ?? index;
        return { ...row, order, partTool } satisfies EnrichedSubstepPartTool;
      })
      .filter((item): item is EnrichedSubstepPartTool => item !== null);

    return {
      parts: enriched.filter((e) => e.partTool.type === 'Part').sort((a, b) => a.order - b.order),
      tools: enriched.filter((e) => e.partTool.type === 'Tool').sort((a, b) => a.order - b.order),
    };
  }, [substep, partToolRowsDict, partToolsDict]);

  // ========================================
  // Notes
  // ========================================
  const notes = useMemo(() => {
    if (!substep) return [];

    return substep.noteRowIds
      .map((id, index) => {
        const row = noteRowsDict[id];
        if (!row) return null;

        const note = notesDict[row.noteId];
        if (!note) return null;

        // Use order from data, fallback to array index if not set
        const order = row.order ?? index;
        return { ...row, order, note } satisfies EnrichedSubstepNote;
      })
      .filter((item): item is EnrichedSubstepNote => item !== null)
      .sort((a, b) => a.order - b.order);
  }, [substep, noteRowsDict, notesDict]);

  // ========================================
  // Descriptions
  // ========================================
  const descriptions = useMemo(() => {
    if (!substep) return [];

    return substep.descriptionRowIds
      .map((id) => descriptionRowsDict[id])
      .filter((item): item is SubstepDescriptionRow => item !== null)
      .sort((a, b) => a.order - b.order);
  }, [substep, descriptionRowsDict]);

  // ========================================
  // Video Sections
  // ========================================
  const videoSections = useMemo(() => {
    if (!substep) return [];

    return substep.videoSectionRowIds
      .map((id) => {
        const row = videoSectionRowsDict[id];
        if (!row?.videoSectionId) return null;

        const videoSection = videoSectionsDict[row.videoSectionId];
        if (!videoSection) return null;

        return {
          ...row,
          videoSection,
        } satisfies EnrichedSubstepVideoSection;
      })
      .filter((item): item is EnrichedSubstepVideoSection => item !== null)
      .sort((a, b) => a.order - b.order);
  }, [substep, videoSectionRowsDict, videoSectionsDict, videoFrameAreasDict]);

  return {
    images,
    parts,
    tools,
    notes,
    descriptions,
    videoSections,
  };
}
