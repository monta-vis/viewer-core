import type { SubstepEditCallbacks } from '../components/SubstepCard';
import type { PartToolRow, SafetyIconCategory } from '@/features/instruction';

/** Extended edit callbacks where substepId is an explicit parameter. */
export interface ExtendedSubstepEditCallbacks {
  onDeleteImage?: (substepId: string) => void;
  onAnnotateVideo?: (substepId: string) => void;
  onDeleteVideo?: (substepId: string) => void;
  onSaveDescription?: (descriptionId: string, text: string, substepId: string) => void;
  onDeleteDescription?: (descriptionId: string, substepId: string) => void;
  onAddDescription?: (text: string, substepId: string) => void;
  onSaveNote?: (noteRowId: string, text: string, safetyIconId: string, safetyIconCategory: SafetyIconCategory, substepId: string, sourceIconId?: string) => void;
  onDeleteNote?: (noteRowId: string, substepId: string) => void;
  onAddNote?: (text: string, safetyIconId: string, safetyIconCategory: SafetyIconCategory, substepId: string, sourceIconId?: string) => void;
  onSaveRepeat?: (count: number, label: string | null, substepId: string) => void;
  onDeleteRepeat?: (substepId: string) => void;
  onEditTutorial?: (tutorialIndex: number, substepId: string) => void;
  onDeleteTutorial?: (tutorialIndex: number, substepId: string) => void;
  onAddTutorial?: (substepId: string) => void;
  onEditPartTools?: (substepId: string) => void;
  onUpdatePartTool?: (partToolId: string, updates: Partial<PartToolRow>) => void;
  onUpdateSubstepPartToolAmount?: (substepPartToolId: string, amount: number) => void;
  onAddSubstepPartTool?: (substepId: string) => void;
  onDeleteSubstepPartTool?: (substepPartToolId: string) => void;
  onDeleteSubstep?: (substepId: string) => void;
}

/** Binds substepId into extended callbacks, returning SubstepEditCallbacks. */
export function bindSubstepCallbacks(
  callbacks: ExtendedSubstepEditCallbacks,
  substepId: string,
): SubstepEditCallbacks {
  return {
    onDeleteImage: callbacks.onDeleteImage ? () => callbacks.onDeleteImage!(substepId) : undefined,
    onAnnotateVideo: callbacks.onAnnotateVideo ? () => callbacks.onAnnotateVideo!(substepId) : undefined,
    onDeleteVideo: callbacks.onDeleteVideo ? () => callbacks.onDeleteVideo!(substepId) : undefined,
    onSaveDescription: callbacks.onSaveDescription ? (descId, text) => callbacks.onSaveDescription!(descId, text, substepId) : undefined,
    onDeleteDescription: callbacks.onDeleteDescription ? (descId) => callbacks.onDeleteDescription!(descId, substepId) : undefined,
    onAddDescription: callbacks.onAddDescription ? (text) => callbacks.onAddDescription!(text, substepId) : undefined,
    onSaveNote: callbacks.onSaveNote ? (noteRowId, text, iconId, iconCat, sourceIconId) => callbacks.onSaveNote!(noteRowId, text, iconId, iconCat, substepId, sourceIconId) : undefined,
    onDeleteNote: callbacks.onDeleteNote ? (noteRowId) => callbacks.onDeleteNote!(noteRowId, substepId) : undefined,
    onAddNote: callbacks.onAddNote ? (text, iconId, iconCat, sourceIconId) => callbacks.onAddNote!(text, iconId, iconCat, substepId, sourceIconId) : undefined,
    onSaveRepeat: callbacks.onSaveRepeat ? (count, label) => callbacks.onSaveRepeat!(count, label, substepId) : undefined,
    onDeleteRepeat: callbacks.onDeleteRepeat ? () => callbacks.onDeleteRepeat!(substepId) : undefined,
    onEditTutorial: callbacks.onEditTutorial ? (refIdx) => callbacks.onEditTutorial!(refIdx, substepId) : undefined,
    onDeleteTutorial: callbacks.onDeleteTutorial ? (refIdx) => callbacks.onDeleteTutorial!(refIdx, substepId) : undefined,
    onAddTutorial: callbacks.onAddTutorial ? () => callbacks.onAddTutorial!(substepId) : undefined,
    onEditPartTools: callbacks.onEditPartTools ? () => callbacks.onEditPartTools!(substepId) : undefined,
    onUpdatePartTool: callbacks.onUpdatePartTool,
    onUpdateSubstepPartToolAmount: callbacks.onUpdateSubstepPartToolAmount,
    onAddSubstepPartTool: callbacks.onAddSubstepPartTool ? () => callbacks.onAddSubstepPartTool!(substepId) : undefined,
    onDeleteSubstepPartTool: callbacks.onDeleteSubstepPartTool,
    onDeleteSubstep: callbacks.onDeleteSubstep ? () => callbacks.onDeleteSubstep!(substepId) : undefined,
  };
}
