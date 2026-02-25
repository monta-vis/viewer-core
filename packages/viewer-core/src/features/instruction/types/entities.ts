/**
 * Instruction Entity Types
 * Matches backend SQLAlchemy models
 */

// ============================================
// Core Entities
// ============================================

export interface Instruction {
  id: string;
  companyId: string | null;
  name: string;
  description: string | null;
  previewImageId: string | null;
  coverImageAreaId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Version {
  id: string;
  instructionId: string;
  userId: string | null;
  versionNumber: number;
  createdAt: string;
  updatedAt: string;
}

export interface Step {
  id: string;
  versionId: string;
  instructionId: string;
  assemblyId: string | null;
  stepNumber: number;
  title: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Substep {
  id: string;
  versionId: string;
  stepId: string;
  stepOrder: number;
  creationOrder: number;
  title: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Video Entities
// ============================================

export type ProxyStatus = 'Pending' | 'Processing' | 'Completed' | 'Failed' | 'NotNeeded';

export interface Video {
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
  createdAt: string;
  updatedAt: string;
}

export interface VideoSection {
  id: string;
  versionId: string;
  videoId: string;
  startFrame: number;
  endFrame: number;
  localPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export type VideoFrameAreaType =
  | 'SubstepImage'
  | 'PreviewImage'
  | 'PartToolScan'
  | 'TextScan'
  | 'CodeScan'
  | 'Viewport';

export interface VideoFrameArea {
  id: string;
  versionId: string;
  videoId: string | null;
  frameNumber: number | null;
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
  type: VideoFrameAreaType;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Content Entities
// ============================================

export type PartToolType = 'Part' | 'Tool';

export interface PartTool {
  id: string;
  versionId: string;
  instructionId: string;
  orderId: string | null;
  userId: string | null;
  previewImageId: string | null;
  name: string;
  type: PartToolType;
  partNumber: string | null;
  amount: number;
  description: string | null;
  unit: string | null;
  material: string | null;
  dimension: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NoteLevel = 'Info' | 'Quality' | 'Warning' | 'Critical';

export interface Note {
  id: string;
  versionId: string;
  text: string;
  level: NoteLevel;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  versionId: string;
  stepId: string | null;
  substepId: string | null;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface Drawing {
  id: string;
  substepImageId: string;
  versionId: string;
  type: string;
  color: string;
  strokeWidth: number | null;
  x1: number | null;
  y1: number | null;
  x2: number | null;
  y2: number | null;
  x: number | null;
  y: number | null;
  content: string | null;
  fontSize: number | null;
  points: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Junction/Relation Entities
// ============================================

export interface SubstepPartTool {
  id: string;
  versionId: string;
  substepId: string;
  partToolId: string;
  amount: number;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubstepNote {
  id: string;
  versionId: string;
  substepId: string;
  noteId: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubstepDescription {
  id: string;
  versionId: string;
  substepId: string;
  text: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubstepVideoSection {
  id: string;
  versionId: string;
  substepId: string | null;
  videoSectionId: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubstepVideoFrameArea {
  id: string;
  versionId: string;
  substepId: string;
  videoFrameAreaId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubstepImageRow {
  id: string;
  versionId: string;
  videoFrameAreaId: string;
  substepId: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface StepPartTool {
  id: string;
  versionId: string;
  stepId: string;
  partToolId: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface StepNote {
  id: string;
  versionId: string;
  stepId: string;
  noteId: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface PartToolVideoFrameArea {
  id: string;
  versionId: string;
  partToolId: string;
  videoFrameAreaId: string;
  order: number;
  isPreviewImage: boolean;
  createdAt: string;
  updatedAt: string;
}
