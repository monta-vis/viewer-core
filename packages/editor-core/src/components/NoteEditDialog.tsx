import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  categoryToNoteLevel,
  type NoteLevel,
  type SafetyIconCategory,
} from '@monta-vis/viewer-core';
import { SafetyIconPicker, type SafetyIconItem } from './SafetyIconPicker';
import type { SafetyIconCatalog } from '../types';
import { buildIconList, buildAssetsDirMap, getIconUrl as getIconUrlUtil } from '../utils/iconUtils';

export interface NoteEditDialogProps {
  open: boolean;
  initialText: string;
  initialSafetyIconId: string | null;
  initialSafetyIconCategory: string | null;
  folderName?: string;
  catalogs?: SafetyIconCatalog[];
  onSave: (text: string, level: NoteLevel, safetyIconId: string | null, safetyIconCategory: string | null) => void;
  onClose: () => void;
}

export function NoteEditDialog({
  open,
  initialText,
  initialSafetyIconId,
  initialSafetyIconCategory,
  folderName,
  catalogs = [],
  onSave,
  onClose,
}: NoteEditDialogProps) {
  const { t, i18n } = useTranslation();
  const [text, setText] = useState(initialText);
  const [selectedIconId, setSelectedIconId] = useState<string | null>(initialSafetyIconId);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialSafetyIconCategory);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setText(initialText);
    setSelectedIconId(initialSafetyIconId);
    setSelectedCategory(initialSafetyIconCategory);
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [open, initialText, initialSafetyIconId, initialSafetyIconCategory]);

  const icons = useMemo(() => buildIconList(catalogs, i18n.language), [catalogs, i18n.language]);

  const assetsDirMap = useMemo(() => buildAssetsDirMap(catalogs), [catalogs]);

  const getIconUrl = useCallback(
    (icon: Parameters<typeof getIconUrlUtil>[0]) => getIconUrlUtil(icon, assetsDirMap, folderName),
    [assetsDirMap, folderName],
  );

  const handleSelect = useCallback((icon: SafetyIconItem) => {
    setSelectedIconId(icon.id);
    setSelectedCategory(icon.category);
  }, []);

  const handleSave = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed && !selectedIconId) {
      onClose();
      return;
    }

    // Derive level from category
    const category = selectedCategory ?? 'Sonstige';
    const level = categoryToNoteLevel(category as SafetyIconCategory);

    onSave(trimmed, level, selectedIconId, selectedCategory);
    onClose();
  }, [text, selectedIconId, selectedCategory, onSave, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        handleSave();
      }
    },
    [onClose, handleSave],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-xl shadow-2xl w-full max-w-4xl mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Safety icon picker */}
        <div className="mb-4">
          <SafetyIconPicker
            icons={icons}
            getIconUrl={getIconUrl}
            selectedIconId={selectedIconId}
            onSelect={handleSelect}
          />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full px-2 py-1 rounded-lg text-sm border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-base)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          placeholder={t('editorCore.enterNote', 'Enter note...')}
        />

        <div className="flex justify-end gap-3 mt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] transition-colors"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={!text.trim() && !selectedIconId}
            className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {t('common.save', 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
}
