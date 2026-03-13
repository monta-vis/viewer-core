import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, ImagePlus, X, Plus, Pencil } from 'lucide-react';
import type { PartToolRow } from '@monta-vis/viewer-core';
import { TextInputModal, PartIcon, ToolIcon, ConfirmDeleteDialog } from '@monta-vis/viewer-core';
import { computeUsedAmount, isPartToolNameValid } from '../utils/partToolHelpers';
import { ImageCropDialog } from './ImageCropDialog';
import { PartToolImagePicker, type PartToolImageItem } from './PartToolImagePicker';
import { EditInput } from './EditInput';
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

export interface PartToolAddRowValues {
  type: 'Part' | 'Tool';
  label: string;
  name: string;
  partNumber: string;
  amount: number;
  unit: string;
  material: string;
  dimension: string;
  description: string;
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
  /** Disables inline editing, hides delete column — table becomes a read-only selection list. */
  readOnly?: boolean;
  /** Highlights the row matching this ID with a selected background. */
  selectedRowId?: string | null;
  /** Called when a row is clicked (useful for selection). */
  onRowClick?: (row: PartToolTableItem) => void;
  /** When set, the matching row renders inline EditInput fields instead of buttons/spans. */
  editingRowId?: string | null;
  /** When provided, renders an empty editable row at the top of tbody for adding a new item. */
  addRow?: {
    values: PartToolAddRowValues;
    onChange: (v: PartToolAddRowValues) => void;
    onConfirm: () => void;
    canConfirm: boolean;
  };
  /** Compact mode: shows only thumbnail/type/name/part#/amount columns, forces read-only, hides addRow. */
  compact?: boolean;
  /** Called when the edit icon is clicked on a row (compact mode only). */
  onEditClick?: (row: PartToolTableItem) => void;
}

