import { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type InstructionCardProps,
  type InstructionCardState,
  mapToSupportedLanguage,
} from './types';

/**
 * Base InstructionCard hook for viewer-core.
 *
 * Accepts all data as props — no localProjectService, no Electron IPC.
 * The editor app wraps this with its own hook that adds DB loading.
 */
export function useInstructionCard(props: InstructionCardProps) {
  const {
    id,
    name,
    description,
    onClick,
    onUpdate,
    onLanguagesChange,
    imageUrl: directImageUrl,
    sourceLanguage = 'de',
    translationData,
  } = props;

  const { t, i18n } = useTranslation();

  // State
  const [isExpanded, setIsExpanded] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editDescription, setEditDescription] = useState(description ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveButtonShake, setSaveButtonShake] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // User's preferred language
  const userLanguage = mapToSupportedLanguage(i18n.language);

  // Translations from props (no DB loading in base hook)
  const translations = translationData ?? [];

  // Languages from props
  const languages = useMemo(() => {
    const all = new Set([userLanguage, ...(props.languages ?? [])]);
    return Array.from(all);
  }, [userLanguage, props.languages]);

  const isDirty = useMemo(() => {
    return editName !== name || editDescription !== (description ?? '');
  }, [editName, editDescription, name, description]);

  // Resolve which language to display
  const contentLanguage = useMemo(() => {
    if (userLanguage === sourceLanguage) return userLanguage;
    const hasTranslation = translations.some(t => t.language_code === userLanguage);
    if (hasTranslation) return userLanguage;
    if (props.languages?.includes(userLanguage)) return userLanguage;
    return sourceLanguage;
  }, [userLanguage, sourceLanguage, translations, props.languages]);

  const showLanguageFallbackBadge = contentLanguage !== userLanguage;

  const displayContent = useMemo(() => {
    const match = translations.find(t => t.language_code === contentLanguage);
    if (match) {
      return {
        name: match.name ?? name,
        description: match.description ?? description,
      };
    }
    return { name, description };
  }, [contentLanguage, translations, name, description]);

  // Image URL: direct prop only (no folder/path resolution in base hook)
  const imageUrl = directImageUrl ?? null;

  // Effects
  useEffect(() => {
    if (!isExpanded) {
      setEditName(name);
      setEditDescription(description ?? '');
    }
  }, [name, description, isExpanded]);

  useEffect(() => {
    if (!isExpanded) return;
    const handleClickOutside = () => {
      if (isDirty) {
        setSaveButtonShake(true);
        setTimeout(() => setSaveButtonShake(false), 600);
        return;
      }
      setIsExpanded(false);
      setEditName(name);
      setEditDescription(description ?? '');
    };
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isExpanded, name, description, isDirty]);

  // Handlers
  const handleCardClick = useCallback(() => {
    if (!isExpanded) {
      onClick?.();
    }
  }, [onClick, isExpanded]);

  const handleSave = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!id) return;

    setIsSaving(true);
    try {
      onUpdate?.({ name: editName, description: editDescription || null });
      onLanguagesChange?.(languages);
      setIsExpanded(false);
    } finally {
      setIsSaving(false);
    }
  }, [id, editName, editDescription, languages, onUpdate, onLanguagesChange]);

  const handleCancel = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDirty) {
      setSaveButtonShake(true);
      setTimeout(() => setSaveButtonShake(false), 600);
      return;
    }
    setIsExpanded(false);
    setEditName(name);
    setEditDescription(description ?? '');
  }, [name, description, isDirty]);

  return {
    state: {
      isExpanded,
      editName,
      editDescription,
      isSaving,
      saveButtonShake,
      isUploadingImage: false,
      isExporting: false,
      translations,
      translatingLangs: new Set<string>(),
    } as InstructionCardState,

    computed: {
      isDirty,
      languages,
      displayContent,
      imageUrl,
      contentLanguage,
      showLanguageFallbackBadge,
    },

    setters: {
      setIsExpanded,
      setEditName,
      setEditDescription,
    },

    handlers: {
      handleCardClick,
      handleSave,
      handleCancel,
      handleTranslate: () => {},
      handleImageSelect: () => {},
      handleImageDelete: () => {},
      handleUploadClick: () => {},
    },

    refs: {
      fileInputRef,
    },

    dropzone: {
      isDragOver: false,
      getRootProps: () => ({}),
      getInputProps: () => ({}),
    },
    t,
  };
}
