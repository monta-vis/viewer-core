/**
 * useEditCallbacks
 *
 * Creates an EditCallbacks object from useEditorStore mutations.
 * App shells call this hook and pass the result to
 * <InstructionView editCallbacks={callbacks} />.
 *
 * Only includes "direct" store operations (delete, add simple entities).
 * Complex operations (edit dialogs, image upload) are left as undefined
 * for the app shell to provide its own UI.
 */

import { createElement, type ReactNode, useCallback, useMemo } from 'react';
import type { Assembly, PartToolRow } from '@monta-vis/viewer-core';
import { useEditorStore } from '../store';
import { createDefaultPartTool } from '../utils/partToolHelpers';
import { DraggableList } from '../components/DraggableList';
import { PreviewImageUploadButton } from '../components/PreviewImageUploadButton';
import type { PersistenceAdapter, NormalizedCrop, ImageSource } from '../persistence/types';

/**
 * EditCallbacks matches the `editCallbacks` prop shape of InstructionView.
 * Defined here so editor-core consumers can type their overrides.
 */
export interface EditCallbacks {
  onDeleteImage?: (substepId: string) => void;
  onDeleteVideo?: (substepId: string) => void;
  onEditDescription?: (descriptionId: string, substepId: string) => void;
  onDeleteDescription?: (descriptionId: string, substepId: string) => void;
  onAddDescription?: (substepId: string) => void;
  onEditNote?: (noteRowId: string, substepId: string) => void;
  onDeleteNote?: (noteRowId: string, substepId: string) => void;
  onAddNote?: (substepId: string) => void;
  onEditRepeat?: (substepId: string) => void;
  onEditTutorial?: (tutorialIndex: number, substepId: string) => void;
  onDeleteTutorial?: (tutorialIndex: number, substepId: string) => void;
  onAddTutorial?: (substepId: string) => void;
  onEditPartTools?: (substepId: string) => void;
  onUpdatePartTool?: (partToolId: string, updates: Partial<PartToolRow>) => void;
  onUpdateSubstepPartToolAmount?: (substepPartToolId: string, amount: number) => void;
  onAddSubstepPartTool?: (substepId: string) => void;
  onDeleteSubstepPartTool?: (substepPartToolId: string) => void;
  onDeleteSubstep?: (substepId: string) => void;
  onAddSubstep?: (stepId: string) => void;
  onReplacePartTool?: (oldPartToolId: string, newPartToolId: string) => void;
  onCreatePartTool?: (oldPartToolId: string, newName: string) => void;
  onEditPartToolAmount?: (partToolId: string, newAmount: string) => void;
  onEditPartToolImage?: (partToolId: string) => void;
  onDeletePartTool?: (partToolId: string) => void;
  onAddAssembly?: () => void;
  onDeleteAssembly?: (assemblyId: string) => void;
  onRenameAssembly?: (assemblyId: string, title: string) => void;
  onRenameStep?: (stepId: string, title: string) => void;
  onMoveStepToAssembly?: (stepId: string, assemblyId: string | null) => void;
  onReorderAssembly?: (assemblyId: string, newIndex: number) => void;
  renderAssemblyList?: (
    assemblies: Assembly[],
    renderAssembly: (assembly: Assembly) => ReactNode,
  ) => ReactNode;
  renderPreviewUpload?: (stepId: string) => ReactNode;
  renderAssemblyPreviewUpload?: (assemblyId: string) => ReactNode;
}

export interface UseEditCallbacksOptions {
  /** Persistence adapter for upload operations. */
  persistence?: PersistenceAdapter;
  /** Project identifier (e.g. folder name) for upload operations. */
  projectId?: string;
  /** Resolve a File to an ImageSource (e.g. path-based for Electron). Falls back to { type: 'file', file }. */
  resolveImageSource?: (file: File) => ImageSource | null;
}

/**
 * Returns a partial EditCallbacks with direct store operations wired up.
 * Operations requiring UI (dialogs, pickers) are left undefined —
 * the app shell should merge its own handlers via spread.
 */
