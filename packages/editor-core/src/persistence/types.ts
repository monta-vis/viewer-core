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

export interface ImageUploadResult extends PersistenceResult {
  vfaId?: string;
}

export type ImageSource =
  | { type: 'path'; path: string }
  | { type: 'file'; file: File }
  | { type: 'blob'; blob: Blob; name: string };

export interface PersistenceAdapter {
  listProjects(): Promise<ProjectListItem[]>;
  getProjectData(projectId: string): Promise<unknown>;
  saveChanges(projectId: string, changes: ProjectChanges): Promise<PersistenceResult>;
  uploadPartToolImage?(projectId: string, partToolId: string, image: ImageSource): Promise<ImageUploadResult>;
  resolveMediaUrl(projectId: string, relativePath: string): string;
}
