import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, ImagePlus, X } from 'lucide-react';
import type { PartToolRow } from '@monta-vis/viewer-core';
import { TextInputModal, PartIcon, ToolIcon } from '@monta-vis/viewer-core';
import { computeUsedAmount, isPartToolNameValid } from '../utils/partToolHelpers';
import { ImageCropDialog } from './ImageCropDialog';
import { PartToolImagePicker, type PartToolImageItem } from './PartToolImagePicker';
import type { NormalizedCrop } from '../persistence/types';

export interface PartToolTableItem {
  rowId: string;
  partTool: PartToolRow;
  amount: number;
}

export interface PartToolTableCallbacks {
  onUpdatePartTool: (partToolId: string, updates: Partial<PartToolRow>) => void;
  onUpdateAmount: (rowId: string, amount: number) => void;
  onDelete: (rowId: string) => void;
}

export interface PartToolTableImageCallbacks {
  onUploadImage: (partToolId: string, image: File, crop: NormalizedCrop) => void;
  onDeleteImage?: (partToolId: string, areaId: string) => void;
  onSetPreviewImage?: (partToolId: string, junctionId: string, areaId: string) => void;
}

export interface PartToolTableProps {
  rows: PartToolTableItem[];
  callbacks: PartToolTableCallbacks;
  /** All substepPartTools for computing "Used" amounts. */
  allSubstepPartTools?: Record<string, { partToolId: string; amount: number }>;
  /** Called when user clicks a catalog field (name/label/partNumber) to open the PartToolListPanel. */
  onOpenPartToolList?: () => void;
  /** Resolve a partTool ID to a thumbnail URL (or null). */
  getPreviewUrl?: (partToolId: string) => string | null;
  /** Image upload/delete callbacks (enables thumbnail column interaction). */
  imageCallbacks?: PartToolTableImageCallbacks;
  /** Resolve all images for a partTool (for image picker gallery). */
  getPartToolImages?: (partToolId: string) => PartToolImageItem[];
  /** Prefix for data-testid attributes (default "parttool-row"). */
  testIdPrefix?: string;
}

/** Compact inline-editable table for partTools — used by both SubstepEditPopover and PartToolListPanel. */
export function PartToolTable({
  rows,
  callbacks,
  allSubstepPartTools,
  allPartTools,
  getPreviewUrl,
  imageCallbacks,
  getPartToolImages,
  testIdPrefix = 'parttool-row',
}: PartToolTableProps) {
  const { t } = useTranslation();
  const showThumbnails = !!getPreviewUrl;

  return (
    <table className="w-full text-base border-collapse" data-testid="parttool-table">
      <thead>
        <tr className="text-[var(--color-text-muted)] text-left">
          {showThumbnails && (
            <th className="px-2 py-1.5 font-medium w-[2.5rem]">{t('editorCore.thumbnail', 'Img')}</th>
          )}
          <th className="px-2 py-1.5 font-medium w-[2.5rem]">{t('editorCore.typeColumn', 'Type')}</th>
          <th className="px-2 py-1.5 font-medium w-[3.5rem]">{t('editorCore.partToolLabel', 'Label')}</th>
          <th className="px-2 py-1.5 font-medium w-[10rem]">{t('editorCore.partToolName', 'Name')}</th>
          <th className="px-2 py-1.5 font-medium w-[7rem]">{t('editorCore.partToolPartNumber', 'Part#')}</th>
          <th className="px-2 py-1.5 font-medium w-[3.5rem]">{t('editorCore.partToolAmount', 'Amt')}</th>
          {allSubstepPartTools && (
            <th className="px-2 py-1.5 font-medium w-[3.5rem]">{t('editorCore.partToolUsed', 'Used')}</th>
          )}
          <th className="px-2 py-1.5 font-medium w-[4rem]">{t('editorCore.partToolUnit', 'Unit')}</th>
          <th className="px-2 py-1.5 font-medium w-[6rem]">{t('editorCore.partToolMaterial', 'Material')}</th>
          <th className="px-2 py-1.5 font-medium w-[4rem]">{t('editorCore.partToolDimension', 'Dim.')}</th>
          <th className="px-2 py-1.5 font-medium">{t('editorCore.partToolDescription', 'Description')}</th>
          <th className="px-2 py-1.5 w-[2rem]" />
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <PartToolTableRow
            key={row.rowId}
            row={row}
            callbacks={callbacks}
            allSubstepPartTools={allSubstepPartTools}
            allPartTools={allPartTools}
            getPreviewUrl={getPreviewUrl}
            imageCallbacks={imageCallbacks}
            getPartToolImages={getPartToolImages}
            testIdPrefix={testIdPrefix}
          />
        ))}
      </tbody>
    </table>
  );
}

// ── Row component ──

