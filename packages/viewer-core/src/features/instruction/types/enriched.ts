/**
 * Enriched Entity Types
 *
 * Base entities extended with grouped relation IDs.
 * These are grouped once during loading and make
 * accessing related data straightforward.
 */

// --- Shape Types (shared between instruction + video-overlay) ---

/** Shape types for annotations and drawings */
export type ShapeType = 'arrow' | 'circle' | 'rectangle' | 'text' | 'freehand';

/** Shape colors */
export type ShapeColor = 'teal' | 'yellow' | 'red' | 'blue' | 'green' | 'orange' | 'purple' | 'black' | 'white';

// --- Base DB Row Types (from API) ---

export interface SubstepRow {
  id: string;
  versionId: string;
  stepId: string | null;  // null = unassigned substep (not yet assigned to a step)
  stepOrder: number;
  creationOrder: number;
  title: string | null;
  description: string | null;
  displayMode: 'normal' | 'tutorial';
  repeatCount: number;        // default 1 — "do N times" badge
  repeatLabel: string | null; // e.g. "left & right", "all 4 corners"
}

export interface StepRow {
  id: string;
  versionId: string;
  instructionId: string;
  assemblyId: string | null;
  stepNumber: number;
  title: string | null;
  description: string | null;
  repeatCount: number;        // default 1 — "repeat entire step N times"
  repeatLabel: string | null; // e.g. "left & right"
}

export interface AssemblyRow {
  id: string;
  versionId: string;
  instructionId: string;
  title: string | null;
  description: string | null;
  order: number;
  previewImageId: string | null;
}

export type ProxyStatus = 'Pending' | 'Processing' | 'Completed' | 'Failed' | 'NotNeeded';

export interface VideoRow {
  id: string;
  instructionId: string;
  orderId: string;
  userId: string | null;
  videoPath: string;
  fps: number;
  order: number;
  proxyStatus: ProxyStatus;
  width: number | null;
  height: number | null;
}

/**
 * Viewport keyframe for Ken Burns effect (pan & zoom animation)
 *
 * Keyframes are per-Video (not per-VideoSection) with absolute frame numbers.
 * Each video always has at least one keyframe at frame 0 (cannot be deleted).
 * All values are normalized (0.0-1.0) relative to video dimensions.
 */
export interface ViewportKeyframeRow {
  id: string;
  videoId: string;      // Changed from videoSectionId - keyframes are now per-Video
  versionId: string;    // Added for version tracking
  frameNumber: number;  // Absolute video frame (not relative to section)
  x: number;            // 0.0-1.0 normalized (default: 0.5 = centered)
  y: number;            // 0.0-1.0 normalized (default: 0.5 = centered)
  width: number;        // 0.0-1.0 normalized (default: 0.5 = 50% zoom)
  height: number;       // 0.0-1.0 normalized (default: 0.5 = 50% zoom)
  interpolation?: 'hold' | 'linear';  // How to arrive from previous KF (default: 'hold')
}

/**
 * Viewport keyframe values for interpolation (without IDs)
 */
export interface ViewportKeyframe {
  x: number;      // Left edge position (0-100%)
  y: number;      // Top edge position (0-100%)
  width: number;  // Viewport width (0-100%)
  height: number; // Viewport height (0-100%)
}

export interface VideoSectionRow {
  id: string;
  versionId: string;
  videoId: string;
  startFrame: number;
  endFrame: number;
  localPath: string | null;
}

export interface VideoFrameAreaRow {
  id: string;
  versionId: string;
  videoId: string | null;
  frameNumber: number | null;
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
  type: 'SubstepImage' | 'PreviewImage' | 'PartToolScan' | 'TextScan' | 'CodeScan' | 'Viewport';
  /** Pre-exported image URL (for standalone/snapshot mode) */
  localPath?: string | null;
}

export interface SubstepImageRow {
  id: string;
  versionId: string;
  videoFrameAreaId: string;
  substepId: string;
  order: number;
}

export interface PartToolRow {
  id: string;
  versionId: string;
  instructionId: string;
  previewImageId: string | null;
  name: string;
  type: 'Part' | 'Tool';
  partNumber: string | null;
  amount: number;
  description: string | null;
  unit: string | null;
  material: string | null;
  dimension: string | null;
  /** @deprecated Kept for backwards compat with editor writes; not used in resolution */
  iconId: string | null;
  /** @deprecated Kept for backwards compat with editor writes; not used in resolution */
  iconIsPreview?: boolean;
}

export interface NoteRow {
  id: string;
  versionId: string;
  instructionId: string;
  text: string;
  level: 'Info' | 'Quality' | 'Warning' | 'Critical';
  safetyIconId: string | null;
  safetyIconCategory: string | null;
}

