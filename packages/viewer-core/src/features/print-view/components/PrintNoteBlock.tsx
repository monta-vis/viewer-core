import { useTranslation } from 'react-i18next';
import { getCategoryColor } from '@/features/instruction';
import { useMediaResolverOptional } from '@/lib/MediaResolverContext';
import { resolveNoteIconUrl } from '@/features/instruction-view/utils/resolveNoteIconUrl';
import type { PrintNoteData } from '../utils/resolveSubstepPrintData';

interface PrintNoteBlockProps {
  note: PrintNoteData;
}

/**
 * Print-friendly note block: safety icon + text with colored left border.
 * Always expanded — no toggle in print context.
 */
export function PrintNoteBlock({ note }: PrintNoteBlockProps) {
  const { t } = useTranslation();
  const resolver = useMediaResolverOptional();
  const borderColor = getCategoryColor(note.safetyIconCategory);

  const iconUrl = resolveNoteIconUrl(note.safetyIconId, resolver);

  return (
    <div
      className="print-note-block"
      style={{ borderLeft: `0.1875rem solid ${borderColor}` }}
    >
      {iconUrl && (
        <img
          src={iconUrl}
          alt={t(`instructionView.noteLevel.${note.safetyIconCategory}`, note.safetyIconCategory)}
          loading="eager"
        />
      )}
      <p>{note.text}</p>
    </div>
  );
}
