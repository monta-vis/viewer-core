import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Check } from 'lucide-react';
import { IconButton } from '@/components/ui';
import { TEXT_SIZES } from '../types';

interface TextInputPopoverProps {
  /** Position in percentage (0-100) */
  position: { x: number; y: number };
  /** Container dimensions in pixels */
  containerWidth: number;
  containerHeight: number;
  /** Called when text is submitted (empty string = cancelled) */
  onSubmit: (text: string, fontSize: number) => void;
  /** Called when popover is cancelled */
  onCancel: () => void;
  /** Pre-fill text (for editing existing text shapes) */
  initialText?: string;
  /** Pre-fill font size (for editing existing text shapes) */
  initialFontSize?: number;
}

export function TextInputPopover({
  position,
  containerWidth,
  containerHeight,
  onSubmit,
  onCancel,
  initialText,
  initialFontSize,
}: TextInputPopoverProps) {
  const { t } = useTranslation();
  const [text, setText] = useState(initialText ?? '');
  const [fontSize, setFontSize] = useState(initialFontSize ?? 5);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (trimmed.length > 0) {
      onSubmit(trimmed, fontSize);
    } else {
      onCancel();
    }
  };

  // Calculate pixel position
  const pixelX = (position.x / 100) * containerWidth;
  const pixelY = (position.y / 100) * containerHeight;

  // Adjust position to keep popover visible
  const popoverWidth = 200;
  const adjustedX = Math.min(pixelX, containerWidth - popoverWidth - 8);

  return (
    <div
      className="absolute z-50 bg-[var(--color-bg-elevated)] rounded-lg shadow-lg border border-[var(--color-border-base)] p-2"
      style={{
        left: Math.max(8, adjustedX),
        top: pixelY + 4,
        minWidth: popoverWidth,
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('textInput.placeholder')}
          className="flex-1 px-2 py-1 text-sm border border-[var(--color-border-base)] rounded bg-[var(--item-bg)] text-[var(--color-text-base)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        />
        <IconButton
          icon={<Check className="w-4 h-4" />}
          aria-label={t('common.confirm')}
          size="sm"
          variant="ghost"
          onClick={handleSubmit}
          disabled={text.trim().length === 0}
        />
        <IconButton
          icon={<X className="w-4 h-4" />}
          aria-label={t('common.cancel')}
          size="sm"
          variant="ghost"
          onClick={onCancel}
        />
      </div>
      <div className="flex items-center gap-1 mt-1">
        {TEXT_SIZES.map(({ label, value }) => (
          <button
            key={label}
            type="button"
            onClick={() => setFontSize(value)}
            className={`px-2 py-0.5 text-xs rounded font-medium transition-colors ${
              fontSize === value
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-bg-base)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]'
            }`}
          >
            {label}
          </button>
        ))}
        <p className="text-xs text-[var(--color-text-muted)] ml-1">
          {t('textInput.hint')}
        </p>
      </div>
    </div>
  );
}
