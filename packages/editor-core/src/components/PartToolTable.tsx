import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Package, Wrench, ImagePlus, X } from 'lucide-react';
import type { PartToolRow } from '@monta-vis/viewer-core';
import { computeUsedAmount } from '../utils/partToolHelpers';
import { usePartToolFieldState } from '../hooks/usePartToolFieldState';
import { EditInput } from './EditInput';
import { ImageCropDialog } from './ImageCropDialog';
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
}

export interface PartToolTableProps {
  rows: PartToolTableItem[];
  callbacks: PartToolTableCallbacks;
  /** All substepPartTools for computing "Used" amounts. */
  allSubstepPartTools?: Record<string, { partToolId: string; amount: number }>;
  /** Resolve a partTool ID to a thumbnail URL (or null). */
  getPreviewUrl?: (partToolId: string) => string | null;
  /** Image upload/delete callbacks (enables thumbnail column interaction). */
  imageCallbacks?: PartToolTableImageCallbacks;
  /** Prefix for data-testid attributes (default "parttool-row"). */
  testIdPrefix?: string;
}

/** Compact inline-editable table for partTools — used by both SubstepEditPopover and PartToolListPanel. */
export function PartToolTable({
  rows,
  callbacks,
  allSubstepPartTools,
  getPreviewUrl,
  imageCallbacks,
  testIdPrefix = 'parttool-row',
}: PartToolTableProps) {
  const { t } = useTranslation();
  const showThumbnails = !!getPreviewUrl;

  return (
    <table className="w-full text-[0.65rem] border-collapse" data-testid="parttool-table">
      <thead>
        <tr className="text-[var(--color-text-muted)] text-left">
          {showThumbnails && (
            <th className="px-1 py-0.5 font-medium w-[2.5rem]">{t('editorCore.thumbnail', 'Img')}</th>
          )}
          <th className="px-1 py-0.5 font-medium w-[2.5rem]">{t('editorCore.typePart', 'Type')}</th>
          <th className="px-1 py-0.5 font-medium">{t('editorCore.partToolName', 'Name')}</th>
          <th className="px-1 py-0.5 font-medium w-[4rem]">{t('editorCore.partToolPartNumber', 'Part#')}</th>
          <th className="px-1 py-0.5 font-medium w-[2.5rem]">{t('editorCore.partToolAmount', 'Amt')}</th>
          {allSubstepPartTools && (
            <th className="px-1 py-0.5 font-medium w-[2.5rem]">{t('editorCore.partToolUsed', 'Used')}</th>
          )}
          <th className="px-1 py-0.5 font-medium w-[3rem]">{t('editorCore.partToolUnit', 'Unit')}</th>
          <th className="px-1 py-0.5 font-medium w-[4rem]">{t('editorCore.partToolMaterial', 'Material')}</th>
          <th className="px-1 py-0.5 font-medium w-[3.5rem]">{t('editorCore.partToolDimension', 'Dim.')}</th>
          <th className="px-1 py-0.5 font-medium">{t('editorCore.partToolDescription', 'Description')}</th>
          <th className="px-1 py-0.5 w-[1.5rem]" />
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <PartToolTableRow
            key={row.rowId}
            row={row}
            callbacks={callbacks}
            allSubstepPartTools={allSubstepPartTools}
            getPreviewUrl={getPreviewUrl}
            imageCallbacks={imageCallbacks}
            testIdPrefix={testIdPrefix}
          />
        ))}
      </tbody>
    </table>
  );
}

// ── Row component ──

interface RowProps {
  row: PartToolTableItem;
  callbacks: PartToolTableCallbacks;
  allSubstepPartTools?: Record<string, { partToolId: string; amount: number }>;
  getPreviewUrl?: (partToolId: string) => string | null;
  imageCallbacks?: PartToolTableImageCallbacks;
  testIdPrefix: string;
}

