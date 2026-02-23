/**
 * Instruction Feature
 *
 * Clean architecture:
 * - Store: Normalized dicts + grouped IDs
 * - Types: Enriched entities with relation IDs
 * - Hooks: Single responsibility for data access
 */

// Store
export {
  useSimpleStore,
  videoFrameAreaToViewport,
  viewportToVideoFrameAreaCoords,
  type InstructionData,
  type EventRecordCallback,
} from './store';

// Hooks
export { useSubstepElements } from './hooks';

// Types
export type {
  Step,
  Substep,
  Assembly,
  AssemblyRow,
  Video,
  VideoSectionRow,
  VideoFrameAreaRow,
  ProxyStatus,
  PartToolRow,
  NoteRow,
  SafetyIconRow,
  SubstepImageRow,
  SubstepDescriptionRow,
  SubstepPartToolRow,
  PartToolVideoFrameAreaRow,
  EnrichedSubstepImage,
  EnrichedSubstepPartTool,
  EnrichedSubstepNote,
  EnrichedSubstepVideoSection,
  ViewportKeyframe,
  VideoRow,
  ViewportKeyframeRow,
  DrawingRow,
  ImageRow,
  AnnotationRow,
  SubstepReferenceRow,
  SubstepRow,
} from './types';

// Shape types
export type { ShapeType, ShapeColor } from './types';

// Sentinel IDs
export { UNASSIGNED_STEP_ID, UNASSIGNED_SUBSTEP_ID } from './types';

// Functions
export { isVideoDrawing, isImageDrawing } from './types';

// Sort utilities
export {
  sortSubstepsByVideoFrame,
  sortSubstepsFlat,
  buildSortData,
} from './utils/substepListSort';
export type { SubstepSortData } from './utils/substepListSort';

// Safety icon utilities
export {
  getCategoryFromFilename,
  getCategoryPriority,
  getCategoryColor,
  safetyIconUrl,
  safetyIconLabel,
  isLegacyLevel,
  SAFETY_ICON_CATEGORIES,
  LEGACY_LEVEL_TO_ICON,
} from './utils/safetyIcons';
export type { NoteLevel, SafetyIconCategory } from './utils/safetyIcons';
export { SAFETY_ICON_MANIFEST, SAFETY_ICON_BY_FILENAME } from './utils/safetyIconManifest';
export type { SafetyIconEntry } from './utils/safetyIconManifest';

// Utils
export { resolveReferenceLabel, formatReferenceDisplay } from './utils/resolveReferenceLabel';
export { formatReferenceDisplayRich, type RichReferenceDisplay } from './utils/formatReferenceDisplayRich';
