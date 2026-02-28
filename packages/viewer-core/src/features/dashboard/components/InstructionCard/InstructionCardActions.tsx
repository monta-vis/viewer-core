import { useState, useRef, useCallback } from 'react';
import { clsx } from 'clsx';
import { Pencil, Globe, Film, EyeOff, Loader2, BookOpen, Languages, GraduationCap, Download, Package, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { IconButton } from '@/components/ui';
import { useClickOutside } from '@/hooks';
import { type ExportFormat } from './types';

/** Shared glass-morphism dropdown panel styles */
const GLASS_DROPDOWN = 'bg-white/70 dark:bg-black/60 backdrop-blur-xl ring-1 ring-white/30 rounded-lg shadow-xl shadow-black/20';
const GLASS_ITEM = 'hover:bg-white/25 dark:hover:bg-white/15 transition-colors';

const EXPORT_OPTIONS: { format: ExportFormat; icon: React.ReactNode; labelKey: string; fallback: string; descKey: string; descFallback: string }[] = [
  { format: 'mvis', icon: <Package className="w-4 h-4" />, labelKey: 'export.mvis', fallback: '.mvis', descKey: 'export.mvisDesc', descFallback: 'Project bundle' },
  { format: 'mweb', icon: <Globe className="w-4 h-4" />, labelKey: 'export.mweb', fallback: '.mweb', descKey: 'export.mwebDesc', descFallback: 'Web viewer' },
  { format: 'pdf', icon: <FileText className="w-4 h-4" />, labelKey: 'export.pdf', fallback: 'PDF', descKey: 'export.pdfDesc', descFallback: 'Print document' },
];

interface InstructionCardActionsProps {
  onEdit?: () => void;
  onProcessMedia?: () => void;
  isProcessing?: boolean;
  onBlurPersons?: () => void;
  isBlurring?: boolean;
  onTranslate?: () => void;
  isTranslating?: boolean;
  onEditTranslations?: () => void;
  onTutorial?: () => void;
  onExport?: (format: ExportFormat) => void;
  isExporting?: boolean;
}

type DropdownType = 'translate' | 'export' | null;

/** Edit + Process + Translate + Export buttons for instruction cards */
export function InstructionCardActions({
  onEdit,
  onProcessMedia,
  isProcessing = false,
  onBlurPersons,
  isBlurring = false,
  onTranslate,
  isTranslating = false,
  onEditTranslations,
  onTutorial,
  onExport,
  isExporting = false,
}: InstructionCardActionsProps) {
  const { t } = useTranslation();
  const [openDropdown, setOpenDropdown] = useState<DropdownType>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useClickOutside(wrapperRef, () => setOpenDropdown(null), openDropdown !== null);

  const hasAnyAction = !!(onEdit || onTutorial || onProcessMedia || onBlurPersons || onTranslate || onEditTranslations || onExport);

  const toggleDropdown = useCallback((target: NonNullable<DropdownType>) => {
    setOpenDropdown(prev => prev === target ? null : target);
  }, []);

  const handleExport = useCallback((format: ExportFormat, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenDropdown(null);
    onExport?.(format);
  }, [onExport]);

  if (!hasAnyAction) return null;

  return (
    <div ref={wrapperRef} className="absolute top-3 left-3 z-10">
      {/* Button bar — overflow-hidden clips hover backgrounds to the rounded shape */}
      <div className="bg-white/20 dark:bg-black/25 backdrop-blur-md rounded-lg shadow-lg ring-1 ring-white/20 flex overflow-hidden transition-opacity duration-200">
        {/* Edit button */}
        {onEdit && (
          <IconButton
            icon={<Pencil />}
            aria-label={t('common.edit', 'Edit')}
            variant="glass"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          />
        )}

        {/* Tutorial button */}
        {onTutorial && (
          <IconButton
            icon={<GraduationCap />}
            aria-label={t('instruction.tutorial', 'Tutorial')}
            variant="glass"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onTutorial();
            }}
          />
        )}

        {/* Process button */}
        {onProcessMedia && (
          <IconButton
            icon={isProcessing ? <Loader2 className="animate-spin" /> : <Film />}
            aria-label={t('instruction.processMedia', 'Process Media')}
            variant="glass"
            size="sm"
            disabled={isProcessing}
            onClick={(e) => {
              e.stopPropagation();
              onProcessMedia();
            }}
            className={clsx(isProcessing && 'cursor-wait')}
          />
        )}

        {/* Blur persons button */}
        {onBlurPersons && (
          <IconButton
            icon={isBlurring ? <Loader2 className="animate-spin" /> : <EyeOff />}
            aria-label={t('instruction.blurPersons', 'Blur Persons')}
            variant="glass"
            size="sm"
            disabled={isBlurring}
            onClick={(e) => {
              e.stopPropagation();
              onBlurPersons();
            }}
            className={clsx(isBlurring && 'cursor-wait')}
          />
        )}

        {/* Translate trigger */}
        {(onTranslate || onEditTranslations) && (
          <IconButton
            icon={isTranslating ? <Loader2 className="animate-spin" /> : <Languages />}
            aria-label={t('instruction.translate', 'Translate')}
            variant="glass"
            size="sm"
            disabled={isTranslating}
            onClick={(e) => {
              e.stopPropagation();
              toggleDropdown('translate');
            }}
            className={clsx(isTranslating && 'cursor-wait')}
          />
        )}

        {/* Export trigger */}
        {onExport && (
          <IconButton
            icon={isExporting ? <Loader2 className="animate-spin" /> : <Download />}
            aria-label={t('export.export', 'Export')}
            variant="glass"
            size="sm"
            disabled={isExporting}
            onClick={(e) => {
              e.stopPropagation();
              toggleDropdown('export');
            }}
            className={clsx(isExporting && 'cursor-wait')}
          />
        )}
      </div>

      {/* Dropdown menus — rendered outside overflow-hidden container */}
      {openDropdown === 'translate' && (
        <div className={clsx(
          'absolute top-full left-0 mt-1 z-50',
          GLASS_DROPDOWN,
          'py-1 min-w-[8rem]',
          'animate-in fade-in slide-in-from-top-1 duration-150',
        )}>
          {onTranslate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenDropdown(null);
                onTranslate();
              }}
              className={clsx(
                'w-full flex items-center gap-2 px-3 py-2 text-sm',
                'text-[var(--color-text-base)]',
                GLASS_ITEM,
              )}
            >
              <Globe className="w-4 h-4" />
              <span>{t('instruction.autoTranslate', 'Auto-translate')}</span>
            </button>
          )}
          {onEditTranslations && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenDropdown(null);
                onEditTranslations();
              }}
              className={clsx(
                'w-full flex items-center gap-2 px-3 py-2 text-sm',
                'text-[var(--color-text-base)]',
                GLASS_ITEM,
              )}
            >
              <BookOpen className="w-4 h-4" />
              <span>{t('instruction.editTranslations', 'Edit Translations')}</span>
            </button>
          )}
        </div>
      )}

      {openDropdown === 'export' && (
        <div className={clsx(
          'absolute top-full right-0 mt-1 z-50',
          'py-1',
          'bg-[var(--color-bg-elevated)] rounded-lg shadow-xl shadow-black/30 ring-1 ring-black/10 dark:ring-white/10',
          'animate-in fade-in-0 slide-in-from-top-1 duration-150',
          'min-w-[10rem]',
        )}>
          {EXPORT_OPTIONS.map(({ format, icon, labelKey, fallback, descKey, descFallback }) => (
            <button
              key={format}
              type="button"
              onClick={(e) => handleExport(format, e)}
              className={clsx(
                'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm',
                'text-[var(--color-text-base)]',
                'hover:bg-black/5 dark:hover:bg-white/10 transition-colors',
              )}
            >
              {icon}
              <div className="flex flex-col items-start">
                <span className="font-medium">{t(labelKey, fallback)}</span>
                <span className="text-xs text-[var(--color-text-muted)]">{t(descKey, descFallback)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
