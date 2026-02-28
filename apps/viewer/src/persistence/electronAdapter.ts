/**
 * ElectronPersistenceAdapter
 *
 * Implements PersistenceAdapter by delegating to window.electronAPI IPC calls.
 * Used in the Electron viewer-app.
 */

import { buildMediaUrl } from '@monta-vis/viewer-core';
import type {
  PersistenceAdapter,
  ProjectListItem,
  ProjectChanges,
  PersistenceResult,
  ImageUploadResult,
  CoverImageUploadResult,
  ImageSource,
  NormalizedCrop,
} from '@monta-vis/editor-core';

function getAPI() {
  if (!window.electronAPI) {
    throw new Error('Electron API not available');
  }
  return window.electronAPI;
}

export function createElectronAdapter(): PersistenceAdapter {
  return {
    async listProjects(): Promise<ProjectListItem[]> {
      const api = getAPI();
      const projects = await api.projects.list();
      return projects.map((p) => ({
        folderName: p.folderName,
        name: p.name,
        description: p.description,
        previewImagePath: p.coverImagePath,
      }));
    },

    async getProjectData(projectId: string): Promise<unknown> {
      const api = getAPI();
      return api.projects.getData(projectId);
    },

    async saveChanges(projectId: string, changes: ProjectChanges): Promise<PersistenceResult> {
      const api = getAPI();
      return api.projects.saveData(projectId, changes);
    },

    async uploadPartToolImage(
      projectId: string,
      partToolId: string,
      image: ImageSource,
      crop?: NormalizedCrop,
    ): Promise<ImageUploadResult> {
      const api = getAPI();
      if (image.type !== 'path') {
        return { success: false, error: 'Electron adapter only supports path-based images' };
      }
      return api.projects.uploadPartToolImage(projectId, partToolId, image.path, crop);
    },

    async uploadCoverImage(
      projectId: string,
      image: ImageSource,
      crop?: NormalizedCrop,
    ): Promise<CoverImageUploadResult> {
      const api = getAPI();
      if (image.type !== 'path') {
        return { success: false, error: 'Electron adapter only supports path-based images' };
      }
      return api.projects.uploadCoverImage(projectId, image.path, crop);
    },

    resolveMediaUrl(projectId: string, relativePath: string): string {
      return buildMediaUrl(projectId, relativePath);
    },
  };
}