type PartToolFieldKey = 'label' | 'name' | 'partNumber' | 'amount' | 'unit' | 'material' | 'dimension' | 'description';

const AUTOCOMPLETE_FIELDS: ReadonlySet<PartToolFieldKey> = new Set(['name', 'label', 'partNumber']);

/** Check if an autocomplete field on an existing partTool should show "Create new" vs "Update existing" buttons. */
function shouldShowDualConfirm(
  field: PartToolFieldKey,
  hasCreateCallback: boolean,
  partToolName: string,
): boolean {
  return AUTOCOMPLETE_FIELDS.has(field) && hasCreateCallback && partToolName !== '';
}

interface EditingField {
  field: PartToolFieldKey;
  label: string;
  value: string;
  inputType: 'text' | 'number';
  withSuggestions: boolean;
}

const CELL_BTN_CLASS = 'w-full text-left text-base truncate cursor-pointer hover:bg-[var(--color-bg-hover)] rounded px-1 py-0.5 transition-colors';

interface RowProps {
  row: PartToolTableItem;
  callbacks: PartToolTableCallbacks;
  allSubstepPartTools?: Record<string, { partToolId: string; amount: number }>;
  allPartTools?: PartToolRow[];
  getPreviewUrl?: (partToolId: string) => string | null;
  imageCallbacks?: PartToolTableImageCallbacks;
  getPartToolImages?: (partToolId: string) => PartToolImageItem[];
  testIdPrefix: string;
}

