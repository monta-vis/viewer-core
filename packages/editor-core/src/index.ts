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
  type SubstepImageUploadResult,
  type StepPreviewUploadResult,
  type CatalogIconCopyResult,
  type VideoUploadResult,
  type VideoUploadArgs,
  type ImageSource,
  type NormalizedCrop,
} from './persistence';

// EditorProvider (convenience wrapper: PersistenceProvider + ViewerDataProvider)
export { EditorProvider } from './EditorProvider';

// Edit callbacks hook
export { useEditCallbacks, type EditCallbacks, type UseEditCallbacksOptions } from './hooks/useEditCallbacks';

// Editor-only types (moved from viewer-core)
export type {
  EventRecordCallback,
  StepLoadingState,
  StepChunkData,
  CatalogEntry,
  CatalogCategory,
  SafetyIconCatalog,
  PartToolIconEntry,
  PartToolIconCatalog,
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

// PartToolCatalogGrid (catalog icon browser with search + category tabs)
export {
  PartToolCatalogGrid,
  type PartToolCatalogGridProps,
  type PartToolIconItem,
} from './components/PartToolCatalogGrid';

// PartToolAddForm (compact form for adding part/tool from catalog)
export {
  PartToolAddForm,
  type PartToolAddFormProps,
  type PartToolAddFormValues,
} from './components/PartToolAddForm';

// PartToolImagePicker (gallery picker for partTool images)
export {
  PartToolImagePicker,
  type PartToolImagePickerProps,
  type PartToolImageItem,
} from './components/PartToolImagePicker';

// PartToolDetailEditor (full editable detail view for a single part/tool — render prop for PartsDrawer)
export { PartToolDetailEditor, type PartToolDetailEditorProps } from './components/PartToolDetailEditor';

// ImageCropDialog (image crop dialog for part/tool images)
export { ImageCropDialog, type ImageCropDialogProps } from './components/ImageCropDialog';

// PreviewImageUploadButton (upload icon + crop dialog for step preview images)
export { PreviewImageUploadButton, type PreviewImageUploadButtonProps } from './components/PreviewImageUploadButton';

// MediaEditDialog (shared full-screen modal shell for media annotation editors)
export { MediaEditDialog, type MediaEditDialogProps } from './components/MediaEditDialog';

// ImageEditDialog (full-screen image editing with overlay annotations + area)
export { ImageEditDialog, type ImageEditDialogProps } from './components/ImageEditDialog';

// DrawingEditor (unified drawing editor for image annotations + video drawings)
export { DrawingEditor, type DrawingCardData, type DrawingMode } from './components/DrawingEditor';

// useImageDrawing (image-only drawing state management)
export { useImageDrawing, type UseImageDrawingProps } from './hooks/useImageDrawing';

// useVideoDrawing (video-only drawing state management)
export { useVideoDrawing, type UseVideoDrawingProps } from './hooks/useVideoDrawing';

// Drawing state (shared selection, tool, color, multi-select)
export { useDrawingState, type UseDrawingStateProps } from './hooks/useDrawingState';
export { useDrawingDeleteKey } from './hooks/useDrawingDeleteKey';

// Drawing percent helpers (frame ↔ substep percent conversion)
export {
  prepareSections,
  frameToSubstepPercent,
  substepPercentToFrame,
  type PreparedSections,
} from './utils/drawingPercentHelpers';

// VideoTrimDialog (video trimming dialog with timeline)
export {
  VideoTrimDialog,
  type VideoTrimDialogProps,
} from './components/VideoTrimDialog';

// SectionData type (section-based video editing)
export type { SectionData } from './components/VideoEditorDialog/SectionTimeline';

// VideoEditorDialog (section + viewport keyframe editor)
export {
  VideoEditorDialog,
  type VideoEditorDialogProps,
  type VideoEditorResult,
} from './components/VideoEditorDialog';

// Playhead (timeline playhead with drag-to-seek, tooltip, grab handle)
export { Playhead, type PlayheadProps } from './components/VideoEditorDialog/Playhead';

// useViewportKeyframes (local keyframe state for video editor sessions)
export {
  useViewportKeyframes,
  type UseViewportKeyframesReturn,
} from './hooks/useViewportKeyframes';

// Video trim utilities (formatTimecode used by TrimPlaybackControls)
export { formatTimecode } from './utils/trimUtils';

// useVideoPlayback (video element playback state management)
export { useVideoPlayback, type UseVideoPlaybackReturn } from './hooks/useVideoPlayback';

// EditInput / EditTextarea (styled input wrappers for editor forms)
export { EditInput, EditTextarea } from './components/EditInput';
export type { EditInputProps, EditTextareaProps } from './components/EditInput';

// AutocompleteEditInput (EditInput wrapper with suggestion dropdown)
export { AutocompleteEditInput, type AutocompleteSuggestion, type AutocompleteEditInputProps } from './components/AutocompleteEditInput';

// SectionCard (reusable panel card for editor sections)
export { SectionCard, type SectionCardProps } from './components/SectionCard';

// Icon utilities (shared between viewer + creator)
export { resolveNoteIconUrl } from './utils/iconUtils';

// DraggableList (sortable vertical list with @dnd-kit)
export { DraggableList } from './components/DraggableList';

// DraggableGrid (sortable grid layout with @dnd-kit)
export { DraggableGrid } from './components/DraggableGrid';

// reorderArray (immutable array reorder utility)
export { reorderArray } from './utils/reorderArray';

// PartToolSelectList (read-only selectable table list for part/tool picking)
export {
  PartToolSelectList,
  toPartToolSelectItems,
  type PartToolSelectListProps,
  type PartToolSelectItem,
} from './components/PartToolSelectList';

// PartToolSelectModal (text input + PartToolSelectList table modal for catalog fields)
export {
  PartToolSelectModal,
  type PartToolSelectModalProps,
} from './components/PartToolSelectModal';

// PartTool helpers
export {
  createDefaultPartTool,
  isPartToolNameValid,
  sortSubstepPartTools,
  sortPartToolRows,
  computeUsedAmount,
} from './utils/partToolHelpers';
