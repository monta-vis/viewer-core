import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Package, Wrench, Hash, FileText, Ruler, Box, Scale, ImageIcon, Trash2, Tag } from 'lucide-react';
import { clsx } from 'clsx';
import type { AggregatedPartTool, PartToolRow } from '@monta-vis/viewer-core';
import { TextInputModal, type TextInputSuggestion } from '@monta-vis/viewer-core';
import type { FrameCaptureData } from '@monta-vis/viewer-core';
import { PartToolImagePicker, type PartToolImageItem } from './PartToolImagePicker';
import { ImageCropDialog } from './ImageCropDialog';
import type { PartToolTableImageCallbacks } from './PartToolTable';
import type { NormalizedCrop } from '../persistence/types';

export interface PartToolDetailEditorProps {
  partToolId: string;
  item: AggregatedPartTool;
  onClose: () => void;
  /** Image management callbacks */
  imageCallbacks?: PartToolTableImageCallbacks;
  /** Resolve all images for the partTool (for image picker gallery) */
  getPartToolImages?: (partToolId: string) => PartToolImageItem[];
  /** Catalog of all partTools for name/label/partNumber swap */
  allPartTools?: PartToolRow[];
  /** Swap the current partTool reference with an existing one */
  onReplacePartTool?: (oldId: string, newId: string) => void;
  /** Create a new partTool with the given name and swap the reference */
  onCreatePartTool?: (oldId: string, newName: string) => void;
  /** Edit the substep-specific amount */
  onEditPartToolAmount?: (partToolId: string, newAmount: string) => void;
  /** Delete the partTool */
  onDeletePartTool?: (partToolId: string) => void;
  /** Update a generic field on the partTool */
  onUpdatePartTool?: (partToolId: string, updates: Partial<PartToolRow>) => void;
  /** Preview image URL for display */
  previewImageUrl?: string | null;
  /** Raw frame capture data for Editor preview */
  frameCaptureData?: FrameCaptureData | null;
}

/** Tappable field styling class (dashed outline on hover) */
const EDITABLE_FIELD_CLASS = 'cursor-pointer rounded px-1 -mx-1 hover:outline-2 hover:outline-dashed hover:outline-[var(--color-secondary)]/60';

/** Which field is currently being edited */
type EditingField = 'name' | 'label' | 'partNumber' | 'amount' | 'unit' | 'material' | 'dimension' | 'description';

/** Fields that show catalog suggestions (search + swap) */
function hasCatalogSuggestions(field: EditingField): boolean {
  return field === 'name' || field === 'label' || field === 'partNumber';
}

/**
 * PartToolDetailEditor - Full editable detail view for a single part/tool.
 *
 * Lives in editor-core (not viewer-core) so it can use PartToolImagePicker,
 * ImageCropDialog, and other editor-only components directly.
 */