export interface SafetyIconRow {
  id: string;
  filename: string;
  category: string;
  label: string;
  description: string;
}

export interface SubstepPartToolRow {
  id: string;
  versionId: string;
  substepId: string;
  partToolId: string;
  amount: number;
  order: number;
}

export interface SubstepNoteRow {
  id: string;
  versionId: string;
  substepId: string;
  noteId: string;
  order: number;
}

export interface SubstepDescriptionRow {
  id: string;
  versionId: string;
  substepId: string;
  text: string;
  order: number;
}

export interface SubstepTutorialRow {
  id: string;
  versionId: string;
  substepId: string;
  targetType: 'step' | 'substep' | 'tutorial';
  targetId: string;
  sourceInstructionId: string | null;
  order: number;
  sourceLanguage: string | null;
  kind: 'see' | 'tutorial';
  label: string | null;
}

export interface SubstepVideoSectionRow {
  id: string;
  versionId: string;
  substepId: string | null;
  videoSectionId: string | null;
  order: number;
}

export interface PartToolVideoFrameAreaRow {
  id: string;
  versionId: string;
  partToolId: string;
  videoFrameAreaId: string;
  order: number;
  isPreviewImage: boolean;
}

/**
 * Drawing on a substep image or video section.
 *
 * Two types:
 * - Image Drawing: substepImageId is set (static image)
 * - Video Drawing: substepId + startFrame + endFrame are set (video section)
 */
export interface DrawingRow {
  id: string;
  versionId: string;

  // For Image Drawings (one of these must be set)
  substepImageId: string | null;

  // For Video Drawings
  substepId: string | null;
  startFrame: number | null;        // Percentage (0-100) of substep video duration
  endFrame: number | null;          // Percentage (0-100) of substep video duration

  // Drawing properties
  type: ShapeType;                  // arrow, circle, rectangle, text, freehand
  color: ShapeColor | string;
  strokeWidth: number | null;
  x1: number | null;
  y1: number | null;
  x2: number | null;
  y2: number | null;
  x: number | null;
  y: number | null;
  content: string | null;           // Text content
  fontSize: number | null;
  points: string | null;            // JSON array for freehand
  order: number;
}

// Helper functions to distinguish drawing types
export function isImageDrawing(d: DrawingRow): boolean {
  return d.substepImageId !== null;
}

export function isVideoDrawing(d: DrawingRow): boolean {
  return d.substepId !== null && d.startFrame !== null && d.endFrame !== null;
}

// --- Enriched Types (with grouped relation IDs) ---

/**
 * Step with grouped Substep IDs
 */
export interface Step extends StepRow {
  substepIds: string[];
}

/**
 * Assembly with grouped Step IDs
 */
export interface Assembly extends AssemblyRow {
  stepIds: string[];
}

/**
 * Substep with all related element IDs.
 * Access is straightforward: substep.imageRowIds.map(id => dict[id])
 */
export interface Substep extends SubstepRow {
  imageRowIds: string[];           // -> SubstepImageRow
  videoSectionRowIds: string[];    // -> SubstepVideoSectionRow
  partToolRowIds: string[];        // -> SubstepPartToolRow
  noteRowIds: string[];            // -> SubstepNoteRow
  descriptionRowIds: string[];     // -> SubstepDescriptionRow
  tutorialRowIds: string[];       // -> SubstepTutorialRow
}

/**
 * Video with Section, Area, and ViewportKeyframe IDs
 */
export interface Video extends VideoRow {
  sectionIds: string[];
  frameAreaIds: string[];         // Direct reference to VideoFrameAreas
  viewportKeyframeIds: string[];  // Per-Video viewport keyframes for Ken Burns effect
}

// --- Enriched Junction Types (for display) ---

/**
 * SubstepImage enriched with VideoFrameArea data.
 * videoId and frameNumber come directly from the area.
 */
export interface EnrichedSubstepImage extends SubstepImageRow {
  area: VideoFrameAreaRow;
}

/**
 * SubstepPartTool enriched with PartTool data
 */
export interface EnrichedSubstepPartTool extends SubstepPartToolRow {
  partTool: PartToolRow;
}

/**
 * SubstepNote enriched with Note data
 */
export interface EnrichedSubstepNote extends SubstepNoteRow {
  note: NoteRow;
}

/**
 * SubstepVideoSection enriched with VideoSection data
 */
export interface EnrichedSubstepVideoSection extends SubstepVideoSectionRow {
  videoSection: VideoSectionRow;
}
