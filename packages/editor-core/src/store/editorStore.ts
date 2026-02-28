import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';

// Enable Map and Set support in Immer (required for change tracking with Sets)
enableMapSet();

import {
  type Step,
  type Substep,
  type Assembly,
  type Video,
  type SubstepImageRow,
  type SubstepPartToolRow,
  type SubstepNoteRow,
  type SubstepDescriptionRow,
  type SubstepTutorialRow,
  type SubstepVideoSectionRow,
  type VideoFrameAreaRow,
  type VideoSectionRow,
  type ViewportKeyframeRow,
  type PartToolRow,
  type NoteRow,
  type PartToolVideoFrameAreaRow,
  type DrawingRow,
  type InstructionData,
} from '@monta-vis/viewer-core';
import { v4 as uuidv4 } from 'uuid';
import type { EventRecordCallback, StepLoadingState, StepChunkData } from '../types';

// ============================================
// Types
// ============================================

interface ChangeTracking {
  changed: Set<string>;
  deleted: Set<string>;
}

/** Config entry for element-type dispatch in reorder/move actions */
interface SubstepElementConfig {
  dict: Record<string, { substepId: string; order?: number }>;
  changes: ChangeTracking;
  getSubstepIds: (substep: Substep) => string[];
  filterFn?: (id: string) => boolean;
}

/** Build dispatch config for substep element types. Used by reorder and move actions. */
function buildSubstepElementConfig(
  data: InstructionData,
  changes: StoreState['changes'],
  opts?: { withPartToolFilter: boolean },
): Record<string, SubstepElementConfig> {
  const base: Record<string, SubstepElementConfig> = {
    image: {
      dict: data.substepImages as Record<string, { substepId: string; order?: number }>,
      changes: changes.substepImages,
      getSubstepIds: (substep: Substep) => substep.imageRowIds,
    },
    video: {
      dict: data.substepVideoSections as Record<string, { substepId: string; order?: number }>,
      changes: changes.substepVideoSections,
      getSubstepIds: (substep: Substep) => substep.videoSectionRowIds,
    },
    part: {
      dict: data.substepPartTools as Record<string, { substepId: string; order?: number }>,
      changes: changes.substepPartTools,
      getSubstepIds: (substep: Substep) => substep.partToolRowIds,
    },
    tool: {
      dict: data.substepPartTools as Record<string, { substepId: string; order?: number }>,
      changes: changes.substepPartTools,
      getSubstepIds: (substep: Substep) => substep.partToolRowIds,
    },
    description: {
      dict: data.substepDescriptions as Record<string, { substepId: string; order?: number }>,
      changes: changes.substepDescriptions,
      getSubstepIds: (substep: Substep) => substep.descriptionRowIds,
    },
    note: {
      dict: data.substepNotes as Record<string, { substepId: string; order?: number }>,
      changes: changes.substepNotes,
      getSubstepIds: (substep: Substep) => substep.noteRowIds,
    },
  };

  if (opts?.withPartToolFilter) {
    base.part.filterFn = (id: string) => {
      const row = data.substepPartTools[id];
      const partTool = row ? data.partTools[row.partToolId] : null;
      return partTool?.type === 'Part';
    };
    base.tool.filterFn = (id: string) => {
      const row = data.substepPartTools[id];
      const partTool = row ? data.partTools[row.partToolId] : null;
      return partTool?.type === 'Tool';
    };
  }

  return base;
}

interface StoreState {
  data: InstructionData | null;
  lastSavedData: InstructionData | null;  // Snapshot of data at last load/save
  isLoading: boolean;
  error: string | null;

  // Progressive step loading state
  stepLoadingState: StepLoadingState | null;

  // Instruction-level change tracking (single entity, not Record)
  instructionChanged: boolean;

  // Event recording callback for sync (set by useEventRecording hook)
  onEventRecord: EventRecordCallback | null;

  changes: {
    assemblies: ChangeTracking;
    steps: ChangeTracking;
    substeps: ChangeTracking;
    videoSections: ChangeTracking;
    videoFrameAreas: ChangeTracking;
    viewportKeyframes: ChangeTracking;
    partTools: ChangeTracking;
    notes: ChangeTracking;
    substepImages: ChangeTracking;
    substepPartTools: ChangeTracking;
    substepNotes: ChangeTracking;
    substepDescriptions: ChangeTracking;
    substepVideoSections: ChangeTracking;
    partToolVideoFrameAreas: ChangeTracking;
    drawings: ChangeTracking;
    substepTutorials: ChangeTracking;
  };
}

interface StoreActions {
  setData(data: InstructionData): void;
  restoreData(data: InstructionData): void;
  setLoading(loading: boolean): void;
  setError(error: string | null): void;
  reset(): void;

  // Event recording for sync
  setEventRecordCallback(callback: EventRecordCallback | null): void;

  // Instruction
  updateInstructionName(name: string): void;
  updateInstructionDescription(description: string | null): void;
  updateInstructionPreviewImageId(imageId: string | null): void;
  updateCoverImageAreaId(areaId: string | null): void;
  updateArticleNumber(articleNumber: string | null): void;
  updateEstimatedDuration(minutes: number | null): void;

  // Assemblies
  addAssembly(assembly: Assembly): void;
  updateAssembly(id: string, updates: Partial<Assembly>): void;
  deleteAssembly(id: string): void;

  // Steps
  addStep(step: Step): void;
  updateStep(id: string, updates: Partial<Step>): void;
  batchUpdateSteps(updates: Array<{ id: string; changes: Partial<Step> }>): void;
  deleteStep(id: string): void;

  // Assignment actions
  assignStepToAssembly(stepId: string, assemblyId: string | null): void;
  assignSubstepToStep(substepId: string, stepId: string | null): void;

  // Substeps
  addSubstep(substep: Substep): void;
  updateSubstep(id: string, updates: Partial<Substep>): void;
  batchUpdateSubsteps(updates: Array<{ id: string; changes: Partial<Substep> }>): void;
  deleteSubstep(id: string): void;

  // Videos
  updateVideo(id: string, updates: Partial<Video>): void;

  // VideoFrameAreas
  addVideoFrameArea(area: VideoFrameAreaRow): void;
  updateVideoFrameArea(id: string, updates: Partial<VideoFrameAreaRow>): void;
  deleteVideoFrameArea(id: string): void;

  // SubstepImages
  addSubstepImage(row: SubstepImageRow): void;
  updateSubstepImage(id: string, updates: Partial<SubstepImageRow>): void;
  deleteSubstepImage(id: string): void;

  // SubstepDescriptions
  addSubstepDescription(row: SubstepDescriptionRow): void;
  updateSubstepDescription(id: string, updates: Partial<SubstepDescriptionRow>): void;
  deleteSubstepDescription(id: string): void;

