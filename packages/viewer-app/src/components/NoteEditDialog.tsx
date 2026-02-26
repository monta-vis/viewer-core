import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  categoryToNoteLevel,
  SAFETY_ICON_MANIFEST,
  buildMediaUrl,
  type NoteLevel,
  type SafetyIconCategory,
} from '@monta-vis/viewer-core';
import { SafetyIconPicker, type SafetyIconItem } from './SafetyIconPicker';
import type { SafetyIconCatalog } from '../types/catalog';

interface NoteEditDialogProps {
  open: boolean;
  initialText: string;
  initialSafetyIconId: string | null;
  initialSafetyIconCategory: string | null;
  folderName?: string;
  onSave: (text: string, level: NoteLevel, safetyIconId: string | null, safetyIconCategory: string | null) => void;
  onClose: () => void;
}

/**
 * Resolve a localized label. Falls back to first available language, then filename.
 */
function resolveLabel(label: Record<string, string> | string | undefined, lang: string, filename: string): string {
  if (!label) return filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
  if (typeof label === 'string') return label;
  return label[lang] ?? label.de ?? label.en ?? Object.values(label)[0] ?? filename;
}

/**
 * Build the list of selectable icons.
 * Priority: external catalogs (from disk) → built-in manifest (from public/SafetyIcons/).
 */
function buildIconList(catalogs: SafetyIconCatalog[], lang: string): SafetyIconItem[] {
  // External catalog icons (use filename as id since entries don't have a dedicated id)
  const catalogIcons: SafetyIconItem[] = catalogs.flatMap((cat) =>
    (cat.entries ?? []).map((entry) => ({
      id: entry.filename,
      filename: entry.filename,
      category: entry.category,
      label: resolveLabel(entry.label, lang, entry.filename),
    })),
  );

  // Built-in manifest icons (fallback)
  const builtinIcons: SafetyIconItem[] = SAFETY_ICON_MANIFEST.map((entry) => ({
    id: entry.filename,
    filename: entry.filename,
    category: entry.category,
    label: entry.filename.replace(/\.png$/, '').replace(/[-_]/g, ' '),
  }));

  return catalogIcons.length > 0 ? catalogIcons : builtinIcons;
}

export function NoteEditDialog({
  open,
  initialText,
  initialSafetyIconId,
  initialSafetyIconCategory,
  folderName,
  onSave,
  onClose,
}: NoteEditDialogProps) {
  const { t, i18n } = useTranslation();
  const [text, setText] = useState(initialText);
  const [selectedIconId, setSelectedIconId] = useState<string | null>(initialSafetyIconId);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialSafetyIconCategory);
  const [catalogs, setCatalogs] = useState<SafetyIconCatalog[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load external catalogs once (cached across dialog opens)
  useEffect(() => {
    if (!open || catalogs.length > 0) return;
    window.electronAPI?.catalogs
      ?.getSafetyIcons()
      .then((result: SafetyIconCatalog[]) => setCatalogs(result ?? []))
      .catch(() => setCatalogs([]));
  }, [open, catalogs.length]);

  useEffect(() => {
    if (!open) return;
    setText(initialText);
    setSelectedIconId(initialSafetyIconId);
    setSelectedCategory(initialSafetyIconCategory);
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [open, initialText, initialSafetyIconId, initialSafetyIconCategory]);

  const icons = useMemo(() => buildIconList(catalogs, i18n.language), [catalogs, i18n.language]);

  // Build a map of catalog assetsDir by filename for URL construction
  const assetsDirMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const cat of catalogs) {
      for (const entry of cat.entries ?? []) {
        map.set(entry.filename, cat.assetsDir);
      }
    }
    return map;
  }, [catalogs]);

  const getIconUrl = useCallback(
    (icon: SafetyIconItem) => {
      const assetsDir = assetsDirMap.get(icon.filename);
      if (assetsDir && folderName) {
        // External catalog icon: absolute path via mvis-media protocol
        const absPath = `${assetsDir}/${icon.filename}`.replace(/\\/g, '/');
        return buildMediaUrl(folderName, absPath);
      }
      // Built-in icon: served from public/SafetyIcons/
      return `./SafetyIcons/${encodeURIComponent(icon.filename)}`;
    },
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
          placeholder={t('edit.enterNote', 'Enter note...')}
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