export function PartToolDetailEditor({
  partToolId,
  item,
  onClose,
  imageCallbacks,
  getPartToolImages,
  allPartTools,
  onReplacePartTool,
  onCreatePartTool,
  onEditPartToolAmount,
  onDeletePartTool,
  onUpdatePartTool,
  previewImageUrl,
  frameCaptureData: _frameCaptureData,
}: PartToolDetailEditorProps) {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);

  // Internal state for TextInputModal
  const [editingField, setEditingField] = useState<{ field: EditingField; currentValue: string } | null>(null);

  // Image picker state
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [imagePickerPos, setImagePickerPos] = useState<{ left: number; bottom: number }>({ left: 0, bottom: 0 });

  // File upload + crop state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFileRef = useRef<File | null>(null);
  const [cropDialogSrc, setCropDialogSrc] = useState<string | null>(null);

  // Revoke object URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (cropDialogSrc) URL.revokeObjectURL(cropDialogSrc);
    };
  }, [cropDialogSrc]);

  // Close editing when item changes
  useEffect(() => {
    setEditingField(null);
  }, [partToolId]);

  // Close on Escape key (only when TextInputModal is NOT open)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !editingField) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, editingField]);

  // Focus trap and body scroll lock
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    modalRef.current?.focus();
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const isPart = item.partTool.type === 'Part';
  const Icon = isPart ? Package : Wrench;
  const accentColor = isPart ? 'var(--color-element-part)' : 'var(--color-element-tool)';
  const typeLabel = isPart
    ? t('instructionView.part', 'Part')
    : t('instructionView.tool', 'Tool');

  // Build catalog suggestions from allPartTools
  const catalogSuggestions: TextInputSuggestion[] = useMemo(() => {
    if (!allPartTools) return [];
    return allPartTools.map((p) => ({
      id: p.id,
      label: p.name,
      sublabel: [p.label, p.partNumber].filter(Boolean).join(' · ') || undefined,
    }));
  }, [allPartTools]);

  /** i18n field labels for the TextInputModal header */
  const fieldLabels: Record<EditingField, string> = useMemo(() => ({
    name: t('instructionView.fieldName', 'Name'),
    label: t('instructionView.fieldLabel', 'Label'),
    partNumber: t('instructionView.fieldPartNumber', 'Part number'),
    amount: t('instructionView.fieldAmount', 'Amount'),
    unit: t('instructionView.fieldUnit', 'Unit'),
    material: t('instructionView.fieldMaterial', 'Material'),
    dimension: t('instructionView.fieldDimension', 'Dimension'),
    description: t('instructionView.fieldDescription', 'Description'),
  }), [t]);

  /** Unified confirm handler for all fields (primary action = update existing) */
  const handleFieldConfirm = useCallback((newValue: string) => {
    if (!editingField) return;
    const { field } = editingField;

    if (field === 'amount') {
      onEditPartToolAmount?.(partToolId, newValue);
    } else {
      const trimmed = newValue.trim();
      onUpdatePartTool?.(partToolId, { [field]: trimmed || null });
    }
    setEditingField(null);
  }, [editingField, partToolId, onEditPartToolAmount, onUpdatePartTool]);

  /** Secondary confirm handler: create a new partTool and swap the reference */
  const handleSecondaryConfirm = useCallback((newValue: string) => {
    onCreatePartTool?.(partToolId, newValue.trim());
    setEditingField(null);
  }, [onCreatePartTool, partToolId]);

  /** Handle catalog suggestion select (swap reference) */
  const handleNameSelect = useCallback((selectedId: string) => {
    onReplacePartTool?.(partToolId, selectedId);
    setEditingField(null);
  }, [onReplacePartTool, partToolId]);

  const handleFieldCancel = useCallback(() => setEditingField(null), []);

  // ── Image handling ──
  const handleImageEditClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setImagePickerPos({ left: rect.left, bottom: window.innerHeight - rect.top });
    setImagePickerOpen(true);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    pendingFileRef.current = file;
    setCropDialogSrc(URL.createObjectURL(file));
    e.target.value = '';
  }, []);

  const handleCropConfirm = useCallback((crop: NormalizedCrop) => {
    const file = pendingFileRef.current;
    if (file && imageCallbacks?.onUploadImage) {
      imageCallbacks.onUploadImage(partToolId, file, crop);
    }
    if (cropDialogSrc) URL.revokeObjectURL(cropDialogSrc);
    setCropDialogSrc(null);
    pendingFileRef.current = null;
  }, [imageCallbacks, partToolId, cropDialogSrc]);

  const handleCropCancel = useCallback(() => {
    if (cropDialogSrc) URL.revokeObjectURL(cropDialogSrc);
    setCropDialogSrc(null);
    pendingFileRef.current = null;
  }, [cropDialogSrc]);

  const images = getPartToolImages?.(partToolId) ?? [];

  return (
    <>
      {/* Backdrop with blur */}
      <div
        className={clsx(
          'fixed inset-0 z-50 transition-all duration-300',
          'bg-black/60 backdrop-blur-sm opacity-100',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="parttool-editor-title"
        tabIndex={-1}
        className={clsx(
          'fixed inset-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2',
          'sm:w-full sm:max-w-md',
          'z-50 outline-none',
          'transition-all duration-300 ease-out',
          'opacity-100 scale-100',
        )}
      >
        <div className="h-full sm:h-auto flex flex-col bg-[var(--color-bg-surface)] rounded-2xl overflow-hidden shadow-2xl border border-[var(--color-border-muted)]">

          {/* Image Section - Hero area */}
          <div className="relative bg-[var(--color-bg-base)] aspect-square sm:aspect-[4/3]">
            {previewImageUrl ? (
              <img
                src={previewImageUrl}
                alt={item.partTool.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Icon
                  className="w-24 h-24 opacity-20"
                  style={{ color: accentColor }}
                />
              </div>
            )}

            {/* Subtle vignette overlay (only when an image is shown) */}
            {previewImageUrl && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.15) 100%)'
                }}
              />
            )}

            {/* Image edit button (bottom left) */}
            {imageCallbacks && (
              <div className="absolute bottom-3 left-3 z-30">
                <button
                  type="button"
                  aria-label={t('editorCore.editImage', 'Edit image')}
                  className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-colors cursor-pointer"
                  onClick={handleImageEditClick}
                >
                  <ImageIcon className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Close button - top right */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white/90 hover:bg-black/60 hover:text-white transition-all"
              aria-label={t('common.close', 'Close')}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Type badge - top left */}
            <div
              className="absolute top-3 left-3 px-3 py-1.5 rounded-full backdrop-blur-md flex items-center gap-2 text-white font-medium text-sm"
              style={{ backgroundColor: `color-mix(in srgb, ${accentColor} 85%, black)` }}
            >
              <Icon className="w-4 h-4" />
              <span>{typeLabel}</span>
            </div>

            {/* Quantity badge - bottom right, editable */}
            <div
              data-testid="editable-amount"
              className={clsx(
                'absolute bottom-3 right-3 px-5 py-2 rounded-xl bg-white/95 backdrop-blur-md shadow-lg border border-black/5',
                EDITABLE_FIELD_CLASS,
              )}
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); flushSync(() => setEditingField({ field: 'amount', currentValue: String(item.totalAmount) })); }}
              onKeyDown={(e) => { if (e.key === 'Enter') flushSync(() => setEditingField({ field: 'amount', currentValue: String(item.totalAmount) })); }}
            >
              <span
                className="text-2xl font-bold tabular-nums"
                style={{ color: accentColor }}
              >
                {item.totalAmount}×
              </span>
            </div>
          </div>

          {/* Content Section */}
          <div className="flex-1 sm:flex-none p-5 space-y-4 overflow-y-auto">

            {/* Name — editable (search + swap) */}
            <div
              data-testid="editable-name"
              className={EDITABLE_FIELD_CLASS}
              role="button"
              tabIndex={0}
              onClick={() => flushSync(() => setEditingField({ field: 'name', currentValue: item.partTool.name }))}
              onKeyDown={(e) => { if (e.key === 'Enter') flushSync(() => setEditingField({ field: 'name', currentValue: item.partTool.name })); }}
            >
              <h2
                id="parttool-editor-title"
                className="text-xl font-semibold text-[var(--color-text-base)] leading-tight"
              >
                {item.partTool.name}
              </h2>
            </div>

            {/* Label — editable (search + swap) */}
            <div
              data-testid="editable-label"
              className={clsx(
                'flex items-center gap-2 text-[var(--color-text-muted)]',
                EDITABLE_FIELD_CLASS,
              )}
              role="button"
              tabIndex={0}
              onClick={() => flushSync(() => setEditingField({ field: 'label', currentValue: item.partTool.label ?? '' }))}
              onKeyDown={(e) => { if (e.key === 'Enter') flushSync(() => setEditingField({ field: 'label', currentValue: item.partTool.label ?? '' })); }}
            >
              <Tag className="w-4 h-4 flex-shrink-0" style={{ color: accentColor }} />
              {item.partTool.label ? (
                <span className="font-semibold text-sm">{item.partTool.label}</span>
              ) : (
                <span className="text-sm text-[var(--color-text-subtle)] italic">{t('instructionView.addLabel', 'Add label')}</span>
              )}
            </div>

            {/* Part Number — editable (search + swap) */}
            <div
              data-testid="editable-partNumber"
              className={clsx(
                'flex items-center gap-2 text-[var(--color-text-muted)]',
                EDITABLE_FIELD_CLASS,
              )}
              role="button"
              tabIndex={0}
              onClick={() => flushSync(() => setEditingField({ field: 'partNumber', currentValue: item.partTool.partNumber ?? '' }))}
              onKeyDown={(e) => { if (e.key === 'Enter') flushSync(() => setEditingField({ field: 'partNumber', currentValue: item.partTool.partNumber ?? '' })); }}
            >
              <Hash className="w-4 h-4 flex-shrink-0" style={{ color: accentColor }} />
              {item.partTool.partNumber ? (
                <span className="font-mono text-sm tracking-wide">{item.partTool.partNumber}</span>
              ) : (
                <span className="text-sm text-[var(--color-text-subtle)] italic">{t('instructionView.addPartNumber', 'Add part number')}</span>
              )}
            </div>

            {/* Unit / Material / Dimension — always shown (editable) */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--color-text-muted)]">
              <div
                data-testid="editable-unit"
                className={clsx('flex items-center gap-1.5', EDITABLE_FIELD_CLASS)}
                role="button"
                tabIndex={0}
                onClick={() => flushSync(() => setEditingField({ field: 'unit', currentValue: item.partTool.unit ?? '' }))}
                onKeyDown={(e) => { if (e.key === 'Enter') flushSync(() => setEditingField({ field: 'unit', currentValue: item.partTool.unit ?? '' })); }}
              >
                <Scale className="w-3.5 h-3.5 flex-shrink-0 text-[var(--color-text-subtle)]" />
                {item.partTool.unit ? (
                  <span>{item.partTool.unit}</span>
                ) : (
                  <span className="text-[var(--color-text-subtle)] italic">{t('instructionView.addUnit', 'Add unit')}</span>
                )}
              </div>
              <div
                data-testid="editable-material"
                className={clsx('flex items-center gap-1.5', EDITABLE_FIELD_CLASS)}
                role="button"
                tabIndex={0}
                onClick={() => flushSync(() => setEditingField({ field: 'material', currentValue: item.partTool.material ?? '' }))}
                onKeyDown={(e) => { if (e.key === 'Enter') flushSync(() => setEditingField({ field: 'material', currentValue: item.partTool.material ?? '' })); }}
              >
                <Box className="w-3.5 h-3.5 flex-shrink-0 text-[var(--color-text-subtle)]" />
                {item.partTool.material ? (
                  <span>{item.partTool.material}</span>
                ) : (
                  <span className="text-[var(--color-text-subtle)] italic">{t('instructionView.addMaterial', 'Add material')}</span>
                )}
              </div>
              <div
                data-testid="editable-dimension"
                className={clsx('flex items-center gap-1.5', EDITABLE_FIELD_CLASS)}
                role="button"
                tabIndex={0}
                onClick={() => flushSync(() => setEditingField({ field: 'dimension', currentValue: item.partTool.dimension ?? '' }))}
                onKeyDown={(e) => { if (e.key === 'Enter') flushSync(() => setEditingField({ field: 'dimension', currentValue: item.partTool.dimension ?? '' })); }}
              >
                <Ruler className="w-3.5 h-3.5 flex-shrink-0 text-[var(--color-text-subtle)]" />
                {item.partTool.dimension ? (
                  <span>{item.partTool.dimension}</span>
                ) : (
                  <span className="text-[var(--color-text-subtle)] italic">{t('instructionView.addDimension', 'Add dimension')}</span>
                )}
              </div>
            </div>

            {/* Description — editable */}
            <div
              data-testid="editable-description"
              className={clsx('flex gap-2', EDITABLE_FIELD_CLASS)}
              role="button"
              tabIndex={0}
              onClick={() => flushSync(() => setEditingField({ field: 'description', currentValue: item.partTool.description ?? '' }))}
              onKeyDown={(e) => { if (e.key === 'Enter') flushSync(() => setEditingField({ field: 'description', currentValue: item.partTool.description ?? '' })); }}
            >
              <FileText className="w-4 h-4 flex-shrink-0 mt-0.5 text-[var(--color-text-subtle)]" />
              {item.partTool.description ? (
                <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{item.partTool.description}</p>
              ) : (
                <p className="text-sm text-[var(--color-text-subtle)] italic">{t('instructionView.addDescription', 'Add description')}</p>
              )}
            </div>

            {/* Delete button */}
            {onDeletePartTool && (
              <button
                type="button"
                aria-label={t('editorCore.deletePartTool', 'Delete part/tool')}
                className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600 transition-colors cursor-pointer"
                onClick={() => onDeletePartTool(partToolId)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{t('editorCore.deletePartTool', 'Delete part/tool')}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Single TextInputModal for all field editing */}
      {editingField && (() => {
        const dualConfirm =
          hasCatalogSuggestions(editingField.field) &&
          !!onCreatePartTool &&
          item.partTool.name !== '';
        return (
          <TextInputModal
            label={fieldLabels[editingField.field]}
            value={editingField.currentValue}
            inputType={editingField.field === 'amount' ? 'number' : editingField.field === 'description' ? 'textarea' : 'text'}
            onConfirm={handleFieldConfirm}
            onCancel={handleFieldCancel}
            suggestions={hasCatalogSuggestions(editingField.field) ? catalogSuggestions : undefined}
            onSelect={hasCatalogSuggestions(editingField.field) ? handleNameSelect : undefined}
            onSecondaryConfirm={dualConfirm ? handleSecondaryConfirm : undefined}
            secondaryConfirmLabel={dualConfirm ? t('editorCore.createNewPartTool', 'Create new') : undefined}
            confirmLabel={dualConfirm ? t('editorCore.updateExisting', 'Update') : undefined}
          />
        );
      })()}

      {/* Image picker popover */}
      {imageCallbacks && (
        <>
          <PartToolImagePicker
            open={imagePickerOpen}
            onClose={() => setImagePickerOpen(false)}
            position={imagePickerPos}
            images={images}
            onSelect={(junctionId, areaId) => {
              imageCallbacks.onSetPreviewImage?.(partToolId, junctionId, areaId);
              setImagePickerOpen(false);
            }}
            onAdd={() => {
              fileInputRef.current?.click();
              setImagePickerOpen(false);
            }}
            onDelete={imageCallbacks.onDeleteImage
              ? (_junctionId, areaId) => {
                  imageCallbacks.onDeleteImage!(partToolId, areaId);
                }
              : undefined}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          {cropDialogSrc && (
            <ImageCropDialog
              open
              imageSrc={cropDialogSrc}
              onConfirm={handleCropConfirm}
              onCancel={handleCropCancel}
            />
          )}
        </>
      )}
    </>
  );
}