/** Compact inline-editable table for partTools — used by both SubstepEditPopover and PartToolListPanel. */
export function PartToolTable({
  rows,
  callbacks,
  allSubstepPartTools,
  onOpenPartToolList,
  getPreviewUrl,
  imageCallbacks,
  getPartToolImages,
  testIdPrefix = 'parttool-row',
  readOnly,
  selectedRowId,
  onRowClick,
  editingRowId,
  addRow,
  compact,
  onEditClick,
}: PartToolTableProps) {
  const { t } = useTranslation();
  const effectiveReadOnly = compact || readOnly;
  const effectiveEditingRowId = compact ? undefined : editingRowId;
  const effectiveAddRow = compact ? undefined : addRow;
  const showAllSubstepPartTools = !compact && !!allSubstepPartTools;
  const showThumbnails = !!getPreviewUrl;
  const showActionCol = !effectiveReadOnly || !!effectiveEditingRowId || !!effectiveAddRow || (compact && !!onEditClick);

  return (
    <table className="w-full text-base border-collapse" data-testid="parttool-table">
      <thead>
        <tr className="text-[var(--color-text-muted)] text-left">
          {showThumbnails && (
            <th className="px-2 py-1.5 font-medium w-[2.5rem]">{t('editorCore.thumbnail', 'Img')}</th>
          )}
          <th className="px-2 py-1.5 font-medium w-[2.5rem]">{t('editorCore.typeColumn', 'Type')}</th>
          {!compact && <th className="px-2 py-1.5 font-medium w-[3.5rem]">{t('editorCore.partToolLabel', 'Label')}</th>}
          <th className="px-2 py-1.5 font-medium w-[10rem]">{t('editorCore.partToolName', 'Name')}</th>
          <th className="px-2 py-1.5 font-medium w-[7rem]">{t('editorCore.partToolPartNumber', 'Part#')}</th>
          <th className="px-2 py-1.5 font-medium w-[3.5rem]">{t('editorCore.partToolAmount', 'Amt')}</th>
          {showAllSubstepPartTools && (
            <th className="px-2 py-1.5 font-medium w-[3.5rem]">{t('editorCore.partToolUsed', 'Used')}</th>
          )}
          {!compact && <th className="px-2 py-1.5 font-medium w-[4rem]">{t('editorCore.partToolUnit', 'Unit')}</th>}
          {!compact && <th className="px-2 py-1.5 font-medium w-[6rem]">{t('editorCore.partToolMaterial', 'Material')}</th>}
          {!compact && <th className="px-2 py-1.5 font-medium w-[4rem]">{t('editorCore.partToolDimension', 'Dim.')}</th>}
          {!compact && <th className="px-2 py-1.5 font-medium">{t('editorCore.partToolDescription', 'Description')}</th>}
          {showActionCol && <th className="px-2 py-1.5 w-[2rem]" />}
        </tr>
      </thead>
      <tbody>
        {effectiveAddRow && (
          <PartToolAddRow
            values={effectiveAddRow.values}
            onChange={effectiveAddRow.onChange}
            onConfirm={effectiveAddRow.onConfirm}
            canConfirm={effectiveAddRow.canConfirm}
            showThumbnails={showThumbnails}
            showUsed={showAllSubstepPartTools}
            testIdPrefix={testIdPrefix}
          />
        )}
        {rows.map((row) => {
          const isEditing = effectiveEditingRowId === row.rowId;
          // When editingRowId is set, non-editing rows become read-only
          const rowReadOnly = effectiveReadOnly || (!!effectiveEditingRowId && !isEditing);
          return (
            <PartToolTableRow
              key={row.rowId}
              row={row}
              callbacks={callbacks}
              allSubstepPartTools={showAllSubstepPartTools ? allSubstepPartTools : undefined}
              onOpenPartToolList={onOpenPartToolList}
              getPreviewUrl={getPreviewUrl}
              imageCallbacks={imageCallbacks}
              getPartToolImages={getPartToolImages}
              testIdPrefix={testIdPrefix}
              readOnly={rowReadOnly}
              isEditing={isEditing}
              isSelected={selectedRowId === row.rowId}
              onRowClick={onRowClick}
              showActionCol={showActionCol}
              compact={compact}
              onEditClick={onEditClick}
            />
          );
        })}
      </tbody>
    </table>
  );
}

// ── Row component ──

type PartToolFieldKey = 'label' | 'name' | 'partNumber' | 'amount' | 'unit' | 'material' | 'dimension' | 'description';

const CATALOG_FIELDS: ReadonlySet<PartToolFieldKey> = new Set(['name', 'label', 'partNumber']);

interface EditingField {
  field: PartToolFieldKey;
  label: string;
  value: string;
  inputType: 'text' | 'number';
}

const CELL_BTN_CLASS = 'w-full text-left text-base truncate cursor-pointer hover:bg-[var(--color-bg-hover)] rounded px-1 py-0.5 transition-colors';

interface RowProps {
  row: PartToolTableItem;
  callbacks: PartToolTableCallbacks;
  allSubstepPartTools?: Record<string, { partToolId: string; amount: number }>;
  onOpenPartToolList?: () => void;
  getPreviewUrl?: (partToolId: string) => string | null;
  imageCallbacks?: PartToolTableImageCallbacks;
  getPartToolImages?: (partToolId: string) => PartToolImageItem[];
  testIdPrefix: string;
  readOnly?: boolean;
  isEditing?: boolean;
  isSelected?: boolean;
  onRowClick?: (row: PartToolTableItem) => void;
  showActionCol?: boolean;
  compact?: boolean;
  onEditClick?: (row: PartToolTableItem) => void;
}

