/**
 * @montavis/viewer-core
 *
 * Shared instruction viewer components for Montavis.
 * Read-only assembly instruction viewer for factory workers.
 */

// Instruction View (main feature)
export * from './features/instruction-view';

// Instruction Store & Types
export {
  useSimpleStore,
  videoFrameAreaToViewport,
  viewportToVideoFrameAreaCoords,
  type InstructionData,
} from './features/instruction';
export type {
  Step,
  Substep,
  Video,
  VideoSectionRow,
  VideoFrameAreaRow,
  PartToolRow,
  NoteRow,
  SafetyIconRow,
  SubstepImageRow,
  SubstepDescriptionRow,
  SubstepPartToolRow,
  EnrichedSubstepPartTool,
  EnrichedSubstepNote,
  EnrichedSubstepVideoSection,
  ViewportKeyframeRow,
  DrawingRow,
  SubstepReferenceRow,
  SubstepRow,
  ShapeType,
  ShapeColor,
} from './features/instruction';
export {
  isVideoDrawing,
  isImageDrawing,
  UNASSIGNED_STEP_ID,
  sortSubstepsByVideoFrame,
  sortSubstepsFlat,
  buildSortData,
  formatReferenceDisplayRich,
} from './features/instruction';

// Video Player
export {
  VideoProvider,
  useVideo,
  VideoPlayer,
  useVideoViewportInterpolation,
} from './features/video-player';

// Video Overlay
export {
  VideoOverlay,
  useVideoFrameAreaManager,
} from './features/video-overlay';

// Feedback
export {
  FeedbackButton,
  StarRating,
} from './features/feedback';

// Snapshot type
export type { InstructionSnapshot } from './types/snapshot';
