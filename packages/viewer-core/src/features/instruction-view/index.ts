/**
 * Instruction View Feature
 *
 * Read-only view of an instruction for end users.
 * Shows substeps with videos, images, parts/tools, and descriptions.
 *
 * Has its own theme and language, independent of the Creator app.
 */

// Styles (must be imported for CSS variables to work)
import './styles/instruction-view.css';

// Context & Provider
export {
  InstructionViewProvider,
  InstructionViewContainer,
  useInstructionView,
  useInstructionViewOptional,
  ViewerDataProvider,
  useViewerData,
  type InstructionTheme,
  type InstructionLanguage,
} from './context';

// Components
export { InstructionView } from './components/InstructionView';
export { SubstepCard, type SubstepEditCallbacks } from './components/SubstepCard';
export { StepOverview } from './components/StepOverview';
export { StepOverviewCard } from './components/StepOverviewCard';
export { PartsToolsBar } from './components/PartsToolsBar';
export { PartsToolsSidebar } from './components/PartsToolsSidebar';
export { InlineVideoPlayer } from './components/InlineVideoPlayer';
export { VideoFrameCapture } from './components/VideoFrameCapture';
export { PartsToolsOverviewCard } from './components/PartsToolsOverviewCard';
export { StepRangeSlider } from './components/StepRangeSlider';
export { PartsDrawer } from './components/PartsDrawer';
export { PartToolDetailModal, type PartToolEditCallbacks } from './components/PartToolDetailModal';
export { NoteCard } from './components/NoteCard';

// Utils
export { sqliteToSnapshot } from './utils/sqliteToSnapshot';
export { transformSnapshotToStore } from './utils/transformSnapshotToStore';
export { resolveRawFrameCapture, resolvePartToolFrameCapture, type FrameCaptureData } from './utils/resolveRawFrameCapture';
export { resolveReferenceTargets, type ReferenceTargetResult } from './utils/resolveReferenceTargets';
export { computeReferenceToggle } from './utils/referenceToggle';
export { applyTranslationsToStore, type TranslationRow } from './utils/applyTranslations';
export { flattenTranslations } from './utils/flattenTranslations';
export { getImageDrawings, getVideoDrawings } from './utils/filterSubstepDrawings';
export { resolvePartToolImageUrl } from './utils/resolvePartToolImageUrl';

// Hooks
export {
  useFilteredPartsTools,
  useAllPartsTools,
  useMaxStepNumber,
  type AggregatedPartTool,
  type FilteredPartsToolsResult,
} from './hooks/useFilteredPartsTools';
export {
  useResponsiveGridColumns,
  CARD_MIN_WIDTH_REM,
  CARD_MAX_WIDTH_REM,
  CARD_GAP_REM,
} from './hooks/useResponsiveGridColumns';