  // PartTools
  addPartTool(partTool: PartToolRow): void;
  updatePartTool(id: string, updates: Partial<PartToolRow>): void;
  deletePartTool(id: string): void;

  // SubstepPartTools
  addSubstepPartTool(row: SubstepPartToolRow): void;
  updateSubstepPartTool(id: string, updates: Partial<SubstepPartToolRow>): void;
  deleteSubstepPartTool(id: string): void;

  // Notes
  addNote(note: NoteRow): void;
  updateNote(id: string, updates: Partial<NoteRow>): void;
  deleteNote(id: string): void;

  // SubstepNotes
  addSubstepNote(row: SubstepNoteRow): void;
  updateSubstepNote(id: string, updates: Partial<SubstepNoteRow>): void;
  deleteSubstepNote(id: string): void;

  // VideoSections
  addVideoSection(section: VideoSectionRow): void;
  updateVideoSection(id: string, updates: Partial<VideoSectionRow>): void;
  deleteVideoSection(id: string): void;
  splitVideoSection(sectionId: string, splitFrame: number): string | null;

  // SubstepVideoSections
  addSubstepVideoSection(row: SubstepVideoSectionRow): void;
  updateSubstepVideoSection(id: string, updates: Partial<SubstepVideoSectionRow>): void;
  deleteSubstepVideoSection(id: string): void;

  // PartToolVideoFrameAreas
  addPartToolVideoFrameArea(row: PartToolVideoFrameAreaRow): void;
  deletePartToolVideoFrameArea(id: string): void;
  updatePartToolVideoFrameArea(id: string, updates: Partial<PartToolVideoFrameAreaRow>): void;


  // Drawings
  addDrawing(drawing: DrawingRow): void;
  updateDrawing(id: string, updates: Partial<DrawingRow>): void;
  deleteDrawing(id: string): void;

  // SubstepTutorials
  addSubstepTutorial(row: SubstepTutorialRow): void;
  updateSubstepTutorial(id: string, updates: Partial<SubstepTutorialRow>): void;
  deleteSubstepTutorial(id: string): void;

  // ViewportKeyframes (per-Video, not per-Section)
  addViewportKeyframe(keyframe: ViewportKeyframeRow): void;
  updateViewportKeyframe(id: string, updates: Partial<ViewportKeyframeRow>): void;
  deleteViewportKeyframe(id: string): void;

  // Reorder substep elements
  reorderSubstepElement(
    elementId: string,
    newIndex: number,
    type: 'image' | 'video' | 'part' | 'tool' | 'description' | 'note'
  ): void;

  // Move element to a different substep
  moveSubstepElement(
    elementId: string,
    newSubstepId: string,
    type: 'image' | 'video' | 'part' | 'tool' | 'description' | 'note'
  ): void;

  // Change tracking
  hasChanges(): boolean;
  getChangedData(): { changed: Record<string, Record<string, unknown>[]>; deleted: Record<string, string[]> };
  clearChanges(): void;

  // Progressive step loading
  setStepLoadingState(state: StepLoadingState | null): void;
  appendSteps(chunk: StepChunkData): void;
}

// ============================================
// Initial State
// ============================================

const createEmptyTracking = (): ChangeTracking => ({
  changed: new Set(),
  deleted: new Set(),
});

const initialChanges = () => ({
  assemblies: createEmptyTracking(),
  steps: createEmptyTracking(),
  substeps: createEmptyTracking(),
  videoSections: createEmptyTracking(),
  videoFrameAreas: createEmptyTracking(),
  viewportKeyframes: createEmptyTracking(),
  partTools: createEmptyTracking(),
  notes: createEmptyTracking(),
  substepImages: createEmptyTracking(),
  substepPartTools: createEmptyTracking(),
  substepNotes: createEmptyTracking(),
  substepDescriptions: createEmptyTracking(),
  substepVideoSections: createEmptyTracking(),
  partToolVideoFrameAreas: createEmptyTracking(),
  drawings: createEmptyTracking(),
  substepTutorials: createEmptyTracking(),
});

const initialState: StoreState = {
  data: null,
  lastSavedData: null,
  isLoading: false,
  error: null,
  stepLoadingState: null,
  instructionChanged: false,
  onEventRecord: null,
  changes: initialChanges(),
};

// ============================================
// Store
// ============================================