export function useEditCallbacks(options?: UseEditCallbacksOptions): EditCallbacks {
  const { persistence, projectId, resolveImageSource } = options ?? {};
  const onDeleteDescription = useCallback((descId: string) => {
    useEditorStore.getState().deleteSubstepDescription(descId);
  }, []);

  const onDeleteNote = useCallback((noteRowId: string) => {
    const store = useEditorStore.getState();
    const substepNote = store.data?.substepNotes[noteRowId];
    if (!substepNote) return;
    store.deleteSubstepNote(noteRowId);
    store.deleteNote(substepNote.noteId);
  }, []);

  const onDeleteSubstep = useCallback((substepId: string) => {
    useEditorStore.getState().deleteSubstep(substepId);
  }, []);

  const onDeleteImage = useCallback((substepId: string) => {
    const store = useEditorStore.getState();
    const substep = store.data?.substeps[substepId];
    if (!substep) return;
    for (const imageId of substep.imageRowIds) {
      store.deleteSubstepImage(imageId);
    }
  }, []);

  const onDeleteTutorial = useCallback((refIdx: number, substepId: string) => {
    const store = useEditorStore.getState();
    const substep = store.data?.substeps[substepId];
    if (!substep) return;
    const refId = substep.tutorialRowIds[refIdx];
    if (refId) {
      store.deleteSubstepTutorial(refId);
    }
  }, []);

  const onDeletePartTool = useCallback((partToolId: string) => {
    const store = useEditorStore.getState();
    const sptRows = Object.values(store.data?.substepPartTools ?? {})
      .filter((spt) => spt.partToolId === partToolId);
    for (const spt of sptRows) {
      store.deleteSubstepPartTool(spt.id);
    }
  }, []);

  const onUpdatePartTool = useCallback((partToolId: string, updates: Partial<PartToolRow>) => {
    useEditorStore.getState().updatePartTool(partToolId, updates);
  }, []);

  const onUpdateSubstepPartToolAmount = useCallback((substepPartToolId: string, amount: number) => {
    useEditorStore.getState().updateSubstepPartTool(substepPartToolId, { amount });
  }, []);

  const onAddSubstepPartTool = useCallback((substepId: string) => {
    const store = useEditorStore.getState();
    const data = store.data;
    if (!data) return;
    const pt = createDefaultPartTool(data.currentVersionId, data.instructionId);
    store.addPartTool(pt);

    const substep = data.substeps[substepId];
    const maxOrder = substep
      ? substep.partToolRowIds.reduce((max, id) => {
          const spt = data.substepPartTools[id];
          return spt ? Math.max(max, spt.order) : max;
        }, 0)
      : 0;

    store.addSubstepPartTool({
      id: crypto.randomUUID(),
      versionId: data.currentVersionId,
      substepId,
      partToolId: pt.id,
      amount: 1,
      order: maxOrder + 1,
    });
  }, []);

  const onDeleteSubstepPartTool = useCallback((substepPartToolId: string) => {
    useEditorStore.getState().deleteSubstepPartTool(substepPartToolId);
  }, []);

  const onAddAssembly = useCallback(() => {
    const store = useEditorStore.getState();
    const data = store.data;
    if (!data) return;
    const assemblies = Object.values(data.assemblies);
    const maxOrder = assemblies.reduce((max, a) => Math.max(max, a.order), 0);
    store.addAssembly({
      id: crypto.randomUUID(),
      versionId: data.currentVersionId,
      instructionId: data.instructionId,
      title: null,
      description: null,
      order: maxOrder + 1,
      videoFrameAreaId: null,
      stepIds: [],
    });
  }, []);

  const onDeleteAssembly = useCallback((assemblyId: string) => {
    useEditorStore.getState().deleteAssembly(assemblyId);
  }, []);

  const onRenameAssembly = useCallback((assemblyId: string, title: string) => {
    useEditorStore.getState().updateAssembly(assemblyId, { title: title || null });
  }, []);

  const onRenameStep = useCallback((stepId: string, title: string) => {
    useEditorStore.getState().updateStep(stepId, { title: title || null });
  }, []);

  const onMoveStepToAssembly = useCallback((stepId: string, assemblyId: string | null) => {
    useEditorStore.getState().assignStepToAssembly(stepId, assemblyId);
  }, []);

  const onReorderAssembly = useCallback((assemblyId: string, newIndex: number) => {
    useEditorStore.getState().reorderAssembly(assemblyId, newIndex);
  }, []);

  const renderAssemblyList = useCallback(
    (assemblies: Assembly[], renderAssembly: (assembly: Assembly) => ReactNode) =>
      createElement(DraggableList<Assembly>, {
        items: assemblies,
        getItemId: (a: Assembly) => a.id,
        onReorder: (id: string, newIndex: number) => {
          useEditorStore.getState().reorderAssembly(id, newIndex);
        },
        renderItem: (assembly: Assembly) => renderAssembly(assembly),
        className: 'flex flex-col gap-6',
      }),
    [],
  );

  const canUploadStep = !!(persistence?.uploadStepPreviewImage && projectId);
  const canUploadAssembly = !!(persistence?.uploadAssemblyPreviewImage && projectId);

  /** Shared upload logic for step/assembly preview images. */
  const handlePreviewUpload = useCallback(
    (
      entityId: string,
      file: File,
      crop: NormalizedCrop,
      uploadFn: (pid: string, eid: string, src: ImageSource, crop: NormalizedCrop) => Promise<{ success: boolean; vfaId?: string; error?: string }>,
      updateEntity: (store: ReturnType<typeof useEditorStore.getState>, entityId: string, vfaId: string) => void,
      logPrefix: string,
    ) => {
      const imageSource = resolveImageSource ? resolveImageSource(file) : { type: 'file' as const, file };
      if (!imageSource) return;
      uploadFn(projectId!, entityId, imageSource, crop)
        .then((result) => {
          if (!result.success) {
            console.error(`[useEditCallbacks.${logPrefix}] Upload failed:`, result.error);
            return;
          }
          if (!result.vfaId) {
            console.warn(`[useEditCallbacks.${logPrefix}] Upload succeeded but no vfaId returned`);
            return;
          }
          const store = useEditorStore.getState();
          const versionId = store.data?.currentVersionId ?? '';
          store.addVideoFrameArea({
            id: result.vfaId,
            versionId,
            videoId: null,
            frameNumber: null,
            x: crop.x,
            y: crop.y,
            width: crop.width,
            height: crop.height,
            type: 'PreviewImage',
            localPath: persistence!.resolveMediaUrl(projectId!, `media/frames/${result.vfaId}/image`),
          });
          updateEntity(store, entityId, result.vfaId);
        })
        .catch((err: unknown) => {
          console.error(`[useEditCallbacks.${logPrefix}] Upload error:`, err);
        });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [persistence, projectId, resolveImageSource],
  );

  const renderPreviewUpload = useCallback(
    (stepId: string): ReactNode =>
      createElement(PreviewImageUploadButton, {
        variant: 'thumbnail',
        onUpload: (file: File, crop: NormalizedCrop) => {
          handlePreviewUpload(
            stepId, file, crop,
            persistence!.uploadStepPreviewImage!,
            (store, id, vfaId) => store.updateStep(id, { videoFrameAreaId: vfaId }),
            'renderPreviewUpload',
          );
        },
      }),
    [handlePreviewUpload, persistence],
  );

  const renderAssemblyPreviewUpload = useCallback(
    (assemblyId: string): ReactNode =>
      createElement(PreviewImageUploadButton, {
        variant: 'inline',
        onUpload: (file: File, crop: NormalizedCrop) => {
          handlePreviewUpload(
            assemblyId, file, crop,
            persistence!.uploadAssemblyPreviewImage!,
            (store, id, vfaId) => store.updateAssembly(id, { videoFrameAreaId: vfaId }),
            'renderAssemblyPreviewUpload',
          );
        },
      }),
    [handlePreviewUpload, persistence],
  );

  return useMemo(() => ({
    onDeleteDescription,
    onDeleteNote,
    onDeleteSubstep,
    onDeleteImage,
    onDeleteTutorial,
    onDeletePartTool,
    onUpdatePartTool,
    onUpdateSubstepPartToolAmount,
    onAddSubstepPartTool,
    onDeleteSubstepPartTool,
    onAddAssembly,
    onDeleteAssembly,
    onRenameAssembly,
    onRenameStep,
    onMoveStepToAssembly,
    onReorderAssembly,
    renderAssemblyList,
    renderPreviewUpload: canUploadStep ? renderPreviewUpload : undefined,
    renderAssemblyPreviewUpload: canUploadAssembly ? renderAssemblyPreviewUpload : undefined,
  }), [
    onDeleteDescription,
    onDeleteNote,
    onDeleteSubstep,
    onDeleteImage,
    onDeleteTutorial,
    onDeletePartTool,
    onUpdatePartTool,
    onUpdateSubstepPartToolAmount,
    onAddSubstepPartTool,
    onDeleteSubstepPartTool,
    onAddAssembly,
    onDeleteAssembly,
    onRenameAssembly,
    onRenameStep,
    onMoveStepToAssembly,
    onReorderAssembly,
    renderAssemblyList,
    canUploadStep,
    canUploadAssembly,
    renderPreviewUpload,
    renderAssemblyPreviewUpload,
  ]);
}
