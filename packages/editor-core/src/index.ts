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
export type { EventRecordCallback, StepLoadingState, StepChunkData } from './types';

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
