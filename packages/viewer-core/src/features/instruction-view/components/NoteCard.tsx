import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { getCategoryPriority, safetyIconUrl, NOTE_CATEGORY_STYLES, type SafetyIconCategory } from '@/features/instruction';
import { buildMediaUrl } from '@/lib/media';

/** Unified note card: fixed icon + sliding text panel. */
interface NoteCardProps {
  safetyIconCategory: SafetyIconCategory;
  text: string;
  safetyIconId: string;
  isExpanded: boolean;
  onToggle: () => void;
  /** When set, VFA-based icons are resolved via mvis-media:// protocol (Electron). */
  folderName?: string;
  /** VideoFrameArea records for localPath fallback (mweb context without folderName). */
  videoFrameAreas?: Record<string, { localPath?: string | null }>;
}

export function NoteCard({ safetyIconCategory, text, safetyIconId, isExpanded, onToggle, folderName, videoFrameAreas }: NoteCardProps) {
  const { t } = useTranslation();
  const styles = NOTE_CATEGORY_STYLES[safetyIconCategory] ?? NOTE_CATEGORY_STYLES.Warnzeichen;
  const categoryLabel = t(`editor.safetyCategory.${safetyIconCategory}`, safetyIconCategory);
  const hasText = text.trim().length > 0;

  // Resolve safety icon URL: VFA UUID uses buildMediaUrl (Electron) or localPath (mweb)
  const isLegacy = /\.(png|jpg|gif)$/i.test(safetyIconId);
  let iconUrl: string | null;
  if (isLegacy) {
    iconUrl = safetyIconUrl(safetyIconId);
  } else if (folderName) {
    iconUrl = buildMediaUrl(folderName, `media/frames/${safetyIconId}/image.png`);
  } else {
    iconUrl = videoFrameAreas?.[safetyIconId]?.localPath ?? null;
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className={clsx(
        'flex items-center cursor-pointer focus:outline-none rounded-lg w-full',
        hasText && isExpanded && ['border-2', styles.bg, styles.border, 'backdrop-blur-md'],
      )}
      aria-label={hasText ? `${categoryLabel}: ${text.slice(0, 50)}${text.length > 50 ? '...' : ''}` : categoryLabel}
      aria-expanded={isExpanded}
    >
      {/* Icon — fixed size, never moves or resizes */}
      <span className="flex-shrink-0 w-14 h-14 flex items-center justify-center">
        {iconUrl ? (
          <img
            src={iconUrl}
            alt={categoryLabel}
            className="w-full h-full object-contain"
          />
        ) : (
          <span className={clsx('text-xs font-bold uppercase', styles.text)}>{safetyIconCategory.slice(0, 3)}</span>
        )}
      </span>
      {/* Text panel — slides via max-width + opacity transition; hidden entirely for icon-only notes */}
      {hasText && (
        <span
          className={clsx(
            'overflow-hidden transition-[max-width,opacity] duration-300 ease-out',
            isExpanded ? 'max-w-[60rem] opacity-100' : 'max-w-0 opacity-0',
          )}
        >
          <span className="flex items-center gap-2 pl-2 pr-1">
            <span className="text-lg leading-relaxed text-white">
              {text}
            </span>
          </span>
        </span>
      )}
    </button>
  );
}

/** Sort priority for notes: uses category priority directly. */
export function getNoteSortPriority(note: { safetyIconCategory: SafetyIconCategory }): number {
  return getCategoryPriority(note.safetyIconCategory);
}
