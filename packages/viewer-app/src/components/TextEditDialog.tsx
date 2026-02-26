import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface TextEditDialogProps {
  open: boolean;
  title: string;
  initialValue: string;
  onSave: (text: string) => void;
  onClose: () => void;
}

export function TextEditDialog({ open, title, initialValue, onSave, onClose }: TextEditDialogProps) {
  const { t } = useTranslation();
  const [text, setText] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setText(initialValue);
      // Auto-focus textarea on open
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [open, initialValue]);

  const handleSave = useCallback(() => {
    const trimmed = text.trim();
    if (trimmed) {
      onSave(trimmed);
    }
    onClose();
  }, [text, onSave, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    }
  }, [onClose, handleSave]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-[var(--color-text-base)] mb-4">{title}</h2>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full h-32 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-base)] resize-y focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          placeholder={t('edit.enterText', 'Enter text...')}
        />
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] transition-colors"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={!text.trim()}
            className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {t('common.save', 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
}
