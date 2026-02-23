import type React from 'react';

// Re-export from shared lib for barrel compatibility
export { SUPPORTED_LANGUAGES, getLanguageLabel, mapToSupportedLanguage } from '@/lib/languages';
export type { LanguageCode } from '@/lib/languages';

export type InstructionStatusType = 'completed' | 'in_progress' | 'pending';

export const statusBorderStyles: Record<InstructionStatusType, string> = {
  completed: 'ring-2 ring-[var(--color-video-section)]',
  in_progress: 'ring-2 ring-[var(--color-accent)]',
  pending: 'ring-2 ring-[var(--color-error)]',
};

export type ExportFormat = 'mvis' | 'mweb' | 'pdf';

export interface InstructionCardProps {
  /** Instruction ID */
  id?: string;
  /** Instruction name */
  name: string;
  /** Instruction version number */
  version?: number;
  /** Instruction description */
  description: string | null;
  /** Article number (Artikelnummer) */
  articleNumber?: string | null;
  /** Estimated duration in minutes */
  estimatedDuration?: number | null;
  /** Preview image ID (for future use) */
  previewImageId: string | null;
  /** Source language of the instruction content */
  sourceLanguage?: string;
  /** Called when card is clicked (optionally receives language code) */
  onClick?: (lang?: string) => void;
  /** Whether this card is selected */
  selected?: boolean;
  /** Status of the instruction */
  status?: InstructionStatusType;
  /** Called after successful update */
  onUpdate?: (updated: { name: string; description: string | null }) => void;
  /** Available languages for this instruction */
  languages?: string[];
  /** Called when languages are toggled */
  onLanguagesChange?: (languages: string[]) => void;
  /** Whether this is a local project */
  isLocal?: boolean;
  /** Folder name for local projects (needed for media URLs) */
  folderName?: string;
  /** Cover image source path (from DB, resolved to URL in hook) */
  coverImagePath?: string | null;
  /** Cover image area ID (needed to resolve blurred frame path) */
  coverImageAreaId?: string | null;
  /** Direct image URL — bypasses internal URL resolution (used by MWeb viewer) */
  imageUrl?: string | null;
  /** Called when Edit button is clicked */
  onEdit?: () => void;
  /** Called when an export format is selected */
  onExport?: (format: ExportFormat) => void;
  /** Called when Translate button is clicked */
  onTranslate?: () => void;
  /** Called when Process Media button is clicked */
  onProcessMedia?: () => void;
  /** Whether media is currently being processed */
  isProcessing?: boolean;
  /** Called when Blur Persons button is clicked */
  onBlurPersons?: () => void;
  /** Whether blur is currently running */
  isBlurring?: boolean;
  /** Called when Edit Translations button is clicked */
  onEditTranslations?: () => void;
  /** Whether blurred media is currently active */
  useBlurred?: boolean;
  /** Called when the blur toggle is changed */
  onToggleBlurred?: (value: boolean) => void;
  /** Called when Tutorial button is clicked (temporary, for testing) */
  onTutorial?: () => void;
  /** Optional footer content rendered below the detail area (e.g. start button) */
  footer?: React.ReactNode;
  /** Optional className for the footer wrapper div */
  footerClassName?: string;
  /** Render without Card wrapper (no rounded corners, shadows, elevated bg). Used by MWeb. */
  flat?: boolean;
  /** Called when Delete button is clicked */
  onDelete?: () => void;
  /** ISO date string when the instruction was created */
  createdAt?: string;
  /** ISO date string when the instruction was last updated */
  updatedAt?: string;
  /** Pre-resolved translations for display (viewer-core: passed as data, no DB loading) */
  translationData?: { language_code: string; name?: string; description?: string }[];
}

/** Hook state for InstructionCard */
export interface InstructionCardState {
  isExpanded: boolean;
  editName: string;
  editDescription: string;
  isSaving: boolean;
  saveButtonShake: boolean;
  isUploadingImage: boolean;
  isExporting: boolean;
  translations: { language_code: string; name?: string; description?: string }[];
  translatingLangs: Set<string>;
}
