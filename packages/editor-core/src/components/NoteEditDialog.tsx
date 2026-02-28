import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DialogShell,
  Button,
  type SafetyIconCategory,
} from '@monta-vis/viewer-core';
import { SafetyIconPicker, type SafetyIconItem } from './SafetyIconPicker';
import { EditInput } from './EditInput';
import type { SafetyIconCatalog } from '../types';
import { buildIconList, buildAssetsDirMap, getIconUrl as getIconUrlUtil } from '../utils/iconUtils';

export interface NoteEditDialogProps {
  open: boolean;
  initialText: string;
  initialSafetyIconId: string | null;
  initialSafetyIconCategory: string | null;
  folderName?: string;
  catalogs?: SafetyIconCatalog[];
  onSave: (text: string, safetyIconId: string, safetyIconCategory: SafetyIconCategory) => void;
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

  const canSave = !!selectedIconId && !!selectedCategory;

  const handleSave = useCallback(() => {
    const trimmed = text.trim();
    if (!canSave) return;

    onSave(trimmed, selectedIconId!, selectedCategory as SafetyIconCategory);
    onClose();
  }, [text, selectedIconId, selectedCategory, canSave, onSave, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        handleSave();
      }
    },
    [handleSave],
  );

  return (
    <DialogShell open={open} onClose={onClose} maxWidth="max-w-4xl">
      {/* Safety icon picker */}
      <div className="mb-4">
        <SafetyIconPicker
          icons={icons}
          getIconUrl={getIconUrl}
          selectedIconId={selectedIconId}
          onSelect={handleSelect}
        />
      </div>

      <EditInput
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('editorCore.enterNote', 'Enter note...')}
      />

      <div className="flex justify-end gap-3 mt-2">
        <Button variant="ghost" onClick={onClose}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={!canSave}>
          {t('common.save', 'Save')}
        </Button>
      </div>
    </DialogShell>
  );
}
