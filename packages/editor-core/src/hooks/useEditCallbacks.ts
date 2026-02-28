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

import { useCallback, useMemo } from 'react';
import type { PartToolRow } from '@monta-vis/viewer-core';
import { useEditorStore } from '../store';
import { createDefaultPartTool } from '../utils/partToolHelpers';

/**
 * EditCallbacks matches the `editCallbacks` prop shape of InstructionView.
 * Defined here so editor-core consumers can type their overrides.
 */
export interface EditCallbacks {
  onDeleteImage?: (substepId: string) => void;
  onEditVideo?: (substepId: string) => void;
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
}

/**
 * Returns a partial EditCallbacks with direct store operations wired up.
 * Operations requiring UI (dialogs, pickers) are left undefined —
 * the app shell should merge its own handlers via spread.
 */
export function useEditCallbacks(): EditCallbacks {
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
  ]);
}
