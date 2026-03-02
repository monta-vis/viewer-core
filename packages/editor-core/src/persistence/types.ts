/**
 * Persistence Adapter Interface
 *
 * Platform-agnostic interface for saving/loading instruction data.
 * Each platform (Electron, Browser+Python, React Native) provides its own
 * implementation of this interface.
 */

export interface ProjectListItem {
  folderName: string;
  name: string;
  description?: string | null;
  previewImagePath?: string | null;
}

export interface ProjectChanges {
  changed: Record<string, Record<string, unknown>[]>;
  deleted: Record<string, string[]>;
}

export interface PersistenceResult {
  success: boolean;
  error?: string;
}

export interface NormalizedCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageUploadResult extends PersistenceResult {
  vfaId?: string;
  junctionId?: string;
  isPreview?: boolean;
}

export type ImageSource =
  | { type: 'path'; path: string }
  | { type: 'file'; file: File }
  | { type: 'blob'; blob: Blob; name: string };

export interface CoverImageUploadResult extends PersistenceResult {
  vfaId?: string;
}

export interface SafetyIconCopyResult extends PersistenceResult {
  vfaId?: string;
}

export interface VideoUploadResult extends PersistenceResult {
  videoId?: string;
  sectionId?: string;
  substepVideoSectionId?: string;
  frameCount?: number;
  fps?: number;
  videoPath?: string;
}

export interface VideoUploadArgs {
  sourceVideoPath: string;
}

export interface PersistenceAdapter {
  listProjects(): Promise<ProjectListItem[]>;
  getProjectData(projectId: string): Promise<unknown>;
  saveChanges(projectId: string, changes: ProjectChanges): Promise<PersistenceResult>;
  uploadPartToolImage?(projectId: string, partToolId: string, image: ImageSource, crop?: NormalizedCrop): Promise<ImageUploadResult>;
  uploadCoverImage?(projectId: string, image: ImageSource, crop?: NormalizedCrop): Promise<CoverImageUploadResult>;
  uploadSubstepVideo?(projectId: string, substepId: string, args: VideoUploadArgs): Promise<VideoUploadResult>;
  /** Copy a safety icon from a catalog into the project's media folder and create a VFA row. */
  copySafetyIcon?(projectId: string, iconId: string): Promise<SafetyIconCopyResult>;
  resolveMediaUrl(projectId: string, relativePath: string): string;
}
