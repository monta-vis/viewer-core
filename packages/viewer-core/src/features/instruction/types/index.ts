// Enriched entity types (with grouped IDs)
export type {
  // Base row types
  StepRow,
  SubstepRow,
  AssemblyRow,
  VideoRow,
  VideoSectionRow,
  VideoFrameAreaRow,
  ViewportKeyframe,
  ViewportKeyframeRow,
  SubstepImageRow,
  PartToolRow,
  NoteRow,
  SafetyIconRow,
  SubstepPartToolRow,
  SubstepNoteRow,
  SubstepDescriptionRow,
  SubstepReferenceRow,
  SubstepVideoSectionRow,
  PartToolVideoFrameAreaRow,
  DrawingRow,
  ProxyStatus,

  // Enriched types (with grouped relation IDs)
  Step,
  Substep,
  Assembly,
  Video,

  // Enriched junction types (for display)
  EnrichedSubstepImage,
  EnrichedSubstepPartTool,
  EnrichedSubstepNote,
  EnrichedSubstepVideoSection,
} from './enriched';

// Shape types (shared between instruction + video-overlay)
export type { ShapeType, ShapeColor } from './enriched';

// Sentinel IDs (shared between instruction-view + editor)
export { UNASSIGNED_STEP_ID, UNASSIGNED_SUBSTEP_ID } from './sentinels';

// Helper functions
export { isVideoDrawing, isImageDrawing } from './enriched';

// Type alias for backwards compatibility
export type { DrawingRow as AnnotationRow } from './enriched';

// Data shape & helpers (used by ViewerDataProvider and editor-core)
export {
  type InstructionData,
  videoFrameAreaToViewport,
} from './data';
