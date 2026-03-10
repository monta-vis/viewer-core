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
  SubstepImageUploadResult,
  StepPreviewUploadResult,
  CatalogIconCopyResult,
  VideoUploadResult,
  VideoUploadArgs,
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

    async copyCatalogIcon(
      projectId: string,
      catalogType: 'SafetyIcons' | 'PartToolIcons',
      iconId: string,
      entryId: string,
    ): Promise<CatalogIconCopyResult> {
      const api = getAPI();
      return api.projects.copyCatalogIcon(projectId, catalogType, iconId, entryId);
    },

    async uploadSubstepImage(
      projectId: string,
      substepId: string,
      image: ImageSource,
      crop?: NormalizedCrop,
    ): Promise<SubstepImageUploadResult> {
      const api = getAPI();
      if (image.type !== 'path') {
        console.warn('[electronAdapter.uploadSubstepImage] Only path-based images supported, got:', image.type);
        return { success: false, error: 'Electron adapter only supports path-based images' };
      }
      console.log('[electronAdapter.uploadSubstepImage] Calling IPC: project=%s, substep=%s', projectId, substepId);
      const result = await api.projects.uploadSubstepImage(projectId, substepId, image.path, crop);
      console.log('[electronAdapter.uploadSubstepImage] IPC result:', result);
      return result;
    },

    async uploadStepPreviewImage(
      projectId: string,
      stepId: string,
      image: ImageSource,
      crop?: NormalizedCrop,
    ): Promise<StepPreviewUploadResult> {
      const api = getAPI();
      if (image.type !== 'path') {
        console.warn('[electronAdapter.uploadStepPreviewImage] Only path-based images supported, got:', image.type);
        return { success: false, error: 'Electron adapter only supports path-based images' };
      }
      console.debug('[electronAdapter.uploadStepPreviewImage] Calling IPC: project=%s, step=%s', projectId, stepId);
      return api.projects.uploadStepPreviewImage(projectId, stepId, image.path, crop);
    },

    async uploadAssemblyPreviewImage(
      projectId: string,
      assemblyId: string,
      image: ImageSource,
      crop?: NormalizedCrop,
    ): Promise<StepPreviewUploadResult> {
      const api = getAPI();
      if (image.type !== 'path') {
        console.warn('[electronAdapter.uploadAssemblyPreviewImage] Only path-based images supported, got:', image.type);
        return { success: false, error: 'Electron adapter only supports path-based images' };
      }
      console.debug('[electronAdapter.uploadAssemblyPreviewImage] Calling IPC: project=%s, assembly=%s', projectId, assemblyId);
      return api.projects.uploadAssemblyPreviewImage(projectId, assemblyId, image.path, crop);
    },

    async uploadRepeatPreviewImage(
      projectId: string,
      substepId: string,
      image: ImageSource,
      crop?: NormalizedCrop,
    ): Promise<StepPreviewUploadResult> {
      const api = getAPI();
      if (image.type !== 'path') {
        console.warn('[electronAdapter.uploadRepeatPreviewImage] Only path-based images supported, got:', image.type);
        return { success: false, error: 'Electron adapter only supports path-based images' };
      }
      console.debug('[electronAdapter.uploadRepeatPreviewImage] Calling IPC: project=%s, substep=%s', projectId, substepId);
      return api.projects.uploadRepeatPreviewImage(projectId, substepId, image.path, crop);
    },

    async uploadSubstepVideo(
      projectId: string,
      substepId: string,
      args: VideoUploadArgs,
    ): Promise<VideoUploadResult> {
      const api = getAPI();
      return api.projects.uploadSubstepVideo(projectId, substepId, args);
    },

    resolveMediaUrl(projectId: string, relativePath: string): string {
      return buildMediaUrl(projectId, relativePath);
    },
  };
}