export const useEditorStore = create<StoreState & StoreActions>()(
  immer((set, get) => ({
    ...initialState,

    setData: (data) => {
      set((s) => {
        s.data = data;
        s.lastSavedData = data;
        s.isLoading = false;
        s.error = null;
        s.instructionChanged = false;
        s.changes = initialChanges();
      });
    },

    restoreData: (data) => {
      // Read lastSavedData outside the Immer draft to get frozen objects
      const saved = get().lastSavedData;

      set((s) => {
        s.data = data;
        if (!saved) {
          s.instructionChanged = true;
          s.changes = initialChanges();
          return;
        }

        // Instruction-level diff
        s.instructionChanged = (
          data.instructionName !== saved.instructionName ||
          data.instructionDescription !== saved.instructionDescription ||
          data.instructionPreviewImageId !== saved.instructionPreviewImageId ||
          data.coverImageAreaId !== saved.coverImageAreaId ||
          data.articleNumber !== saved.articleNumber ||
          data.estimatedDuration !== saved.estimatedDuration
        );

        // Entity-level diff: reference equality (Immer structural sharing)
        const entityKeys = [
          'assemblies', 'steps', 'substeps', 'videoSections', 'videoFrameAreas',
          'viewportKeyframes', 'partTools', 'notes', 'substepImages', 'substepPartTools',
          'substepNotes', 'substepDescriptions', 'substepVideoSections',
          'partToolVideoFrameAreas', 'drawings', 'substepTutorials',
        ] as const;

        for (const key of entityKeys) {
          const currentDict = data[key] as Record<string, unknown>;
          const savedDict = saved[key] as Record<string, unknown>;
          const tracking = s.changes[key];
          tracking.changed.clear();
          tracking.deleted.clear();

          for (const id of Object.keys(currentDict)) {
            if (!savedDict[id] || currentDict[id] !== savedDict[id]) {
              tracking.changed.add(id);
            }
          }
          for (const id of Object.keys(savedDict)) {
            if (!currentDict[id]) {
              tracking.deleted.add(id);
            }
          }
        }
      });
    },

    setLoading: (loading) => set((s) => { s.isLoading = loading; }),
    setError: (error) => set((s) => { s.error = error; s.isLoading = false; }),
    reset: () => set(initialState),

    // Event recording for sync
    setEventRecordCallback: (callback) => set((s) => { s.onEventRecord = callback; }),

    // Instruction
    updateInstructionName: (name) => set((s) => {
      if (!s.data) return;
      s.data.instructionName = name;
      s.instructionChanged = true;
    }),

    updateInstructionDescription: (description) => set((s) => {
      if (!s.data) return;
      s.data.instructionDescription = description;
      s.instructionChanged = true;
    }),

    updateInstructionPreviewImageId: (imageId) => set((s) => {
      if (!s.data) return;
      s.data.instructionPreviewImageId = imageId;
      s.instructionChanged = true;
    }),

    updateCoverImageAreaId: (areaId) => set((s) => {
      if (!s.data) return;
      s.data.coverImageAreaId = areaId;
      s.instructionChanged = true;
    }),

    updateArticleNumber: (articleNumber) => set((s) => {
      if (!s.data) return;
      s.data.articleNumber = articleNumber;
      s.instructionChanged = true;
    }),

    updateEstimatedDuration: (minutes) => set((s) => {
      if (!s.data) return;
      s.data.estimatedDuration = minutes;
      s.instructionChanged = true;
    }),

    // Assemblies
    addAssembly: (assembly) => set((s) => {
      if (!s.data) return;
      s.data.assemblies[assembly.id] = assembly;
      s.changes.assemblies.changed.add(assembly.id);
    }),

    updateAssembly: (id, updates) => set((s) => {
      if (!s.data?.assemblies[id]) return;
      Object.assign(s.data.assemblies[id], updates);
      s.changes.assemblies.changed.add(id);
    }),

    deleteAssembly: (id) => set((s) => {
      if (!s.data?.assemblies[id]) return;
      // Unassign all steps from this assembly
      const assembly = s.data.assemblies[id];
      for (const stepId of assembly.stepIds) {
        if (s.data.steps[stepId]) {
          s.data.steps[stepId].assemblyId = null;
          s.changes.steps.changed.add(stepId);
        }
      }
      delete s.data.assemblies[id];
      s.changes.assemblies.changed.delete(id);
      s.changes.assemblies.deleted.add(id);
    }),

    // Assignment actions
    assignStepToAssembly: (stepId, assemblyId) => set((s) => {
      if (!s.data?.steps[stepId]) return;
      const step = s.data.steps[stepId];
      const oldAssemblyId = step.assemblyId;

      // Remove from old assembly
      if (oldAssemblyId && s.data.assemblies[oldAssemblyId]) {
        s.data.assemblies[oldAssemblyId].stepIds =
          s.data.assemblies[oldAssemblyId].stepIds.filter(id => id !== stepId);
      }

      // Add to new assembly
      if (assemblyId && s.data.assemblies[assemblyId]) {
        if (!s.data.assemblies[assemblyId].stepIds.includes(stepId)) {
          s.data.assemblies[assemblyId].stepIds.push(stepId);
        }
      }

      // Update step
      step.assemblyId = assemblyId;
      s.changes.steps.changed.add(stepId);
    }),

    assignSubstepToStep: (substepId, stepId) => set((s) => {
      if (!s.data?.substeps[substepId]) return;
      if (stepId && !s.data?.steps[stepId]) return;

      const substep = s.data.substeps[substepId];
      const oldStepId = substep.stepId;
      const allSubsteps = Object.values(s.data.substeps);

      // Remove from old step
      if (oldStepId && s.data.steps[oldStepId]) {
        s.data.steps[oldStepId].substepIds =
          s.data.steps[oldStepId].substepIds.filter(id => id !== substepId);

        // Re-number old step siblings to close gap
        const oldSiblings = allSubsteps
          .filter(sub => sub.stepId === oldStepId && sub.id !== substepId)
          .sort((a, b) => a.stepOrder - b.stepOrder);
        oldSiblings.forEach((sub, i) => {
          if (sub.stepOrder !== i + 1) {
            sub.stepOrder = i + 1;
            s.changes.substeps.changed.add(sub.id);
          }
        });
      }

      // Add to new step (if not null)
      if (stepId && !s.data.steps[stepId].substepIds.includes(substepId)) {
        s.data.steps[stepId].substepIds.push(substepId);
      }

      // Set per-step stepOrder
      if (stepId) {
        const newSiblings = allSubsteps.filter(sub => sub.stepId === stepId && sub.id !== substepId);
        substep.stepOrder = Math.max(0, ...newSiblings.map(sub => sub.stepOrder)) + 1;
      } else {
        substep.stepOrder = 0;
      }

      substep.stepId = stepId;
      s.changes.substeps.changed.add(substepId);
    }),

    // Steps
    addStep: (step) => {
      set((s) => {
        if (!s.data) return;
        s.data.steps[step.id] = step;
        s.changes.steps.changed.add(step.id);
      });
      const { onEventRecord, data } = get();
      if (onEventRecord && data?.steps[step.id]) {
        onEventRecord('step', step.id, 'create', data.steps[step.id]);
      }
    },

    updateStep: (id, updates) => {
      set((s) => {
        if (!s.data?.steps[id]) return;
        Object.assign(s.data.steps[id], updates);
        s.changes.steps.changed.add(id);
      });
      const { onEventRecord, data } = get();
      if (onEventRecord && data?.steps[id]) {
        onEventRecord('step', id, 'update', data.steps[id], Object.keys(updates));
      }
    },

    batchUpdateSteps: (updates) => {
      set((s) => {
        if (!s.data) return;
        for (const { id, changes } of updates) {
          if (!s.data.steps[id]) continue;
          Object.assign(s.data.steps[id], changes);
          s.changes.steps.changed.add(id);
        }
      });
      const { onEventRecord, data } = get();
      if (onEventRecord && data) {
        for (const { id, changes } of updates) {
          if (data.steps[id]) {
            onEventRecord('step', id, 'update', data.steps[id], Object.keys(changes));
          }
        }
      }
    },

    deleteStep: (id) => {
      const stepData = get().data?.steps[id];
      set((s) => {
        if (!s.data?.steps[id]) return;
        // Unassign all substeps from this step (mirror deleteAssembly pattern)
        const step = s.data.steps[id];
        for (const substepId of step.substepIds) {
          if (s.data.substeps[substepId]) {
            s.data.substeps[substepId].stepId = null;
            s.changes.substeps.changed.add(substepId);
          }
        }
        delete s.data.steps[id];
        s.changes.steps.changed.delete(id);
        s.changes.steps.deleted.add(id);
      });
      const { onEventRecord } = get();
      if (onEventRecord && stepData) {
        onEventRecord('step', id, 'delete', stepData);
      }
    },

    // Substeps
    addSubstep: (substep) => {
      set((s) => {
        if (!s.data) return;
        s.data.substeps[substep.id] = substep;
        s.changes.substeps.changed.add(substep.id);

        if (substep.stepId) {
          const step = s.data.steps[substep.stepId];
          if (step && !step.substepIds.includes(substep.id)) {
            step.substepIds.push(substep.id);
          }
        }
      });
      // Record event for sync
      const { onEventRecord, data } = get();
      if (onEventRecord && data?.substeps[substep.id]) {
        onEventRecord('substep', substep.id, 'create', data.substeps[substep.id]);
      }
    },

    updateSubstep: (id, updates) => {
      set((s) => {
        if (!s.data?.substeps[id]) return;
        Object.assign(s.data.substeps[id], updates);
        s.changes.substeps.changed.add(id);
      });
      // Record event for sync
      const { onEventRecord, data } = get();
      if (onEventRecord && data?.substeps[id]) {
        onEventRecord('substep', id, 'update', data.substeps[id], Object.keys(updates));
      }
    },

    batchUpdateSubsteps: (updates) => {
      set((s) => {
        if (!s.data) return;
        for (const { id, changes } of updates) {
          if (!s.data.substeps[id]) continue;
          Object.assign(s.data.substeps[id], changes);
          s.changes.substeps.changed.add(id);
        }
      });
      const { onEventRecord, data } = get();
      if (onEventRecord && data) {
        for (const { id, changes } of updates) {
          if (data.substeps[id]) {
            onEventRecord('substep', id, 'update', data.substeps[id], Object.keys(changes));
          }
        }
      }
    },

    deleteSubstep: (id) => {
      // Capture data before deletion for event
      const substepData = get().data?.substeps[id];
      set((s) => {
        if (!s.data?.substeps[id]) return;
        const substep = s.data.substeps[id];

        // Delete all SubstepElements first
        // 1. SubstepImages
        for (const imageId of substep.imageRowIds) {
          if (s.data.substepImages[imageId]) {
            delete s.data.substepImages[imageId];
            s.changes.substepImages.changed.delete(imageId);
            s.changes.substepImages.deleted.add(imageId);
          }
        }
        // 2. SubstepDescriptions
        for (const descId of substep.descriptionRowIds) {
          if (s.data.substepDescriptions[descId]) {
            delete s.data.substepDescriptions[descId];
            s.changes.substepDescriptions.changed.delete(descId);
            s.changes.substepDescriptions.deleted.add(descId);
          }
        }
        // 3. SubstepPartTools
        for (const ptId of substep.partToolRowIds) {
          if (s.data.substepPartTools[ptId]) {
            delete s.data.substepPartTools[ptId];
            s.changes.substepPartTools.changed.delete(ptId);
            s.changes.substepPartTools.deleted.add(ptId);
          }
        }
        // 4. SubstepNotes
        for (const noteId of substep.noteRowIds) {
          if (s.data.substepNotes[noteId]) {
            delete s.data.substepNotes[noteId];
            s.changes.substepNotes.changed.delete(noteId);
            s.changes.substepNotes.deleted.add(noteId);
          }
        }
        // 5. SubstepReferences
        for (const refId of substep.tutorialRowIds) {
          if (s.data.substepTutorials[refId]) {
            delete s.data.substepTutorials[refId];
            s.changes.substepTutorials.changed.delete(refId);
            s.changes.substepTutorials.deleted.add(refId);
          }
        }
        // 6. SubstepVideoSections AND their actual VideoSections
        for (const svsId of substep.videoSectionRowIds) {
          const svs = s.data.substepVideoSections[svsId];
          if (svs) {
            // Also delete the actual VideoSection
            if (svs.videoSectionId && s.data.videoSections[svs.videoSectionId]) {
              const videoSection = s.data.videoSections[svs.videoSectionId];

              // Remove from parent video's sectionIds
              const video = s.data.videos[videoSection.videoId];
              if (video) {
                video.sectionIds = video.sectionIds.filter(sid => sid !== svs.videoSectionId);
              }

              delete s.data.videoSections[svs.videoSectionId];
              s.changes.videoSections.changed.delete(svs.videoSectionId);
              s.changes.videoSections.deleted.add(svs.videoSectionId);
            }

            delete s.data.substepVideoSections[svsId];
            s.changes.substepVideoSections.changed.delete(svsId);
            s.changes.substepVideoSections.deleted.add(svsId);
          }
        }

        // Remove from parent step's substepIds list
        if (substep.stepId) {
          const step = s.data.steps[substep.stepId];
          if (step) {
            step.substepIds = step.substepIds.filter((sid: string) => sid !== id);
          }
        }

        delete s.data.substeps[id];
        s.changes.substeps.changed.delete(id);
        s.changes.substeps.deleted.add(id);
      });
      // Record event for sync
      const { onEventRecord } = get();
      if (onEventRecord && substepData) {
        onEventRecord('substep', id, 'delete', substepData);
      }
    },

    // Videos
    updateVideo: (id, updates) => set((s) => {
      if (!s.data?.videos[id]) return;
      Object.assign(s.data.videos[id], updates);
    }),

    // VideoFrameAreas
    addVideoFrameArea: (area) => set((s) => {
      if (!s.data) return;
      s.data.videoFrameAreas[area.id] = area;
      s.changes.videoFrameAreas.changed.add(area.id);

      // Also update Video's frameAreaIds if videoId is set
      if (area.videoId) {
        const video = s.data.videos[area.videoId];
        if (video && !video.frameAreaIds.includes(area.id)) {
          video.frameAreaIds = [...video.frameAreaIds, area.id];
        }
      }
    }),

    updateVideoFrameArea: (id, updates) => set((s) => {
      if (!s.data?.videoFrameAreas[id]) return;
      Object.assign(s.data.videoFrameAreas[id], updates);
      s.changes.videoFrameAreas.changed.add(id);
    }),

    deleteVideoFrameArea: (id) => set((s) => {
      if (!s.data?.videoFrameAreas[id]) return;
      delete s.data.videoFrameAreas[id];
      s.changes.videoFrameAreas.changed.delete(id);
      s.changes.videoFrameAreas.deleted.add(id);
    }),

    // SubstepImages
    addSubstepImage: (row) => {
      set((s) => {
        if (!s.data) return;
        s.data.substepImages[row.id] = row;
        s.changes.substepImages.changed.add(row.id);

        const substep = s.data.substeps[row.substepId];
        if (substep && !substep.imageRowIds.includes(row.id)) {
          substep.imageRowIds.push(row.id);
        }
      });
      const { onEventRecord, data } = get();
      if (onEventRecord && data?.substepImages[row.id]) {
        onEventRecord('substep_image', row.id, 'create', data.substepImages[row.id]);
      }
    },

    updateSubstepImage: (id, updates) => {
      set((s) => {
        if (!s.data?.substepImages[id]) return;
        Object.assign(s.data.substepImages[id], updates);
        s.changes.substepImages.changed.add(id);
      });
      const { onEventRecord, data } = get();
      if (onEventRecord && data?.substepImages[id]) {
        onEventRecord('substep_image', id, 'update', data.substepImages[id], Object.keys(updates));
      }
    },

    deleteSubstepImage: (id) => {
      const imageData = get().data?.substepImages[id];
      set((s) => {
        if (!s.data?.substepImages[id]) return;
        const row = s.data.substepImages[id];

        const substep = s.data.substeps[row.substepId];
        if (substep) {
          substep.imageRowIds = substep.imageRowIds.filter((rid) => rid !== id);
        }

        delete s.data.substepImages[id];
        s.changes.substepImages.changed.delete(id);
        s.changes.substepImages.deleted.add(id);
      });
      const { onEventRecord } = get();
      if (onEventRecord && imageData) {
        onEventRecord('substep_image', id, 'delete', imageData);
      }
    },

    // SubstepDescriptions
    addSubstepDescription: (row) => {
      set((s) => {
        if (!s.data) return;
        s.data.substepDescriptions[row.id] = row;
        s.changes.substepDescriptions.changed.add(row.id);

        const substep = s.data.substeps[row.substepId];
        if (substep && !substep.descriptionRowIds.includes(row.id)) {
          substep.descriptionRowIds.push(row.id);
        }
      });
      const { onEventRecord, data } = get();
      if (onEventRecord && data?.substepDescriptions[row.id]) {
        onEventRecord('substep_description', row.id, 'create', data.substepDescriptions[row.id]);
      }
    },

    updateSubstepDescription: (id, updates) => {
      set((s) => {
        if (!s.data?.substepDescriptions[id]) return;
        Object.assign(s.data.substepDescriptions[id], updates);
        s.changes.substepDescriptions.changed.add(id);
      });
      const { onEventRecord, data } = get();
      if (onEventRecord && data?.substepDescriptions[id]) {
        onEventRecord('substep_description', id, 'update', data.substepDescriptions[id], Object.keys(updates));
      }
    },

    deleteSubstepDescription: (id) => {
      const descriptionData = get().data?.substepDescriptions[id];
      set((s) => {
        if (!s.data?.substepDescriptions[id]) return;
        const row = s.data.substepDescriptions[id];

        const substep = s.data.substeps[row.substepId];
        if (substep) {
          substep.descriptionRowIds = substep.descriptionRowIds.filter((rid) => rid !== id);
        }

        delete s.data.substepDescriptions[id];
        s.changes.substepDescriptions.changed.delete(id);
        s.changes.substepDescriptions.deleted.add(id);
      });
      const { onEventRecord } = get();
      if (onEventRecord && descriptionData) {
        onEventRecord('substep_description', id, 'delete', descriptionData);
      }
    },

    // PartTools
    addPartTool: (partTool) => set((s) => {
      if (!s.data) return;
      s.data.partTools[partTool.id] = partTool;
      s.changes.partTools.changed.add(partTool.id);
    }),

    updatePartTool: (id, updates) => set((s) => {
      if (!s.data?.partTools[id]) return;
      Object.assign(s.data.partTools[id], updates);
      s.changes.partTools.changed.add(id);
    }),

    deletePartTool: (id) => set((s) => {
      if (!s.data?.partTools[id]) return;
      delete s.data.partTools[id];
      s.changes.partTools.changed.delete(id);
      s.changes.partTools.deleted.add(id);
    }),

    // SubstepPartTools
    addSubstepPartTool: (row) => {
      set((s) => {
        if (!s.data) return;
        s.data.substepPartTools[row.id] = row;
        s.changes.substepPartTools.changed.add(row.id);

        const substep = s.data.substeps[row.substepId];
        if (substep && !substep.partToolRowIds.includes(row.id)) {
          substep.partToolRowIds.push(row.id);
        }
      });
      const { onEventRecord, data } = get();
      if (onEventRecord && data?.substepPartTools[row.id]) {
        onEventRecord('substep_part_tool', row.id, 'create', data.substepPartTools[row.id]);
      }
    },

    updateSubstepPartTool: (id, updates) => {
      set((s) => {
        if (!s.data?.substepPartTools[id]) return;
        Object.assign(s.data.substepPartTools[id], updates);
        s.changes.substepPartTools.changed.add(id);
      });
      const { onEventRecord, data } = get();
      if (onEventRecord && data?.substepPartTools[id]) {
        onEventRecord('substep_part_tool', id, 'update', data.substepPartTools[id], Object.keys(updates));
      }
    },

    deleteSubstepPartTool: (id) => {
      const partToolData = get().data?.substepPartTools[id];
      set((s) => {
        if (!s.data?.substepPartTools[id]) return;
        const row = s.data.substepPartTools[id];

        const substep = s.data.substeps[row.substepId];
        if (substep) {
          substep.partToolRowIds = substep.partToolRowIds.filter((rid) => rid !== id);
        }

        delete s.data.substepPartTools[id];
        s.changes.substepPartTools.changed.delete(id);
        s.changes.substepPartTools.deleted.add(id);
      });
      const { onEventRecord } = get();
      if (onEventRecord && partToolData) {
        onEventRecord('substep_part_tool', id, 'delete', partToolData);
      }
    },

    // Notes
    addNote: (note) => set((s) => {
      if (!s.data) return;
      s.data.notes[note.id] = note;
      s.changes.notes.changed.add(note.id);
    }),

    updateNote: (id, updates) => set((s) => {
      if (!s.data?.notes[id]) return;
      Object.assign(s.data.notes[id], updates);
      s.changes.notes.changed.add(id);
    }),

    deleteNote: (id) => set((s) => {
      if (!s.data?.notes[id]) return;
      delete s.data.notes[id];
      s.changes.notes.changed.delete(id);
      s.changes.notes.deleted.add(id);
    }),

    // SubstepNotes
    addSubstepNote: (row) => {
      set((s) => {
        if (!s.data) return;
        s.data.substepNotes[row.id] = row;
        s.changes.substepNotes.changed.add(row.id);

        const substep = s.data.substeps[row.substepId];
        if (substep && !substep.noteRowIds.includes(row.id)) {
          substep.noteRowIds.push(row.id);
        }
      });
      const { onEventRecord, data } = get();
      if (onEventRecord && data?.substepNotes[row.id]) {
        onEventRecord('substep_note', row.id, 'create', data.substepNotes[row.id]);
      }
    },

    updateSubstepNote: (id, updates) => {
      set((s) => {
        if (!s.data?.substepNotes[id]) return;
        Object.assign(s.data.substepNotes[id], updates);
        s.changes.substepNotes.changed.add(id);
      });
      const { onEventRecord, data } = get();
      if (onEventRecord && data?.substepNotes[id]) {
        onEventRecord('substep_note', id, 'update', data.substepNotes[id], Object.keys(updates));
      }
    },

    deleteSubstepNote: (id) => {
      const noteData = get().data?.substepNotes[id];
      set((s) => {
        if (!s.data?.substepNotes[id]) return;
        const row = s.data.substepNotes[id];

        const substep = s.data.substeps[row.substepId];
        if (substep) {
          substep.noteRowIds = substep.noteRowIds.filter((rid) => rid !== id);
        }

        delete s.data.substepNotes[id];
        s.changes.substepNotes.changed.delete(id);
        s.changes.substepNotes.deleted.add(id);
      });
      const { onEventRecord } = get();
      if (onEventRecord && noteData) {
        onEventRecord('substep_note', id, 'delete', noteData);
      }
    },

    // SubstepTutorials
    addSubstepTutorial: (row) => {
      set((s) => {
        if (!s.data) return;
        s.data.substepTutorials[row.id] = row;
        s.changes.substepTutorials.changed.add(row.id);

        const substep = s.data.substeps[row.substepId];
        if (substep && !substep.tutorialRowIds.includes(row.id)) {
          substep.tutorialRowIds.push(row.id);
        }
      });
      const { onEventRecord, data } = get();
      if (onEventRecord && data?.substepTutorials[row.id]) {
        onEventRecord('substep_tutorial', row.id, 'create', data.substepTutorials[row.id]);
      }
    },

    updateSubstepTutorial: (id, updates) => {
      set((s) => {
        if (!s.data?.substepTutorials[id]) return;
        Object.assign(s.data.substepTutorials[id], updates);
        s.changes.substepTutorials.changed.add(id);
      });
      const { onEventRecord, data } = get();
      if (onEventRecord && data?.substepTutorials[id]) {
        onEventRecord('substep_tutorial', id, 'update', data.substepTutorials[id], Object.keys(updates));
      }
    },

    deleteSubstepTutorial: (id) => {
      const refData = get().data?.substepTutorials[id];
      set((s) => {
        if (!s.data?.substepTutorials[id]) return;
        const row = s.data.substepTutorials[id];

        const substep = s.data.substeps[row.substepId];
        if (substep) {
          substep.tutorialRowIds = substep.tutorialRowIds.filter((rid) => rid !== id);
        }

        delete s.data.substepTutorials[id];
        s.changes.substepTutorials.changed.delete(id);
        s.changes.substepTutorials.deleted.add(id);
      });
      const { onEventRecord } = get();
      if (onEventRecord && refData) {
        onEventRecord('substep_tutorial', id, 'delete', refData);
      }
    },

    // VideoSections
    addVideoSection: (section) => {
      set((s) => {
        if (!s.data) return;
        s.data.videoSections[section.id] = section;
        s.changes.videoSections.changed.add(section.id);

        // Add to parent video's sectionIds
        const video = s.data.videos[section.videoId];
        if (video && !video.sectionIds.includes(section.id)) {
          video.sectionIds.push(section.id);
        }
      });
      // Record event for sync
      const { onEventRecord, data } = get();
      if (onEventRecord && data?.videoSections[section.id]) {
        onEventRecord('video_section', section.id, 'create', data.videoSections[section.id]);
      }
    },

    updateVideoSection: (id, updates) => {
      set((s) => {
        if (!s.data?.videoSections[id]) return;
        Object.assign(s.data.videoSections[id], updates);
        s.changes.videoSections.changed.add(id);
      });
      // Record event for sync
      const { onEventRecord, data } = get();
      if (onEventRecord && data?.videoSections[id]) {
        onEventRecord('video_section', id, 'update', data.videoSections[id], Object.keys(updates));
      }
    },

    deleteVideoSection: (id) => {
      // Capture data before deletion for event
      const sectionData = get().data?.videoSections[id];
      set((s) => {
        if (!s.data?.videoSections[id]) return;
        const section = s.data.videoSections[id];

        // Remove from parent video's sectionIds
        const video = s.data.videos[section.videoId];
        if (video) {
          video.sectionIds = video.sectionIds.filter(sid => sid !== id);
        }

        // Cascade delete: Remove all SubstepVideoSections that reference this section
        const data = s.data;
        Object.values(data.substepVideoSections).forEach(svs => {
          if (svs.videoSectionId === id) {
            const substep = data.substeps[svs.substepId || ''];
            if (substep) {
              substep.videoSectionRowIds = substep.videoSectionRowIds.filter(r => r !== svs.id);
            }
            delete data.substepVideoSections[svs.id];
            s.changes.substepVideoSections.changed.delete(svs.id);
            s.changes.substepVideoSections.deleted.add(svs.id);
          }
        });

        delete s.data.videoSections[id];
        s.changes.videoSections.changed.delete(id);
        s.changes.videoSections.deleted.add(id);
      });
      // Record event for sync
      const { onEventRecord } = get();
      if (onEventRecord && sectionData) {
        onEventRecord('video_section', id, 'delete', sectionData);
      }
    },

    splitVideoSection: (sectionId, splitFrame) => {
      const state = get();
      if (!state.data?.videoSections[sectionId]) return null;

      const originalSection = state.data.videoSections[sectionId];

      // Validate: splitFrame must be inside the section (not at edges)
      if (splitFrame <= originalSection.startFrame || splitFrame >= originalSection.endFrame) {
        return null;
      }

      // Generate new section ID
      const newSectionId = uuidv4();

      set((s) => {
        if (!s.data) return;

        const section = s.data.videoSections[sectionId];
        if (!section) return;

        const originalEndFrame = section.endFrame;

        // Update original section: ends 1 frame before split point
        section.endFrame = splitFrame - 1;
        s.changes.videoSections.changed.add(sectionId);

        // Create new section: starts 1 frame after split point
        const newSection: VideoSectionRow = {
          id: newSectionId,
          versionId: section.versionId,
          videoId: section.videoId,
          startFrame: splitFrame + 1,
          endFrame: originalEndFrame,
          localPath: section.localPath,
        };
        s.data.videoSections[newSectionId] = newSection;
        s.changes.videoSections.changed.add(newSectionId);

        // Add new section to video's sectionIds
        const video = s.data.videos[section.videoId];
        if (video && !video.sectionIds.includes(newSectionId)) {
          video.sectionIds.push(newSectionId);
        }

        // Find all SubstepVideoSections linking to the original section
        // and create matching links to the new section
        const data = s.data;
        const linkedRows = Object.values(data.substepVideoSections)
          .filter(svs => svs.videoSectionId === sectionId);

        linkedRows.forEach(svs => {
          const newSvsId = uuidv4();
          const newSvs: SubstepVideoSectionRow = {
            id: newSvsId,
            versionId: svs.versionId,
            substepId: svs.substepId,
            videoSectionId: newSectionId,
            order: svs.order + 1, // Place right after the original
          };
          data.substepVideoSections[newSvsId] = newSvs;
          s.changes.substepVideoSections.changed.add(newSvsId);

          // Add to substep's videoSectionRowIds
          if (svs.substepId) {
            const substep = data.substeps[svs.substepId];
            if (substep && !substep.videoSectionRowIds.includes(newSvsId)) {
              // Insert right after the original SVS
              const originalIndex = substep.videoSectionRowIds.indexOf(svs.id);
              if (originalIndex >= 0) {
                substep.videoSectionRowIds.splice(originalIndex + 1, 0, newSvsId);
              } else {
                substep.videoSectionRowIds.push(newSvsId);
              }
            }
          }
        });
      });

      return newSectionId;
    },

    // SubstepVideoSections
    addSubstepVideoSection: (row) => {
      set((s) => {
        if (!s.data) return;
        s.data.substepVideoSections[row.id] = row;
        s.changes.substepVideoSections.changed.add(row.id);

        // Add to parent substep's videoSectionRowIds
        if (row.substepId) {
          const substep = s.data.substeps[row.substepId];
          if (substep && !substep.videoSectionRowIds.includes(row.id)) {
            substep.videoSectionRowIds.push(row.id);
          }
        }
      });
      const { onEventRecord, data } = get();
      if (onEventRecord && data?.substepVideoSections[row.id]) {
        onEventRecord('substep_video_section', row.id, 'create', data.substepVideoSections[row.id]);
      }
    },

    updateSubstepVideoSection: (id, updates) => {
      set((s) => {
        if (!s.data?.substepVideoSections[id]) return;
        Object.assign(s.data.substepVideoSections[id], updates);
        s.changes.substepVideoSections.changed.add(id);
      });
      const { onEventRecord, data } = get();
      if (onEventRecord && data?.substepVideoSections[id]) {
        onEventRecord('substep_video_section', id, 'update', data.substepVideoSections[id], Object.keys(updates));
      }
    },

    deleteSubstepVideoSection: (id) => {
      const svsData = get().data?.substepVideoSections[id];
      set((s) => {
        if (!s.data?.substepVideoSections[id]) return;
        const row = s.data.substepVideoSections[id];

        // Remove from parent substep's videoSectionRowIds
        if (row.substepId) {
          const substep = s.data.substeps[row.substepId];
          if (substep) {
            substep.videoSectionRowIds = substep.videoSectionRowIds.filter(r => r !== id);
          }
        }

        delete s.data.substepVideoSections[id];
        s.changes.substepVideoSections.changed.delete(id);
        s.changes.substepVideoSections.deleted.add(id);
      });
      const { onEventRecord } = get();
      if (onEventRecord && svsData) {
        onEventRecord('substep_video_section', id, 'delete', svsData);
      }
    },

    // PartToolVideoFrameAreas
    addPartToolVideoFrameArea: (row) => set((s) => {
      if (!s.data) return;
      s.data.partToolVideoFrameAreas[row.id] = row;
      s.changes.partToolVideoFrameAreas.changed.add(row.id);
    }),

    deletePartToolVideoFrameArea: (id) => set((s) => {
      if (!s.data?.partToolVideoFrameAreas[id]) return;
      delete s.data.partToolVideoFrameAreas[id];
      s.changes.partToolVideoFrameAreas.changed.delete(id);
      s.changes.partToolVideoFrameAreas.deleted.add(id);
    }),

    updatePartToolVideoFrameArea: (id, updates) => set((s) => {
      if (!s.data?.partToolVideoFrameAreas[id]) return;
      Object.assign(s.data.partToolVideoFrameAreas[id], updates);
      s.changes.partToolVideoFrameAreas.changed.add(id);
    }),

    // Drawings
    addDrawing: (drawing) => set((s) => {
      if (!s.data) return;
      s.data.drawings[drawing.id] = drawing;
      s.changes.drawings.changed.add(drawing.id);
    }),

    updateDrawing: (id, updates) => set((s) => {
      if (!s.data?.drawings[id]) return;
      Object.assign(s.data.drawings[id], updates);
      s.changes.drawings.changed.add(id);
    }),

    deleteDrawing: (id) => set((s) => {
      if (!s.data?.drawings[id]) return;
      delete s.data.drawings[id];
      s.changes.drawings.changed.delete(id);
      s.changes.drawings.deleted.add(id);
    }),

    // ViewportKeyframes (per-Video, not per-Section)
    addViewportKeyframe: (keyframe) => set((s) => {
      if (!s.data) return;
      s.data.viewportKeyframes[keyframe.id] = keyframe;
      s.changes.viewportKeyframes.changed.add(keyframe.id);

      // Add to parent video's viewportKeyframeIds
      const video = s.data.videos[keyframe.videoId];
      if (video && !video.viewportKeyframeIds.includes(keyframe.id)) {
        video.viewportKeyframeIds.push(keyframe.id);
      }
    }),

    updateViewportKeyframe: (id, updates) => set((s) => {
      if (!s.data?.viewportKeyframes[id]) return;
      Object.assign(s.data.viewportKeyframes[id], updates);
      s.changes.viewportKeyframes.changed.add(id);
    }),

    deleteViewportKeyframe: (id) => set((s) => {
      if (!s.data?.viewportKeyframes[id]) return;
      const keyframe = s.data.viewportKeyframes[id];

      // Cannot delete frame 0 keyframe (there must always be one)
      if (keyframe.frameNumber === 0) {
        console.warn('Cannot delete frame 0 keyframe - it is required');
        return;
      }

      // Remove from parent video's viewportKeyframeIds
      const video = s.data.videos[keyframe.videoId];
      if (video) {
        video.viewportKeyframeIds = video.viewportKeyframeIds.filter(kid => kid !== id);
      }

      delete s.data.viewportKeyframes[id];
      s.changes.viewportKeyframes.changed.delete(id);
      s.changes.viewportKeyframes.deleted.add(id);
    }),

    // Reorder substep elements
    reorderSubstepElement: (elementId, newIndex, type) => set((s) => {
      if (!s.data) return;

      const config = buildSubstepElementConfig(s.data, s.changes, { withPartToolFilter: true })[type];
      if (!config) return;

      // Get the element and its substepId
      const element = config.dict[elementId] as { substepId: string; order?: number } | undefined;
      if (!element?.substepId) return;

      const substep = s.data.substeps[element.substepId];
      if (!substep) return;

      // Get all element IDs for this type in this substep
      const allIds = config.getSubstepIds(substep);

      // If there's a filter function (for part/tool), filter the IDs
      const filterFn = 'filterFn' in config ? config.filterFn : undefined;
      const filteredIds = filterFn ? allIds.filter(filterFn) : allIds;

      // Get current items with their order values
      const items = filteredIds
        .map((id, idx) => {
          const item = config.dict[id] as { order?: number } | undefined;
          return { id, order: item?.order ?? idx };
        })
        .sort((a, b) => a.order - b.order);

      // Find current index of the element
      const currentIndex = items.findIndex((item) => item.id === elementId);
      if (currentIndex === -1 || currentIndex === newIndex) return;

      // Remove from current position and insert at new position
      const [movedItem] = items.splice(currentIndex, 1);
      items.splice(newIndex, 0, movedItem);

      // Update order values for all affected items
      items.forEach((item, idx) => {
        const row = config.dict[item.id] as { order?: number } | undefined;
        if (row && row.order !== idx) {
          row.order = idx;
          config.changes.changed.add(item.id);
        }
      });
    }),

    // Move element to a different substep
    moveSubstepElement: (elementId, newSubstepId, type) => set((s) => {
      if (!s.data) return;

      const config = buildSubstepElementConfig(s.data, s.changes)[type];
      if (!config) return;

      const element = config.dict[elementId] as { substepId: string } | undefined;
      if (!element?.substepId) return;

      // No-op if already in the target substep
      if (element.substepId === newSubstepId) return;

      const oldSubstep = s.data.substeps[element.substepId];
      const newSubstep = s.data.substeps[newSubstepId];
      if (!oldSubstep || !newSubstep) return;

      // Remove from old substep's ID array
      const oldIds = config.getSubstepIds(oldSubstep);
      const idx = oldIds.indexOf(elementId);
      if (idx !== -1) oldIds.splice(idx, 1);

      // Add to new substep's ID array
      const newIds = config.getSubstepIds(newSubstep);
      if (!newIds.includes(elementId)) newIds.push(elementId);

      // Update element's substepId
      element.substepId = newSubstepId;

      // Mark as changed
      config.changes.changed.add(elementId);
    }),

    // Change tracking
    hasChanges: () => {
      const { changes, instructionChanged } = get();
      return instructionChanged || Object.values(changes).some(
        (tracking) => tracking.changed.size > 0 || tracking.deleted.size > 0
      );
    },

    getChangedData: () => {
      const { data, changes, instructionChanged } = get();
      if (!data) return { changed: {}, deleted: {} };

      const changed: Record<string, Record<string, unknown>[]> = {};
      const deleted: Record<string, string[]> = {};

      // Convert camelCase to snake_case for backend API
      const camelToSnake = (str: string): string =>
        str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

      const toSnakeCase = (obj: Record<string, unknown>): Record<string, unknown> => {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
          // Skip enriched relation arrays (not part of the DB schema)
          if (key.endsWith('Ids') || key.endsWith('RowIds')) continue;

          // Recursively convert nested arrays and objects
          if (Array.isArray(value)) {
            result[camelToSnake(key)] = value.map(item =>
              typeof item === 'object' && item !== null ? toSnakeCase(item as Record<string, unknown>) : item
            );
          } else if (typeof value === 'object' && value !== null) {
            result[camelToSnake(key)] = toSnakeCase(value as Record<string, unknown>);
          } else {
            result[camelToSnake(key)] = value;
          }
        }
        return result;
      };

      const collect = <T>(
        key: string,
        apiKey: string,
        dict: Record<string, T>,
        tracking: ChangeTracking
      ) => {
        if (tracking.changed.size > 0) {
          changed[apiKey] = Array.from(tracking.changed)
            .map((id) => dict[id])
            .filter(Boolean)
            .map((item) => toSnakeCase(item as Record<string, unknown>));
        }
        if (tracking.deleted.size > 0) {
          deleted[camelToSnake(key) + '_ids'] = Array.from(tracking.deleted);
        }
      };

      // Instruction-level changes
      if (instructionChanged) {
        changed['instruction'] = [{
          id: data.instructionId,
          name: data.instructionName,
          description: data.instructionDescription,
          article_number: data.articleNumber,
          estimated_duration: data.estimatedDuration,
          preview_image_id: data.instructionPreviewImageId,
          cover_image_area_id: data.coverImageAreaId,
        }];
      }

      collect('assemblies', 'assemblies', data.assemblies, changes.assemblies);
      collect('steps', 'steps', data.steps, changes.steps);
      collect('substeps', 'substeps', data.substeps, changes.substeps);
      collect('videoSections', 'video_sections', data.videoSections, changes.videoSections);
      collect('videoFrameAreas', 'video_frame_areas', data.videoFrameAreas, changes.videoFrameAreas);
      collect('viewportKeyframes', 'viewport_keyframes', data.viewportKeyframes, changes.viewportKeyframes);
      collect('partTools', 'part_tools', data.partTools, changes.partTools);
      collect('notes', 'notes', data.notes, changes.notes);
      collect('substepImages', 'substep_images', data.substepImages, changes.substepImages);
      collect('substepPartTools', 'substep_part_tools', data.substepPartTools, changes.substepPartTools);
      collect('substepNotes', 'substep_notes', data.substepNotes, changes.substepNotes);
      collect('substepDescriptions', 'substep_descriptions', data.substepDescriptions, changes.substepDescriptions);
      collect('substepVideoSections', 'substep_video_sections', data.substepVideoSections, changes.substepVideoSections);
      collect('partToolVideoFrameAreas', 'part_tool_video_frame_areas', data.partToolVideoFrameAreas, changes.partToolVideoFrameAreas);
      collect('drawings', 'drawings', data.drawings, changes.drawings);
      collect('substepTutorials', 'substep_tutorials', data.substepTutorials, changes.substepTutorials);

      return { changed, deleted };
    },

    clearChanges: () => {
      const currentData = get().data;
      set((s) => {
        s.instructionChanged = false;
        s.changes = initialChanges();
        if (currentData) s.lastSavedData = currentData;
      });
    },

    // Progressive step loading
    setStepLoadingState: (state) => set((s) => {
      s.stepLoadingState = state;
    }),

    appendSteps: (chunk) => set((s) => {
      if (!s.data) return;

      // Add steps with their substeps
      for (const step of chunk.steps) {
        s.data.steps[step.id] = step;
      }

      // Add substeps
      for (const substep of chunk.substeps) {
        s.data.substeps[substep.id] = substep;
      }

      // Add junction table data
      for (const row of chunk.substepImages) {
        s.data.substepImages[row.id] = row;
      }
      for (const row of chunk.substepPartTools) {
        s.data.substepPartTools[row.id] = row;
      }
      for (const row of chunk.substepNotes) {
        s.data.substepNotes[row.id] = row;
      }
      for (const row of chunk.substepDescriptions) {
        s.data.substepDescriptions[row.id] = row;
      }
      for (const row of chunk.substepVideoSections) {
        s.data.substepVideoSections[row.id] = row;
      }
      for (const row of chunk.drawings) {
        s.data.drawings[row.id] = row;
      }

      // Update step loading state
      if (s.stepLoadingState) {
        const newLoadedCount = Object.keys(s.data.steps).length;
        s.stepLoadingState = {
          ...s.stepLoadingState,
          loadedCount: newLoadedCount,
          allLoaded: !chunk.hasMore,
          isLoadingMore: false,
        };
      }
    }),
  }))
);

