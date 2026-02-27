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
import { useEditorStore } from '../store';

/**
 * EditCallbacks matches the `editCallbacks` prop shape of InstructionView.
 * Defined here so editor-core consumers can type their overrides.
 */
export interface EditCallbacks {
  onEditImage?: (substepId: string) => void;
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
  onEditReference?: (referenceIndex: number, substepId: string) => void;
  onDeleteReference?: (referenceIndex: number, substepId: string) => void;
  onAddReference?: (substepId: string) => void;
  onEditPartTools?: (substepId: string) => void;
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

  const onDeleteReference = useCallback((refIdx: number, substepId: string) => {
    const store = useEditorStore.getState();
    const substep = store.data?.substeps[substepId];
    if (!substep) return;
    const refId = substep.referenceRowIds[refIdx];
    if (refId) {
      store.deleteSubstepReference(refId);
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

  return useMemo(() => ({
    onDeleteDescription,
    onDeleteNote,
    onDeleteSubstep,
    onDeleteImage,
    onDeleteReference,
    onDeletePartTool,
  }), [
    onDeleteDescription,
    onDeleteNote,
    onDeleteSubstep,
    onDeleteImage,
    onDeleteReference,
    onDeletePartTool,
  ]);
}
