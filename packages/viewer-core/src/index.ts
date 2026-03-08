/**
 * @monta-vis/viewer-core
 *
 * Shared instruction viewer components for Montavis.
 * Read-only assembly instruction viewer for factory workers.
 */

// Shared design system (CSS variables, base styles, scrollbar, animations)
import './styles/theme.css';

// Instruction view theme (dark/light CSS variables for InstructionViewContainer)
import './features/instruction-view/styles/instruction-view.css';

// Instruction View (main feature — components, context, hooks, utils)
export * from './features/instruction-view';

// Instruction Store & Types
export * from './features/instruction';

// Video Player
export * from './features/video-player';

// Video Overlay
// Note: ShapeType/ShapeColor are canonical in instruction, not re-exported from video-overlay.
export * from './features/video-overlay';

// Feedback
export * from './features/feedback';

// Dashboard (InstructionCard, toolbar, search, sort)
export * from './features/dashboard';

// Shared UI components (Navbar, PreferencesDialog, Card, etc.)
export * from './components/ui';

// Shared hooks (useTheme, useFontSize, usePlaybackSpeed, etc.)
export * from './hooks';

// Snapshot type
export * from './types/snapshot';

// Media utilities (URL construction, path conventions)
export { buildMediaUrl, MediaPaths, publicAsset, DEFAULT_FPS } from './lib/media';

// Default translations for viewer-core components
export { viewerCoreTranslations } from './lib/translations';

// Language persistence (localStorage helpers for i18n)
export { getStoredLanguage, saveLanguage, LANGUAGE_STORAGE_KEY } from './lib/languagePersistence';

// Sort utilities
export { sortedValues, byOrder, byStepNumber } from './lib/sortedValues';

// Color utilities (hex → CSS custom properties)
export { hexToBrandStyle, hexToBgStyle } from './lib/colors';

// Search utilities
export { fuzzyScore, fuzzySearch } from './lib/fuzzySearch';
export { matchTermsSearch, type MatchableEntry, type MatchResult } from './lib/matchTermsSearch';

// Time formatting utilities
export { formatTimecodeWithFrames } from './lib/timeFormat';

// Domain icons (Part, Tool, Assembly — single source of truth)
export { PartIcon, ToolIcon, AssemblyIcon } from './lib/icons';

// Print View
export * from './features/print-view';
