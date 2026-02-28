import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DialogShell, Button } from '@monta-vis/viewer-core';
import { EditTextarea } from './EditInput';

export interface TextEditDialogProps {
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
      const timer = setTimeout(() => textareaRef.current?.focus(), 50);
      return () => clearTimeout(timer);
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
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    }
  }, [handleSave]);

  return (
    <DialogShell open={open} onClose={onClose}>
      <h2 className="text-lg font-semibold text-[var(--color-text-base)] mb-4">{title}</h2>
      <EditTextarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        className="resize-y h-32"
        placeholder={t('editorCore.enterText', 'Enter text...')}
      />
      <div className="flex justify-end gap-3 mt-4">
        <Button variant="ghost" onClick={onClose}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={!text.trim()}>
          {t('common.save', 'Save')}
        </Button>
      </div>
    </DialogShell>
  );
}
