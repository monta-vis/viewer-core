/**
 * InstructionData — the normalized data shape for a loaded instruction.
 *
 * This is a pure data type (no store logic) used by both viewer-core
 * (via ViewerDataProvider) and editor-core (via useEditorStore).
 */

import type {
  Step,
  Substep,
  Assembly,
  Video,
  SubstepImageRow,
  SubstepPartToolRow,
  SubstepNoteRow,
  SubstepDescriptionRow,
  SubstepTutorialRow,
  SubstepVideoSectionRow,
  VideoFrameAreaRow,
  VideoSectionRow,
  ViewportKeyframeRow,
  PartToolRow,
  NoteRow,
  SafetyIconRow,
  PartToolVideoFrameAreaRow,
  DrawingRow,
  ViewportKeyframe,
} from './enriched';

export interface InstructionData {
  instructionId: string;
  instructionName: string;
  instructionDescription: string | null;
  instructionPreviewImageId: string | null;
  coverImageAreaId: string | null;
  articleNumber: string | null;
  estimatedDuration: number | null;
  sourceLanguage: string;
  useBlurred: boolean;
  currentVersionId: string;
  liteSubstepLimit: number | null;

  assemblies: Record<string, Assembly>;
  steps: Record<string, Step>;
  substeps: Record<string, Substep>;
  videos: Record<string, Video>;
  videoSections: Record<string, VideoSectionRow>;
  videoFrameAreas: Record<string, VideoFrameAreaRow>;
  viewportKeyframes: Record<string, ViewportKeyframeRow>;
  partTools: Record<string, PartToolRow>;
  notes: Record<string, NoteRow>;
  substepImages: Record<string, SubstepImageRow>;
  substepPartTools: Record<string, SubstepPartToolRow>;
  substepNotes: Record<string, SubstepNoteRow>;
  substepDescriptions: Record<string, SubstepDescriptionRow>;
  substepVideoSections: Record<string, SubstepVideoSectionRow>;
  partToolVideoFrameAreas: Record<string, PartToolVideoFrameAreaRow>;
  drawings: Record<string, DrawingRow>;
  substepTutorials: Record<string, SubstepTutorialRow>;
  safetyIcons: Record<string, SafetyIconRow>;
}

/**
 * Convert a VideoFrameArea to a ViewportKeyframe.
 * VideoFrameArea now uses x, y, width, height directly (same as ViewportKeyframe).
 * Returns null if any coordinate is missing.
 */
export function videoFrameAreaToViewport(
  area: VideoFrameAreaRow | null | undefined
): ViewportKeyframe | null {
  if (!area) return null;
  const { x, y, width, height } = area;
  if (x == null || y == null || width == null || height == null) {
    return null;
  }
  return { x, y, width, height };
}
