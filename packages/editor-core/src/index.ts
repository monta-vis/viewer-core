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
  type ImageSource,
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

// PartToolTable (inline-editable table for substep partTools)
export { PartToolTable, type PartToolTableProps, type PartToolTableCallbacks } from './components/PartToolTable';

// PartTool helpers
export { createDefaultPartTool, isPartToolNameValid, sortSubstepPartTools } from './utils/partToolHelpers';
