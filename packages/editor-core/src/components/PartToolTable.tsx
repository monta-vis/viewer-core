import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Pencil } from 'lucide-react';
import type { PartToolRow } from '@monta-vis/viewer-core';
import { PartIcon, ToolIcon, ConfirmDeleteDialog } from '@monta-vis/viewer-core';
import { computeUsedAmount, isPartToolNameValid } from '../utils/partToolHelpers';

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

export interface PartToolTableProps {
  rows: PartToolTableItem[];
  callbacks: PartToolTableCallbacks;
  /** All substepPartTools for computing "Used" amounts. */
  allSubstepPartTools?: Record<string, { partToolId: string; amount: number }>;
  /** Resolve a partTool ID to a thumbnail URL (or null). */
  getPreviewUrl?: (partToolId: string) => string | null;
  /** Prefix for data-testid attributes (default "parttool-row"). */
  testIdPrefix?: string;
  /** Highlights the row matching this ID with a selected background. */
  selectedRowId?: string | null;
  /** Called when a row is clicked (useful for selection). */
  onRowClick?: (row: PartToolTableItem) => void;
  /** Compact mode: shows only thumbnail/type/name/part#/amount columns. */
  compact?: boolean;
  /** Called when the edit icon is clicked on a row (compact mode only). */
  onEditClick?: (row: PartToolTableItem) => void;
}

/** Read-only table for partTools — used by PartToolListPanel. */
export function PartToolTable({
  rows,
  callbacks,
  allSubstepPartTools,
  getPreviewUrl,
  testIdPrefix = 'parttool-row',
  selectedRowId,
  onRowClick,
  compact,
  onEditClick,
}: PartToolTableProps) {
  const { t } = useTranslation();
  const showAllSubstepPartTools = !compact && !!allSubstepPartTools;
  const showThumbnails = !!getPreviewUrl;
  const showActionCol = (compact && !!onEditClick) || (!compact);

  return (
    <table className="w-full text-base border-collapse" data-testid="parttool-table">
      <thead>
        <tr className="text-[var(--color-text-muted)] text-left">
          {showThumbnails && (
            <th className="px-2 py-1.5 font-medium w-[2.5rem]">{t('editorCore.thumbnail', 'Img')}</th>
          )}
          <th className="px-2 py-1.5 font-medium w-[2.5rem]">{t('editorCore.typeColumn', 'Type')}</th>
          {!compact && <th className="px-2 py-1.5 font-medium w-[3.5rem]">{t('editorCore.partToolPosition', 'Position')}</th>}
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
        {rows.map((row) => (
          <PartToolTableRow
            key={row.rowId}
            row={row}
            callbacks={callbacks}
            allSubstepPartTools={showAllSubstepPartTools ? allSubstepPartTools : undefined}
            getPreviewUrl={getPreviewUrl}
            testIdPrefix={testIdPrefix}
            isSelected={selectedRowId === row.rowId}
            onRowClick={onRowClick}
            showActionCol={showActionCol}
            compact={compact}
            onEditClick={onEditClick}
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
  testIdPrefix: string;
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
  getPreviewUrl,
  testIdPrefix,
  isSelected,
  onRowClick,
  showActionCol,
  compact,
  onEditClick,
}: RowProps) {
  const { t } = useTranslation();
  const pt = row.partTool;
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const isTool = pt.type === 'Tool';
  const nameValid = isPartToolNameValid(pt.name);

  const handleDelete = useCallback(() => callbacks.onDelete(row.rowId), [callbacks, row.rowId]);

  const used = useMemo(
    () => allSubstepPartTools ? computeUsedAmount(pt.id, pt.type, allSubstepPartTools) : null,
    [pt.id, pt.type, allSubstepPartTools],
  );
  const mismatch = used !== null && used !== pt.amount;

  const previewUrl = getPreviewUrl?.(pt.id) ?? null;

  /** Render a read-only cell */
  const renderCell = useCallback((field: string, displayValue: string, placeholder: string, extraClass = '') => {
    return (
      <span
        data-testid={`${testIdPrefix}-${field}-${row.rowId}`}
        className={`text-base truncate ${extraClass} ${displayValue ? '' : 'text-[var(--color-text-muted)]'}`}
      >
        {displayValue || placeholder}
      </span>
    );
  }, [testIdPrefix, row.rowId]);

  return (
    <tr
      data-testid={`${testIdPrefix}-${row.rowId}`}
      className={`hover:bg-[var(--color-bg-hover)] transition-colors${onRowClick ? ' cursor-pointer' : ''}${isSelected ? ' bg-[var(--color-bg-selected)]' : ''}`}
      onClick={onRowClick ? () => onRowClick(row) : undefined}
    >
      {/* Thumbnail — display only, not separately clickable */}
      {getPreviewUrl && (
        <td className="px-2 py-1.5">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={pt.name}
              data-testid={`${testIdPrefix}-thumbnail-${row.rowId}`}
              className="h-6 w-6 object-cover rounded"
            />
          ) : (
            <div className="h-6 w-6 rounded bg-[var(--color-bg-hover)]" />
          )}
        </td>
      )}

      {/* Type (read-only icon) */}
      <td className="px-2 py-1.5">
        <span
          data-testid={`${testIdPrefix}-type-${row.rowId}`}
          className="flex items-center justify-center w-full"
        >
          {isTool
            ? <ToolIcon className="h-3 w-3 text-[var(--color-element-tool)]" />
            : <PartIcon className="h-3 w-3 text-[var(--color-element-part)]" />}
        </span>
      </td>

      {/* Position */}
      {!compact && (
        <td className="px-2 py-1.5">
          {renderCell('position', pt.position ?? '', t('editorCore.partToolPosition', 'Position'))}
        </td>
      )}

      {/* Name */}
      <td className="px-2 py-1.5">
        {renderCell('name', pt.name, t('editorCore.partToolName', 'Name'), !nameValid ? 'text-red-500' : '')}
      </td>

      {/* Part# */}
      <td className="px-2 py-1.5">
        {renderCell('partNumber', pt.partNumber ?? '', t('editorCore.partToolPartNumber', 'Part#'))}
      </td>

      {/* Amount */}
      <td className="px-2 py-1.5">
        {renderCell('amount', String(row.amount), t('editorCore.partToolAmount', 'Amt'))}
      </td>

      {/* Used */}
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

      {/* Edit (compact) or Delete (full) Action */}
      {showActionCol && (
        <td className="px-2 py-1.5">
          {compact && onEditClick && (
            <button
              type="button"
              data-testid={`${testIdPrefix}-edit-${row.rowId}`}
              aria-label={t('editorCore.editPartTool', 'Edit part/tool')}
              className="flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
              onClick={(e) => { e.stopPropagation(); onEditClick(row); }}
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
          {!compact && (
            <button
              type="button"
              data-testid={`${testIdPrefix}-delete-${row.rowId}`}
              aria-label={t('editorCore.deletePartTool', 'Delete part/tool')}
              className="flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-danger)] transition-colors cursor-pointer"
              onClick={(e) => { e.stopPropagation(); setConfirmDeleteOpen(true); }}
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
    </tr>
  );
});
