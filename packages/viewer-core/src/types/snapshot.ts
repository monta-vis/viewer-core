/**
 * TypeScript types for instruction snapshots.
 *
 * These types match the backend InstructionSnapshot schema.
 */

// ============================================
// Meta
// ============================================

export interface SnapshotMeta {
  instruction_id: string;
  revision: number;
  generated_at: string;
  languages: string[];
  cdn_base_url: string;
}

// ============================================
// Core Entities
// ============================================

export interface SnapshotInstruction {
  id: string;
  name: string;
  description: string | null;
  article_number?: string | null;
  estimated_duration?: number | null;
  cover_image_area_id: string | null;
  source_language?: string;
  use_blurred?: boolean;
}

export interface SnapshotStep {
  id: string;
  instruction_id: string;
  title: string | null;
  step_number: number;
  substep_ids: string[];
  repeat_count?: number;
  repeat_label?: string | null;
}

export interface SnapshotSubstep {
  id: string;
  step_id: string;
  title: string | null;
  step_order: number;
  display_mode?: 'normal' | 'reference';
  repeat_count?: number;
  repeat_label?: string | null;
  image_row_ids: string[];
  video_section_row_ids: string[];
  part_tool_row_ids: string[];
  note_row_ids: string[];
  description_row_ids: string[];
  reference_row_ids?: string[];
}

// ============================================
// Video Entities
// ============================================

export interface SnapshotVideo {
  id: string;
  fps: number;
  order: number;
  viewport_keyframe_ids: string[];
  video_path?: string;
}

export interface SnapshotVideoSection {
  id: string;
  video_id: string;
  start_frame: number;
  end_frame: number;
  url_1080p: string;
  url_720p: string;
  url_480p: string;
}

export interface SnapshotVideoFrameArea {
  id: string;
  video_id: string | null;
  frame_number: number | null;
  image_id: string | null;
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
  type: string;
  url_1080p: string;
  url_720p: string;
  url_480p: string;
}

export interface SnapshotViewportKeyframe {
  id: string;
  video_id: string;
  frame_number: number;
  x: number;
  y: number;
  width: number;
  height: number;
  interpolation?: 'hold' | 'linear';
}

// ============================================
// Parts, Tools, Notes
// ============================================

export interface SnapshotNote {
  id: string;
  instruction_id: string;
  text: string;
  level: string;
  safety_icon_id?: string;
  safety_icon_category?: string;
}

export interface SnapshotSafetyIcon {
  id: string;
  filename: string;
  category: string;
  label: string;
  description: string;
}

export interface SnapshotPartTool {
  id: string;
  instruction_id: string;
  name: string;
  part_number: string | null;
  type: string;
  amount?: number;
  description?: string;
  unit?: string;
  material?: string;
  dimension?: string;
  icon_id?: string | null;
  icon_is_preview?: number;
}

// ============================================
// Images
// ============================================

export interface SnapshotImage {
  id: string;
  instruction_id: string;
  original_path: string | null;
  width: number | null;
  height: number | null;
  order: number;
}

// ============================================
// Drawings
// ============================================

export interface SnapshotDrawing {
  id: string;
  instruction_id: string | null;
  substep_image_id: string | null;
  substep_id: string | null;
  start_frame: number | null;
  end_frame: number | null;
  type: string;
  color: string;
  stroke_width: number | null;
  x1: number | null;
  y1: number | null;
  x2: number | null;
  y2: number | null;
  x: number | null;
  y: number | null;
  content: string | null;
  font_size: number | null;
  points: string | null;
  order: number;
}

// ============================================
// Relation Rows
// ============================================

export interface SnapshotSubstepImage {
  id: string;
  substep_id: string;
  video_frame_area_id: string;
  order: number;
}

export interface SnapshotSubstepVideoSection {
  id: string;
  substep_id: string | null;
  video_section_id: string | null;
  order: number;
}

export interface SnapshotSubstepPartTool {
  id: string;
  substep_id: string;
  part_tool_id: string;
  amount: number;
}

export interface SnapshotSubstepNote {
  id: string;
  substep_id: string;
  note_id: string;
}

export interface SnapshotSubstepDescription {
  id: string;
  substep_id: string;
  text: string;
  order: number;
}

export interface SnapshotSubstepReference {
  id: string;
  substep_id: string;
  target_type: 'step' | 'substep';
  target_id: string;
  source_instruction_id: string | null;
  order: number;
  source_language: string | null;
  kind?: 'see' | 'tutorial';
  label?: string | null;
}

export interface SnapshotPartToolVideoFrameArea {
  id: string;
  part_tool_id: string;
  video_frame_area_id: string;
  order: number;
  is_preview_image: number;
}

// ============================================
// Translations
// ============================================

export interface EntityTranslation {
  name?: string | null;
  description?: string | null;
  title?: string | null;
  text?: string | null;
  content?: string | null;
  repeat_label?: string | null;
  is_auto: boolean;
}

export interface SnapshotTranslations {
  instruction: Record<string, Record<string, EntityTranslation>>;
  steps: Record<string, Record<string, EntityTranslation>>;
  substeps: Record<string, Record<string, EntityTranslation>>;
  notes: Record<string, Record<string, EntityTranslation>>;
  partTools: Record<string, Record<string, EntityTranslation>>;
  substepDescriptions: Record<string, Record<string, EntityTranslation>>;
  drawings: Record<string, Record<string, EntityTranslation>>;
}

// ============================================
// Complete Snapshot
// ============================================

export interface InstructionSnapshot {
  meta: SnapshotMeta;
  instruction: SnapshotInstruction;
  translations: SnapshotTranslations;
  steps: Record<string, SnapshotStep>;
  substeps: Record<string, SnapshotSubstep>;
  videos: Record<string, SnapshotVideo>;
  videoSections: Record<string, SnapshotVideoSection>;
  videoFrameAreas: Record<string, SnapshotVideoFrameArea>;
  viewportKeyframes: Record<string, SnapshotViewportKeyframe>;
  images: Record<string, SnapshotImage>;
  drawings: Record<string, SnapshotDrawing>;
  notes: Record<string, SnapshotNote>;
  partTools: Record<string, SnapshotPartTool>;
  substepImages: Record<string, SnapshotSubstepImage>;
  substepVideoSections: Record<string, SnapshotSubstepVideoSection>;
  substepPartTools: Record<string, SnapshotSubstepPartTool>;
  substepNotes: Record<string, SnapshotSubstepNote>;
  substepDescriptions: Record<string, SnapshotSubstepDescription>;
  partToolVideoFrameAreas: Record<string, SnapshotPartToolVideoFrameArea>;
  substepReferences?: Record<string, SnapshotSubstepReference>;
  safetyIcons?: Record<string, SnapshotSafetyIcon>;
  branding?: Array<{ id: string; primary_color?: string; secondary_color?: string; default_theme?: string }>;
}
