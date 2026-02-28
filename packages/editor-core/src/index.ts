/**
 * @monta-vis/editor-core
 *
 * Editing layer for Montavis instruction viewer.
 * Provides store, persistence adapter, and editing components.
 */

// Editor Store (Zustand+Immer store with all mutation actions + change tracking)
export { useEditorStore } from './store';

// Persistence adapter (platform-agnostic save/load interface)
export {
  PersistenceProvider,
  usePersistence,
  type PersistenceAdapter,
  type ProjectListItem,
  type ProjectChanges,
  type PersistenceResult,
  type ImageUploadResult,
  type CoverImageUploadResult,
  type ImageSource,
  type NormalizedCrop,
} from './persistence';

// EditorProvider (convenience wrapper: PersistenceProvider + ViewerDataProvider)
export { EditorProvider } from './EditorProvider';

// Edit callbacks hook
export { useEditCallbacks, type EditCallbacks } from './hooks/useEditCallbacks';

// Editor-only types (moved from viewer-core)
export type {
  EventRecordCallback,
  StepLoadingState,
  StepChunkData,
  CatalogEntry,
  CatalogCategory,
  SafetyIconCatalog,
} from './types';

// Auto-save hook (debounced persistence)
export { useAutoSave, type UseAutoSaveOptions } from './hooks/useAutoSave';

// Session history hook (scoped undo/redo for popover sessions)
export { useSessionHistory, type UseSessionHistoryReturn } from './hooks/useSessionHistory';

// SubstepEditPopover (popover-based edit UI for substep cards)
export { SubstepEditPopover, type SubstepEditPopoverProps } from './components/SubstepEditPopover';

// Editing hooks (moved from viewer-core video-overlay)
export {
  useVideoFrameAreaManager,
  type UseVideoFrameAreaManagerProps,
  type UseVideoFrameAreaManagerReturn,
  type CreateAreaResult,
  type VideoFrameAreaData,
} from './hooks/useVideoFrameAreaManager';

// TextEditDialog (generic text editing modal)
export { TextEditDialog, type TextEditDialogProps } from './components/TextEditDialog';

// SafetyIconPicker (icon browser with search + category tabs)
export { SafetyIconPicker, type SafetyIconPickerProps, type SafetyIconItem } from './components/SafetyIconPicker';

// NoteEditDialog (note editing with safety icon picker)
export { NoteEditDialog, type NoteEditDialogProps } from './components/NoteEditDialog';

// PartToolTable (inline-editable table for partTools — shared by SubstepEditPopover + PartToolListPanel)
export {
  PartToolTable,
  type PartToolTableProps,
  type PartToolTableCallbacks,
  type PartToolTableItem,
  type PartToolTableImageCallbacks,
} from './components/PartToolTable';

// PartToolListPanel (instruction-level part/tool management panel)
export {
  PartToolListPanel,
  type PartToolListPanelProps,
  type PartToolListPanelCallbacks,
} from './components/PartToolListPanel';

// PartToolImagePicker (gallery picker for partTool images)
export {
  PartToolImagePicker,
  type PartToolImagePickerProps,
  type PartToolImageItem,
} from './components/PartToolImagePicker';

// ImageCropDialog (image crop dialog for part/tool images)
export { ImageCropDialog, type ImageCropDialogProps } from './components/ImageCropDialog';

// EditInput / EditTextarea (styled input wrappers for editor forms)
export { EditInput, EditTextarea } from './components/EditInput';
export type { EditInputProps, EditTextareaProps } from './components/EditInput';

// SectionCard (reusable panel card for editor sections)
export { SectionCard, type SectionCardProps } from './components/SectionCard';

// PartTool helpers
export {
  createDefaultPartTool,
  isPartToolNameValid,
  sortSubstepPartTools,
  sortPartToolRows,
  computeUsedAmount,
} from './utils/partToolHelpers';