const PartToolTableRow = memo(function PartToolTableRow({
  row,
  callbacks,
  allSubstepPartTools,
  getPreviewUrl,
  imageCallbacks,
  testIdPrefix,
}: RowProps) {
  const { t } = useTranslation();
  const pt = row.partTool;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropDialogSrc, setCropDialogSrc] = useState<string | null>(null);
  const pendingFileRef = useRef<File | null>(null);

  const onCommitAmount = useCallback((parsed: number) => {
    if (parsed !== row.amount) {
      callbacks.onUpdateAmount(row.rowId, parsed);
    }
  }, [row.rowId, row.amount, callbacks]);

  const fields = usePartToolFieldState({
    partTool: pt,
    amount: row.amount,
    onUpdatePartTool: callbacks.onUpdatePartTool,
    onCommitAmount,
  });

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

  return (
    <tr data-testid={`${testIdPrefix}-${row.rowId}`} className="hover:bg-[var(--color-bg-hover)] transition-colors">
      {/* Thumbnail (optional) */}
      {getPreviewUrl && (
        <td className="px-1 py-0.5">
          {previewUrl ? (
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
          ) : imageCallbacks?.onUploadImage ? (
            <button
              type="button"
              data-testid={`${testIdPrefix}-upload-${row.rowId}`}
              aria-label={t('editorCore.uploadImage', 'Upload image')}
              className="h-6 w-6 rounded bg-[var(--color-bg-hover)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-secondary)] transition-colors cursor-pointer"
              onClick={handleUploadClick}
            >
              <ImagePlus className="h-3 w-3" />
            </button>
          ) : (
            <div className="h-6 w-6 rounded bg-[var(--color-bg-hover)]" />
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
      <td className="px-1 py-0.5">
        <button
          type="button"
          data-testid={`${testIdPrefix}-type-${row.rowId}`}
          aria-label={fields.isTool ? t('editorCore.typeTool', 'Tool') : t('editorCore.typePart', 'Part')}
          className={`flex items-center justify-center w-full rounded px-1 py-0.5 text-[0.65rem] font-semibold cursor-pointer transition-colors ${
            fields.isTool
              ? 'bg-[var(--color-element-tool)]/15 text-[var(--color-element-tool)]'
              : 'bg-[var(--color-element-part)]/15 text-[var(--color-element-part)]'
          }`}
          onClick={fields.toggleType}
        >
          {fields.isTool ? <Wrench className="h-2.5 w-2.5" /> : <Package className="h-2.5 w-2.5" />}
        </button>
      </td>

      {/* Name */}
      <td className="px-1 py-0.5">
        <EditInput
          size="sm"
          error={!fields.nameValid}
          data-testid={`${testIdPrefix}-name-${row.rowId}`}
          value={fields.name}
          onChange={(e) => fields.setName(e.target.value)}
          onBlur={fields.commitName}
          placeholder={t('editorCore.partToolName', 'Name')}
        />
      </td>

      {/* Part# */}
      <td className="px-1 py-0.5">
        <EditInput
          size="sm"
          value={fields.partNumber}
          onChange={(e) => fields.setPartNumber(e.target.value)}
          onBlur={fields.blurPartNumber}
          placeholder={t('editorCore.partToolPartNumber', 'Part#')}
        />
      </td>

      {/* Amount */}
      <td className="px-1 py-0.5">
        <EditInput
          size="sm"
          type="number"
          min="1"
          value={fields.amount}
          onChange={(e) => fields.setAmount(e.target.value)}
          onBlur={fields.commitAmount}
        />
      </td>

      {/* Used (read-only, shown when allSubstepPartTools provided) */}
      {allSubstepPartTools && (
        <td className="px-1 py-0.5">
          <span
            data-testid={`${testIdPrefix}-used-${row.rowId}`}
            className={`text-[0.65rem] ${mismatch ? 'text-red-500 font-semibold' : 'text-[var(--color-text-muted)]'}`}
          >
            {used}
          </span>
        </td>
      )}

      {/* Unit */}
      <td className="px-1 py-0.5">
        <EditInput
          size="sm"
          value={fields.unit}
          onChange={(e) => fields.setUnit(e.target.value)}
          onBlur={fields.blurUnit}
          placeholder={t('editorCore.partToolUnit', 'Unit')}
        />
      </td>

      {/* Material */}
      <td className="px-1 py-0.5">
        <EditInput
          size="sm"
          value={fields.material}
          onChange={(e) => fields.setMaterial(e.target.value)}
          onBlur={fields.blurMaterial}
          placeholder={t('editorCore.partToolMaterial', 'Material')}
        />
      </td>

      {/* Dimension */}
      <td className="px-1 py-0.5">
        <EditInput
          size="sm"
          value={fields.dimension}
          onChange={(e) => fields.setDimension(e.target.value)}
          onBlur={fields.blurDimension}
          placeholder={t('editorCore.partToolDimension', 'Dim.')}
        />
      </td>

      {/* Description */}
      <td className="px-1 py-0.5">
        <EditInput
          size="sm"
          value={fields.description}
          onChange={(e) => fields.setDescription(e.target.value)}
          onBlur={fields.blurDescription}
          placeholder={t('editorCore.partToolDescription', 'Description')}
        />
      </td>

      {/* Delete */}
      <td className="px-1 py-0.5">
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
    </tr>
  );
});
