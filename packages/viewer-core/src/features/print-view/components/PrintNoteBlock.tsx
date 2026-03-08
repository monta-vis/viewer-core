import { useTranslation } from 'react-i18next';
import { safetyIconUrl, getCategoryColor } from '@/features/instruction';
import { buildMediaUrl, MediaPaths } from '@/lib/media';
import type { PrintNoteData } from '../utils/resolveSubstepPrintData';

interface PrintNoteBlockProps {
  note: PrintNoteData;
  folderName: string;
}

/**
 * Print-friendly note block: safety icon + text with colored left border.
 * Always expanded — no toggle in print context.
 */
export function PrintNoteBlock({ note, folderName }: PrintNoteBlockProps) {
  const { t } = useTranslation();
  const borderColor = getCategoryColor(note.safetyIconCategory);

  // Resolve icon URL: VFA UUID → buildMediaUrl, legacy filename → safetyIconUrl
  const isLegacy = /\.(png|jpg|gif)$/i.test(note.safetyIconId);
  const iconUrl = isLegacy
    ? safetyIconUrl(note.safetyIconId)
    : buildMediaUrl(folderName, MediaPaths.frame(note.safetyIconId));

  return (
    <div
      className="print-note-block"
      style={{ borderLeft: `0.1875rem solid ${borderColor}` }}
    >
      <img
        src={iconUrl}
        alt={t(`instructionView.noteLevel.${note.safetyIconCategory}`, note.safetyIconCategory)}
        loading="eager"
      />
      <p>{note.text}</p>
    </div>
  );
}
