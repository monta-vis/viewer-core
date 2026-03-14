import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { getCategoryPriority, NOTE_CATEGORY_STYLES, type SafetyIconCategory } from '@/features/instruction';
import { useMediaResolverOptional } from '@/lib/MediaResolverContext';
import { resolveNoteIconUrl } from '../utils/resolveNoteIconUrl';
import { Tooltip } from '@/components/ui/Tooltip';

/** Unified note card: fixed icon + show/hide text badge. */
interface NoteCardProps {
  safetyIconCategory: SafetyIconCategory;
  text: string;
  safetyIconId: string;
  isExpanded: boolean;
  onToggle: () => void;
  /** Optional icon label for hover tooltip. Falls back to translated category label. */
  iconLabel?: string;
}

export function NoteCard({ safetyIconCategory, text, safetyIconId, isExpanded, onToggle, iconLabel }: NoteCardProps) {
  const { t } = useTranslation();
  const resolver = useMediaResolverOptional();
  const styles = NOTE_CATEGORY_STYLES[safetyIconCategory] ?? NOTE_CATEGORY_STYLES.Warnzeichen;
  const categoryLabel = t(`editor.safetyCategory.${safetyIconCategory}`, safetyIconCategory);
  const hasText = text.trim().length > 0;

  const iconUrl = resolveNoteIconUrl(safetyIconId, resolver);

  const ariaLabel = hasText ? `${categoryLabel}: ${text.slice(0, 50)}${text.length > 50 ? '...' : ''}` : categoryLabel;

  return (
    <div className="flex items-end" data-testid="note-card">
      {/* Icon button — in-flow, fixed size */}
      <button
        type="button"
        onClick={onToggle}
        className="flex-shrink-0 z-10 w-14 h-14 flex items-center justify-center cursor-pointer focus:outline-none rounded-lg"
        aria-label={ariaLabel}
        aria-expanded={isExpanded}
      >
        {iconUrl ? (
          <Tooltip content={iconLabel ?? categoryLabel}>
            <img
              src={iconUrl}
              alt={categoryLabel}
              loading="lazy"
              className="w-full h-full object-contain"
            />
          </Tooltip>
        ) : (
          <span className={clsx('text-xs font-bold uppercase', styles.text)}>{safetyIconCategory.slice(0, 3)}</span>
        )}
      </button>
      {/* Text badge — in-flow, tucked behind icon with negative margin */}
      {hasText && isExpanded && (
        <span
          role="button"
          tabIndex={0}
          aria-label={ariaLabel}
          onClick={onToggle}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
          className={clsx(
            '-ml-14 rounded-r-lg border-2 border-l-0 cursor-pointer',
            styles.bg, styles.border,
          )}
        >
          <span className="flex items-center gap-2 pl-16 pr-2 py-1 min-h-14">
            <span className="text-lg leading-relaxed text-white">
              {text}
            </span>
          </span>
        </span>
      )}
    </div>
  );
}

/** Sort priority for notes: uses category priority directly. */
export function getNoteSortPriority(note: { safetyIconCategory: SafetyIconCategory }): number {
  return getCategoryPriority(note.safetyIconCategory);
}