const PartToolTableRow = memo(function PartToolTableRow({
  row,
  callbacks,
  allSubstepPartTools,
  allPartTools,
  getPreviewUrl,
  imageCallbacks,
  getPartToolImages,
  testIdPrefix,
}: RowProps) {
  const { t } = useTranslation();
  const pt = row.partTool;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropDialogSrc, setCropDialogSrc] = useState<string | null>(null);
  const pendingFileRef = useRef<File | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerPos, setPickerPos] = useState<{ left: number; bottom: number } | null>(null);

  // ── Modal-based cell editing ──
  const [editingField, setEditingField] = useState<EditingField | null>(null);

  const isTool = pt.type === 'Tool';
  const nameValid = isPartToolNameValid(pt.name);

  const toggleType = useCallback(() => {
    callbacks.onUpdatePartTool(pt.id, { type: pt.type === 'Tool' ? 'Part' : 'Tool' });
  }, [pt.id, pt.type, callbacks]);

  const partToolItems = useMemo(() => toPartToolSelectItems(allPartTools ?? []), [allPartTools]);

  const handleSelectSuggestion = useCallback(
    (partToolId: string) => {
      callbacks.onSelectPartTool?.(row.rowId, partToolId);
      setEditingField(null);
    },
    [callbacks, row.rowId],
  );

  const openField = useCallback((field: PartToolFieldKey, label: string, value: string, inputType: 'text' | 'number' = 'text', withSuggestions = false) => {
    setEditingField({ field, label, value, inputType, withSuggestions });
  }, []);

  /** Apply a direct field update (no choice dialog). */
  const applyFieldUpdate = useCallback((field: PartToolFieldKey, newValue: string) => {
    if (field === 'amount') {
      const parsed = Math.max(1, parseInt(newValue, 10) || 1);
      if (parsed !== row.amount) {
        callbacks.onUpdateAmount(row.rowId, parsed);
      }
    } else if (field === 'name') {
      const trimmed = newValue.trim();
      if (trimmed !== pt.name) {
        callbacks.onUpdatePartTool(pt.id, { name: trimmed });
      }
    } else {
      const trimmed = newValue.trim();
      const next = trimmed === '' ? null : trimmed;
      const prev = pt[field] as string | null | undefined;
      if (next !== prev) {
        callbacks.onUpdatePartTool(pt.id, { [field]: next } as Partial<PartToolRow>);
      }
    }
  }, [row.rowId, row.amount, pt, callbacks]);

  const handleFieldConfirm = useCallback((newValue: string) => {
    if (!editingField) return;
    applyFieldUpdate(editingField.field, newValue);
    setEditingField(null);
  }, [editingField, applyFieldUpdate]);

  const handleSecondaryConfirm = useCallback((newValue: string) => {
    if (!editingField) return;
    const { field } = editingField;
    callbacks.onCreateAndReplacePartTool?.(row.rowId, field as 'name' | 'label' | 'partNumber', newValue.trim());
    setEditingField(null);
  }, [editingField, callbacks, row.rowId]);

  const handleFieldCancel = useCallback(() => {
    setEditingField(null);
  }, []);

  const handleDelete = useCallback(() => callbacks.onDelete(row.rowId), [callbacks, row.rowId]);

  const used = useMemo(
    () => allSubstepPartTools ? computeUsedAmount(pt.id, pt.type, allSubstepPartTools) : null,
    [pt.id, pt.type, allSubstepPartTools],
  );
  const mismatch = used !== null && used !== pt.amount;

  // ── Image handling ──
  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
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
      imageCallbacks.onUploadImage(pt.id, file, crop);
    }
    if (cropDialogSrc) URL.revokeObjectURL(cropDialogSrc);
    setCropDialogSrc(null);
    pendingFileRef.current = null;
  }, [imageCallbacks, pt.id, cropDialogSrc]);

  const handleCropCancel = useCallback(() => {
    if (cropDialogSrc) URL.revokeObjectURL(cropDialogSrc);
    setCropDialogSrc(null);
    pendingFileRef.current = null;
  }, [cropDialogSrc]);

  const previewUrl = getPreviewUrl?.(pt.id) ?? null;

  /** Render a clickable cell that opens TextInputModal on click */
  const renderCell = useCallback((field: PartToolFieldKey, displayValue: string, placeholder: string, inputType: 'text' | 'number' = 'text', withSuggestions = false, extraClass = '') => (
    <button
      type="button"
      data-testid={`${testIdPrefix}-${field}-${row.rowId}`}
      className={`${CELL_BTN_CLASS} ${extraClass}`}
      onClick={() => openField(field, placeholder, displayValue, inputType, withSuggestions)}
    >
      <span className={displayValue ? '' : 'text-[var(--color-text-muted)]'}>
        {displayValue || placeholder}
      </span>
    </button>
  ), [testIdPrefix, row.rowId, openField]);

  return (
    <tr data-testid={`${testIdPrefix}-${row.rowId}`} className="hover:bg-[var(--color-bg-hover)] transition-colors">
      {/* Thumbnail (optional) */}
      {getPreviewUrl && (
        <td className="px-2 py-1.5">
          {getPartToolImages ? (
            /* Gallery mode: clickable thumbnail opens PartToolImagePicker */
            <>
              <button
                type="button"
                data-testid={`${testIdPrefix}-thumbnail-${row.rowId}`}
                aria-label={t('editorCore.openImagePicker', 'Open image picker')}
                className="h-6 w-6 rounded overflow-hidden cursor-pointer hover:ring-1 hover:ring-[var(--color-secondary)] transition-all"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setPickerPos({ left: rect.left, bottom: window.innerHeight - rect.top + 4 });
                  setPickerOpen(true);
                }}
              >
                {previewUrl ? (
                  <img src={previewUrl} alt={pt.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-[var(--color-bg-hover)] flex items-center justify-center text-[var(--color-text-muted)]">
                    <ImagePlus className="h-3 w-3" />
                  </div>
                )}
              </button>
              <PartToolImagePicker
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                position={pickerPos ?? { left: 0, bottom: 0 }}
                images={getPartToolImages(pt.id)}
                onSelect={(junctionId, areaId) => {
                  imageCallbacks?.onSetPreviewImage?.(pt.id, junctionId, areaId);
                  setPickerOpen(false);
                }}
                onAdd={() => {
                  setPickerOpen(false);
                  handleUploadClick();
                }}
                onDelete={imageCallbacks?.onDeleteImage
                  ? (_junctionId, areaId) => imageCallbacks.onDeleteImage!(pt.id, areaId)
                  : undefined}
              />
            </>
          ) : (
            /* Legacy mode: static thumbnail + upload/delete overlay */
            <>
              {(() => {
                if (previewUrl) {
                  return (
                    <div className="relative group h-6 w-6">
                      <img
                        src={previewUrl}
                        alt={pt.name}
                        data-testid={`${testIdPrefix}-thumbnail-${row.rowId}`}
                        className="h-6 w-6 object-cover rounded"
                      />
                      {imageCallbacks?.onDeleteImage && (
                        <button
                          type="button"
                          data-testid={`${testIdPrefix}-delete-image-${row.rowId}`}
                          aria-label={t('editorCore.deleteImage', 'Delete image')}
                          className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          onClick={() => imageCallbacks.onDeleteImage!(pt.id, pt.previewImageId ?? '')}
                        >
                          <X className="h-2 w-2" />
                        </button>
                      )}
                    </div>
                  );
                }
                if (imageCallbacks?.onUploadImage) {
                  return (
                    <button
                      type="button"
                      data-testid={`${testIdPrefix}-upload-${row.rowId}`}
                      aria-label={t('editorCore.uploadImage', 'Upload image')}
                      className="h-6 w-6 rounded bg-[var(--color-bg-hover)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-secondary)] transition-colors cursor-pointer"
                      onClick={handleUploadClick}
                    >
                      <ImagePlus className="h-3 w-3" />
                    </button>
                  );
                }
                return <div className="h-6 w-6 rounded bg-[var(--color-bg-hover)]" />;
              })()}
            </>
          )}
          {imageCallbacks?.onUploadImage && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              data-testid={`${testIdPrefix}-file-input-${row.rowId}`}
              onChange={handleFileSelect}
            />
          )}
          {cropDialogSrc && (
            <ImageCropDialog
              open
              imageSrc={cropDialogSrc}
              onConfirm={handleCropConfirm}
              onCancel={handleCropCancel}
            />
          )}
        </td>
      )}

      {/* Type toggle */}
      <td className="px-2 py-1.5">
        <button
          type="button"
          data-testid={`${testIdPrefix}-type-${row.rowId}`}
          aria-label={isTool ? t('editorCore.typeTool', 'Tool') : t('editorCore.typePart', 'Part')}
          className="flex items-center justify-center w-full cursor-pointer transition-colors"
          onClick={toggleType}
        >
          {isTool
            ? <ToolIcon className="h-3 w-3 text-[var(--color-element-tool)]" />
            : <PartIcon className="h-3 w-3 text-[var(--color-element-part)]" />}
        </button>
      </td>

      {/* Label */}
      <td className="px-2 py-1.5">
        {renderCell('label', pt.label ?? '', t('editorCore.partToolLabel', 'Label'), 'text', !!allPartTools)}
      </td>

      {/* Name */}
      <td className="px-2 py-1.5">
        {renderCell('name', pt.name, t('editorCore.partToolName', 'Name'), 'text', !!allPartTools, !nameValid ? 'text-red-500' : '')}
      </td>

      {/* Part# */}
      <td className="px-2 py-1.5">
        {renderCell('partNumber', pt.partNumber ?? '', t('editorCore.partToolPartNumber', 'Part#'), 'text', !!allPartTools)}
      </td>

      {/* Amount */}
      <td className="px-2 py-1.5">
        {renderCell('amount', String(row.amount), t('editorCore.partToolAmount', 'Amt'), 'number')}
      </td>

      {/* Used (read-only, shown when allSubstepPartTools provided) */}
      {allSubstepPartTools && (
        <td className="px-2 py-1.5">
          <span
            data-testid={`${testIdPrefix}-used-${row.rowId}`}
            className={`text-base ${mismatch ? 'text-red-500 font-semibold' : 'text-[var(--color-text-muted)]'}`}
          >
            {used}
          </span>
        </td>
      )}

      {/* Unit */}
      <td className="px-2 py-1.5">
        {renderCell('unit', pt.unit ?? '', t('editorCore.partToolUnit', 'Unit'))}
      </td>

      {/* Material */}
      <td className="px-2 py-1.5">
        {renderCell('material', pt.material ?? '', t('editorCore.partToolMaterial', 'Material'))}
      </td>

      {/* Dimension */}
      <td className="px-2 py-1.5">
        {renderCell('dimension', pt.dimension ?? '', t('editorCore.partToolDimension', 'Dim.'))}
      </td>

      {/* Description */}
      <td className="px-2 py-1.5">
        {renderCell('description', pt.description ?? '', t('editorCore.partToolDescription', 'Description'))}
      </td>

      {/* Delete */}
      <td className="px-2 py-1.5">
        <button
          type="button"
          data-testid={`${testIdPrefix}-delete-${row.rowId}`}
          aria-label={t('editorCore.deletePartTool', 'Delete part/tool')}
          className="flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-danger)] transition-colors cursor-pointer"
          onClick={handleDelete}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </td>

      {/* Modal for cell editing — PartToolSelectModal for catalog fields, TextInputModal otherwise */}
      {editingField && (() => {
        const dualConfirm = shouldShowDualConfirm(editingField.field, !!callbacks.onCreateAndReplacePartTool, pt.name);
        if (editingField.withSuggestions) {
          return (
            <PartToolSelectModal
              label={editingField.label}
              value={editingField.value}
              inputType={editingField.inputType}
              onConfirm={handleFieldConfirm}
              onCancel={handleFieldCancel}
              items={partToolItems}
              onSelect={handleSelectSuggestion}
              getPreviewUrl={getPreviewUrl ? (item) => getPreviewUrl(item.id) : undefined}
              onSecondaryConfirm={dualConfirm ? handleSecondaryConfirm : undefined}
              secondaryConfirmLabel={dualConfirm ? t('editorCore.createNewPartTool', 'Create new') : undefined}
              confirmLabel={dualConfirm ? t('editorCore.updateExisting', 'Update') : undefined}
            />
          );
        }
        return (
          <TextInputModal
            label={editingField.label}
            value={editingField.value}
            inputType={editingField.inputType}
            onConfirm={handleFieldConfirm}
            onCancel={handleFieldCancel}
          />
        );
      })()}
    </tr>
  );
});
