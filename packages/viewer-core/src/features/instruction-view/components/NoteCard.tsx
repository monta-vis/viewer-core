import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { getCategoryFromFilename, getCategoryPriority, safetyIconUrl, type NoteLevel } from '@/features/instruction';
import { buildMediaUrl } from '@/lib/media';

const NOTE_ICONS = {
  Critical: AlertCircle,
  Warning: AlertTriangle,
  Quality: CheckCircle,
  Info: Info,
} as const;

const NOTE_STYLES = {
  Critical: {
    bg: 'bg-[var(--color-note-critical-bg)]',
    border: 'border-[var(--color-note-critical-border)]',
    icon: 'text-[var(--color-note-critical-text)]',
    text: 'text-[var(--color-note-critical-text)]',
  },
  Warning: {
    bg: 'bg-[var(--color-note-warning-bg)]',
    border: 'border-[var(--color-note-warning-border)]',
    icon: 'text-white',
    text: 'text-white',
  },
  Quality: {
    bg: 'bg-[var(--color-note-quality-bg)]',
    border: 'border-[var(--color-note-quality-border)]',
    icon: 'text-[var(--color-note-quality-text)]',
    text: 'text-[var(--color-note-quality-text)]',
  },
  Info: {
    bg: 'bg-[var(--color-note-info-bg)]',
    border: 'border-[var(--color-note-info-border)]',
    icon: 'text-[var(--color-note-info-text)]',
    text: 'text-[var(--color-note-info-text)]',
  },
} as const;

/** Unified note card: fixed icon + sliding text panel. */
interface NoteCardProps {
  level: NoteLevel;
  text: string;
  safetyIconId?: string | null;
  isExpanded: boolean;
  onToggle: () => void;
  /** When set, VFA-based icons are resolved via mvis-media:// protocol (Electron). */
  folderName?: string;
  /** VideoFrameArea records for localPath fallback (mweb context without folderName). */
  videoFrameAreas?: Record<string, { localPath?: string | null }>;
}

export function NoteCard({ level, text, safetyIconId, isExpanded, onToggle, folderName, videoFrameAreas }: NoteCardProps) {
  const { t } = useTranslation();
  const Icon = NOTE_ICONS[level];
  const styles = NOTE_STYLES[level];
  const levelLabel = t(`instructionView.noteLevel.${level.toLowerCase()}`, level);
  const hasText = text.trim().length > 0;

  // Resolve safety icon URL: VFA UUID uses buildMediaUrl (Electron) or localPath (mweb)
  const isLegacy = safetyIconId ? /\.(png|jpg|gif)$/i.test(safetyIconId) : false;
  const iconUrl = safetyIconId
    ? isLegacy
      ? safetyIconUrl(safetyIconId)
      : folderName
        ? buildMediaUrl(folderName, `media/frames/${safetyIconId}/image.png`)
        : videoFrameAreas?.[safetyIconId]?.localPath ?? null
    : null;

  return (
    <button
      type="button"
      onClick={onToggle}
      className={clsx(
        'flex items-center cursor-pointer focus:outline-none rounded-lg w-full',
        hasText && isExpanded && ['border-2', styles.bg, styles.border, 'backdrop-blur-md'],
      )}
      aria-label={hasText ? `${levelLabel}: ${text.slice(0, 50)}${text.length > 50 ? '...' : ''}` : levelLabel}
      aria-expanded={isExpanded}
    >
      {/* Icon — fixed size, never moves or resizes */}
      <span className="flex-shrink-0 w-14 h-14 flex items-center justify-center">
        {iconUrl ? (
          <img
            src={iconUrl}
            alt={levelLabel}
            className="w-full h-full object-contain"
          />
        ) : (
          <Icon className={clsx('h-10 w-10', styles.icon)} />
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
            {!safetyIconId && (
              <span className={clsx('text-xs font-semibold uppercase', styles.text)}>
                {levelLabel}
              </span>
            )}
            <span className="text-lg leading-relaxed text-white">
              {text}
            </span>
          </span>
        </span>
      )}
    </button>
  );
}

/** Sort priority for notes: uses category priority from safety icon, or legacy level priority. */
export function getNoteSortPriority(note: { level: NoteLevel; safetyIconId?: string | null; safetyIconCategory?: string | null }): number {
  if (note.safetyIconCategory) {
    return getCategoryPriority(note.safetyIconCategory);
  }
  if (note.safetyIconId && /\.(png|jpg|gif)$/i.test(note.safetyIconId)) {
    // Legacy filename-based icon
    return getCategoryPriority(getCategoryFromFilename(note.safetyIconId));
  }
  const LEGACY: Record<NoteLevel, number> = { Critical: 0, Warning: 1, Quality: 4, Info: 6 };
  return LEGACY[note.level];
}