const PartToolTableRow = memo(function PartToolTableRow({
  row,
  callbacks,
  allSubstepPartTools,
  onOpenPartToolList,
  getPreviewUrl,
  imageCallbacks,
  getPartToolImages,
  testIdPrefix,
  readOnly,
  isEditing,
  isSelected,
  onRowClick,
  showActionCol,
  compact,
  onEditClick,
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
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // ── Inline editing local state ──
  const [localValues, setLocalValues] = useState({
    label: pt.label ?? '',
    name: pt.name,
    partNumber: pt.partNumber ?? '',
    amount: row.amount,
    unit: pt.unit ?? '',
    material: pt.material ?? '',
    dimension: pt.dimension ?? '',
    description: pt.description ?? '',
  });
  const focusValueRef = useRef<string | number>('');

  // Sync local values when partTool changes externally
  useEffect(() => {
    setLocalValues({
      label: pt.label ?? '',
      name: pt.name,
      partNumber: pt.partNumber ?? '',
      amount: row.amount,
      unit: pt.unit ?? '',
      material: pt.material ?? '',
      dimension: pt.dimension ?? '',
      description: pt.description ?? '',
    });
  }, [pt.label, pt.name, pt.partNumber, row.amount, pt.unit, pt.material, pt.dimension, pt.description]);

  const isTool = pt.type === 'Tool';
  const nameValid = isPartToolNameValid(pt.name);

  const toggleType = useCallback(() => {
    callbacks.onUpdatePartTool(pt.id, { type: pt.type === 'Tool' ? 'Part' : 'Tool' });
  }, [pt.id, pt.type, callbacks]);

  const openField = useCallback((field: PartToolFieldKey, label: string, value: string, inputType: 'text' | 'number' = 'text') => {
    // For catalog fields (name/label/partNumber), open the PartToolListPanel if available
    if (CATALOG_FIELDS.has(field) && onOpenPartToolList) {
      onOpenPartToolList();
      return;
    }
    setEditingField({ field, label, value, inputType });
  }, [onOpenPartToolList]);

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

  /** Handle inline blur-save for editing row */
  const handleInlineBlur = useCallback((field: PartToolFieldKey, value: string) => {
    if (String(value) === String(focusValueRef.current)) return;
    applyFieldUpdate(field, value);
  }, [applyFieldUpdate]);

  /** Render a cell: inline edit (isEditing), read-only span, or modal button */
  const renderCell = useCallback((field: PartToolFieldKey, displayValue: string, placeholder: string, inputType: 'text' | 'number' = 'text', extraClass = '') => {
    if (isEditing) {
      const localVal = field === 'amount' ? String(localValues[field]) : localValues[field as Exclude<PartToolFieldKey, 'amount'>];
      return (
        <EditInput
          data-testid={`${testIdPrefix}-${field}-${row.rowId}`}
          size="sm"
          type={inputType}
          placeholder={placeholder}
          value={localVal}
          onChange={(e) => {
            const v = e.target.value;
            setLocalValues((prev) => ({ ...prev, [field]: inputType === 'number' ? Math.max(1, Number(v) || 1) : v }));
          }}
          onFocus={() => { focusValueRef.current = localVal; }}
          onBlur={(e) => handleInlineBlur(field, e.target.value)}
          className={extraClass}
        />
      );
    }
    if (readOnly) {
      return (
        <span
          data-testid={`${testIdPrefix}-${field}-${row.rowId}`}
          className={`text-base truncate ${extraClass} ${displayValue ? '' : 'text-[var(--color-text-muted)]'}`}
        >
          {displayValue || placeholder}
        </span>
      );
    }
    return (
      <button
        type="button"
        data-testid={`${testIdPrefix}-${field}-${row.rowId}`}
        className={`${CELL_BTN_CLASS} ${extraClass}`}
        onClick={() => openField(field, placeholder, displayValue, inputType)}
      >
        <span className={displayValue ? '' : 'text-[var(--color-text-muted)]'}>
          {displayValue || placeholder}
        </span>
      </button>
    );
  }, [testIdPrefix, row.rowId, openField, readOnly, isEditing, localValues, handleInlineBlur]);

  return (
    <tr
      data-testid={`${testIdPrefix}-${row.rowId}`}
      className={`hover:bg-[var(--color-bg-hover)] transition-colors${onRowClick ? ' cursor-pointer' : ''}${isSelected ? ' bg-[var(--color-bg-selected)]' : ''}`}
      onClick={onRowClick ? () => onRowClick(row) : undefined}
    >
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
        {readOnly ? (
          <span
            data-testid={`${testIdPrefix}-type-${row.rowId}`}
            className="flex items-center justify-center w-full"
          >
            {isTool
              ? <ToolIcon className="h-3 w-3 text-[var(--color-element-tool)]" />
              : <PartIcon className="h-3 w-3 text-[var(--color-element-part)]" />}
          </span>
        ) : (
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
        )}
      </td>

      {/* Label */}
      {!compact && (
        <td className="px-2 py-1.5">
          {renderCell('label', pt.label ?? '', t('editorCore.partToolLabel', 'Label'))}
        </td>
      )}

      {/* Name */}
      <td className="px-2 py-1.5">
        {renderCell('name', pt.name, t('editorCore.partToolName', 'Name'), 'text', !nameValid ? 'text-red-500' : '')}
      </td>

      {/* Part# */}
      <td className="px-2 py-1.5">
        {renderCell('partNumber', pt.partNumber ?? '', t('editorCore.partToolPartNumber', 'Part#'))}
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
      {!compact && (
        <td className="px-2 py-1.5">
          {renderCell('unit', pt.unit ?? '', t('editorCore.partToolUnit', 'Unit'))}
        </td>
      )}

      {/* Material */}
      {!compact && (
        <td className="px-2 py-1.5">
          {renderCell('material', pt.material ?? '', t('editorCore.partToolMaterial', 'Material'))}
        </td>
      )}

      {/* Dimension */}
      {!compact && (
        <td className="px-2 py-1.5">
          {renderCell('dimension', pt.dimension ?? '', t('editorCore.partToolDimension', 'Dim.'))}
        </td>
      )}

      {/* Description */}
      {!compact && (
        <td className="px-2 py-1.5">
          {renderCell('description', pt.description ?? '', t('editorCore.partToolDescription', 'Description'))}
        </td>
      )}

      {/* Delete / Edit Action */}
      {showActionCol && (
        <td className="px-2 py-1.5">
          {compact && onEditClick ? (
            <button
              type="button"
              data-testid={`${testIdPrefix}-edit-${row.rowId}`}
              aria-label={t('editorCore.editPartTool', 'Edit part/tool')}
              className="flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
              onClick={(e) => { e.stopPropagation(); onEditClick(row); }}
            >
              <Pencil className="h-3 w-3" />
            </button>
          ) : (!readOnly || isEditing) && (
            <button
              type="button"
              data-testid={`${testIdPrefix}-delete-${row.rowId}`}
              aria-label={t('editorCore.deletePartTool', 'Delete part/tool')}
              className="flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-danger)] transition-colors cursor-pointer"
              onClick={() => setConfirmDeleteOpen(true)}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </td>
      )}

      {/* Confirm delete dialog */}
      <ConfirmDeleteDialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        title={t('editorCore.deletePartTool', 'Delete part/tool?')}
        message={t('editorCore.deletePartToolConfirm', 'This action cannot be undone.')}
      />

      {/* Modal for cell editing */}
      {!readOnly && !isEditing && editingField && (
        <TextInputModal
          label={editingField.label}
          value={editingField.value}
          inputType={editingField.inputType}
          onConfirm={handleFieldConfirm}
          onCancel={handleFieldCancel}
        />
      )}
    </tr>
  );
});

// ── Add Row component ──

interface PartToolAddRowProps {
  values: PartToolAddRowValues;
  onChange: (v: PartToolAddRowValues) => void;
  onConfirm: () => void;
  canConfirm: boolean;
  showThumbnails: boolean;
  showUsed: boolean;
  testIdPrefix: string;
}

const PartToolAddRow = memo(function PartToolAddRow({
  values,
  onChange,
  onConfirm,
  canConfirm,
  showThumbnails,
  showUsed,
  testIdPrefix,
}: PartToolAddRowProps) {
  const { t } = useTranslation();
  const isTool = values.type === 'Tool';

  const handleChange = useCallback((field: keyof PartToolAddRowValues, val: string | number) => {
    onChange({ ...values, [field]: val });
  }, [values, onChange]);

  const toggleType = useCallback(() => {
    onChange({ ...values, type: values.type === 'Part' ? 'Tool' : 'Part' });
  }, [values, onChange]);

  return (
    <tr data-testid="parttool-add-row" className="bg-[var(--color-bg-hover)]/30">
      {showThumbnails && <td className="px-2 py-1.5" />}

      {/* Type toggle */}
      <td className="px-2 py-1.5">
        <button
          type="button"
          data-testid={`${testIdPrefix}-add-type`}
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
        <EditInput size="sm" data-testid={`${testIdPrefix}-add-label`} placeholder={t('editorCore.partToolLabel', 'Label')} value={values.label} onChange={(e) => handleChange('label', e.target.value)} />
      </td>

      {/* Name */}
      <td className="px-2 py-1.5">
        <EditInput size="sm" data-testid={`${testIdPrefix}-add-name`} placeholder={t('editorCore.partToolName', 'Name')} value={values.name} onChange={(e) => handleChange('name', e.target.value)} />
      </td>

      {/* Part# */}
      <td className="px-2 py-1.5">
        <EditInput size="sm" data-testid={`${testIdPrefix}-add-partNumber`} placeholder={t('editorCore.partToolPartNumber', 'Part#')} value={values.partNumber} onChange={(e) => handleChange('partNumber', e.target.value)} />
      </td>

      {/* Amount */}
      <td className="px-2 py-1.5">
        <EditInput size="sm" data-testid={`${testIdPrefix}-add-amount`} type="number" min={1} value={values.amount} onChange={(e) => handleChange('amount', Math.max(1, Number(e.target.value) || 1))} className="text-center" />
      </td>

      {/* Used (placeholder) */}
      {showUsed && <td className="px-2 py-1.5" />}

      {/* Unit */}
      <td className="px-2 py-1.5">
        <EditInput size="sm" data-testid={`${testIdPrefix}-add-unit`} placeholder={t('editorCore.partToolUnit', 'Unit')} value={values.unit} onChange={(e) => handleChange('unit', e.target.value)} />
      </td>

      {/* Material */}
      <td className="px-2 py-1.5">
        <EditInput size="sm" data-testid={`${testIdPrefix}-add-material`} placeholder={t('editorCore.partToolMaterial', 'Material')} value={values.material} onChange={(e) => handleChange('material', e.target.value)} />
      </td>

      {/* Dimension */}
      <td className="px-2 py-1.5">
        <EditInput size="sm" data-testid={`${testIdPrefix}-add-dimension`} placeholder={t('editorCore.partToolDimension', 'Dim.')} value={values.dimension} onChange={(e) => handleChange('dimension', e.target.value)} />
      </td>

      {/* Description */}
      <td className="px-2 py-1.5">
        <EditInput size="sm" data-testid={`${testIdPrefix}-add-description`} placeholder={t('editorCore.partToolDescription', 'Description')} value={values.description} onChange={(e) => handleChange('description', e.target.value)} />
      </td>

      {/* Confirm button */}
      <td className="px-2 py-1.5">
        <button
          type="button"
          data-testid="parttool-add-confirm"
          aria-label={t('editorCore.confirmAdd', 'Confirm add')}
          disabled={!canConfirm}
          className="flex items-center justify-center text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
          onClick={onConfirm}
        >
          <Plus className="h-3 w-3" />
        </button>
      </td>
    </tr>
  );
});
