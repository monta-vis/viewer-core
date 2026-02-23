import { type ReactNode, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { X, Languages, Sun, Moon, Type, Play, Check } from 'lucide-react';
import { Card } from '../Card';
import { IconButton } from '../IconButton';
import { useTheme, usePlaybackSpeed, type PlaybackSpeed, useFontSize, type FontSize } from '@/hooks';
import { SUPPORTED_LANGUAGES } from '@/lib/languages';

type HideableSection = 'language' | 'theme' | 'fontSize' | 'playbackSpeed';

export interface PreferencesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  extraSections?: ReactNode;
  hideSections?: HideableSection[];
  className?: string;
}

const PLAYBACK_SPEEDS: PlaybackSpeed[] = [0.5, 0.75, 1, 1.25, 1.5, 2];
const FONT_SIZES: { value: FontSize; labelKey: string }[] = [
  { value: 'small', labelKey: 'preferences.fontSizeSmall' },
  { value: 'medium', labelKey: 'preferences.fontSizeMedium' },
  { value: 'large', labelKey: 'preferences.fontSizeLarge' },
];

export function PreferencesDialog({
  isOpen,
  onClose,
  extraSections,
  hideSections = [],
  className,
}: PreferencesDialogProps) {
  const { t, i18n } = useTranslation();
  const { resolvedTheme, setTheme } = useTheme();
  const { playbackSpeed, setPlaybackSpeed } = usePlaybackSpeed();
  const { fontSize, setFontSize } = useFontSize();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const show = (section: HideableSection) => !hideSections.includes(section);

  return (
    <div
      data-testid="preferences-backdrop"
      className={clsx(
        'fixed inset-0 z-50 flex items-center justify-center',
        'bg-black/50 backdrop-blur-sm',
        className
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Card
        ref={panelRef}
        role="dialog"
        aria-label={t('preferences.title')}
        variant="elevated"
        bordered
        padding="none"
        className="pointer-events-auto w-full max-w-md max-h-[80vh] mx-4 flex flex-col shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-base)]">
          <span className="text-sm font-medium text-[var(--color-text-base)]">
            {t('preferences.title')}
          </span>
          <IconButton
            icon={<X />}
            aria-label={t('common.close')}
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="!h-7 !w-7"
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Language */}
          {show('language') && (
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-muted)] mb-2">
                <Languages className="w-3.5 h-3.5" />
                {t('preferences.language')}
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <OptionButton
                    key={lang.code}
                    active={i18n.language === lang.code}
                    onClick={() => i18n.changeLanguage(lang.code)}
                    showCheck
                  >
                    {lang.native}
                  </OptionButton>
                ))}
              </div>
            </div>
          )}

          {/* Theme */}
          {show('theme') && (
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-muted)] mb-2">
                {resolvedTheme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                {t('preferences.theme')}
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <OptionButton
                  active={resolvedTheme === 'light'}
                  onClick={() => setTheme('light')}
                  showCheck
                  icon={<Sun className="w-4 h-4" />}
                >
                  {t('preferences.themeLight')}
                </OptionButton>
                <OptionButton
                  active={resolvedTheme === 'dark'}
                  onClick={() => setTheme('dark')}
                  showCheck
                  icon={<Moon className="w-4 h-4" />}
                >
                  {t('preferences.themeDark')}
                </OptionButton>
              </div>
            </div>
          )}

          {/* Font Size */}
          {show('fontSize') && (
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-muted)] mb-2">
                <Type className="w-3.5 h-3.5" />
                {t('preferences.fontSize')}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {FONT_SIZES.map((opt) => (
                  <OptionButton
                    key={opt.value}
                    active={fontSize === opt.value}
                    onClick={() => setFontSize(opt.value)}
                  >
                    {t(opt.labelKey)}
                  </OptionButton>
                ))}
              </div>
            </div>
          )}

          {/* Playback Speed */}
          {show('playbackSpeed') && (
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-muted)] mb-2">
                <Play className="w-3.5 h-3.5" />
                {t('preferences.playbackSpeed')}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {PLAYBACK_SPEEDS.map((speed) => (
                  <OptionButton
                    key={speed}
                    active={playbackSpeed === speed}
                    onClick={() => setPlaybackSpeed(speed)}
                  >
                    {speed}x
                  </OptionButton>
                ))}
              </div>
            </div>
          )}

          {/* Extra sections from consumer */}
          {extraSections}
        </div>
      </Card>
    </div>
  );
}

// ── Internal helpers ──

const activeClass = 'border-[var(--color-secondary)] bg-[var(--color-secondary)]/10 text-[var(--color-text-base)]';
const inactiveClass = 'border-[var(--color-border-base)] bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-base)]';

function OptionButton({
  active,
  onClick,
  children,
  showCheck = false,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  showCheck?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex items-center justify-between px-3 py-2 rounded-lg text-sm',
        'border transition-all duration-150',
        active ? activeClass : inactiveClass
      )}
    >
      <span className="flex items-center gap-2">
        {icon}
        {children}
      </span>
      {showCheck && active && (
        <Check className="w-4 h-4 text-[var(--color-secondary)]" />
      )}
    </button>
  );
}
