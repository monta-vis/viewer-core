/**
 * Instruction Feature
 *
 * Clean architecture:
 * - Store: Normalized dicts + grouped IDs
 * - Types: Enriched entities with relation IDs
 * - Hooks: Single responsibility for data access
 */

// Data types & helpers (store moved to @monta-vis/editor-core)
export {
  videoFrameAreaToViewport,
  type InstructionData,
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
  SubstepNoteRow,
  SubstepPartToolRow,
  SubstepVideoSectionRow,
  PartToolVideoFrameAreaRow,
  EnrichedSubstepImage,
  EnrichedSubstepPartTool,
  EnrichedSubstepNote,
  EnrichedSubstepVideoSection,
  ViewportKeyframe,
  VideoRow,
  ViewportKeyframeRow,
  DrawingRow,
  AnnotationRow,
  SubstepTutorialRow,
  SubstepTutorialRow as SubstepReferenceRow,
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
  SAFETY_ICON_CATEGORIES,
  LEGACY_LEVEL_TO_ICON,
  LEGACY_LEVEL_TO_CATEGORY,
  NOTE_CATEGORY_STYLES,
} from './utils/safetyIcons';
export type { SafetyIconCategory } from './utils/safetyIcons';
export { SAFETY_ICON_MANIFEST, SAFETY_ICON_BY_FILENAME } from './utils/safetyIconManifest';
export type { SafetyIconEntry } from './utils/safetyIconManifest';

// Utils
export { resolveTutorialLabel, formatTutorialDisplay } from './utils/resolveTutorialLabel';
export { formatTutorialDisplayRich, type RichTutorialDisplay } from './utils/formatTutorialDisplayRich';

// Backwards-compatible aliases (old names → new names)
export {
  resolveTutorialLabel as resolveReferenceLabel,
  formatTutorialDisplay as formatReferenceDisplay,
} from './utils/resolveTutorialLabel';
export {
  formatTutorialDisplayRich as formatReferenceDisplayRich,
  type RichTutorialDisplay as RichReferenceDisplay,
} from './utils/formatTutorialDisplayRich';
