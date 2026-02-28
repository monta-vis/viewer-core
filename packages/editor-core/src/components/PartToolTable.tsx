import { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Plus, Package, Wrench } from 'lucide-react';
import type { EnrichedSubstepPartTool, PartToolRow } from '@monta-vis/viewer-core';
import { isPartToolNameValid } from '../utils/partToolHelpers';

export interface PartToolTableCallbacks {
  onUpdatePartTool: (partToolId: string, updates: Partial<PartToolRow>) => void;
  onUpdateAmount: (substepPartToolId: string, amount: number) => void;
  onAdd: () => void;
  onDelete: (substepPartToolId: string) => void;
}

export interface PartToolTableProps {
  partTools: EnrichedSubstepPartTool[];
  callbacks: PartToolTableCallbacks;
}

/** Compact inline-editable table for per-substep partTools. */
export function PartToolTable({ partTools, callbacks }: PartToolTableProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-1">
      {partTools.length > 0 && (
        <table className="w-full text-[0.65rem] border-collapse" data-testid="parttool-table">
          <thead>
            <tr className="text-[var(--color-text-muted)] text-left">
              <th className="px-1 py-0.5 font-medium w-[2.5rem]">{t('editorCore.typePart', 'Type')}</th>
              <th className="px-1 py-0.5 font-medium">{t('editorCore.partToolName', 'Name')}</th>
              <th className="px-1 py-0.5 font-medium w-[4rem]">{t('editorCore.partToolPartNumber', 'Part#')}</th>
              <th className="px-1 py-0.5 font-medium w-[2.5rem]">{t('editorCore.partToolAmount', 'Amt')}</th>
              <th className="px-1 py-0.5 font-medium w-[3rem]">{t('editorCore.partToolUnit', 'Unit')}</th>
              <th className="px-1 py-0.5 font-medium w-[4rem]">{t('editorCore.partToolMaterial', 'Material')}</th>
              <th className="px-1 py-0.5 font-medium w-[3.5rem]">{t('editorCore.partToolDimension', 'Dim.')}</th>
              <th className="px-1 py-0.5 w-[1.5rem]" />
            </tr>
          </thead>
          <tbody>
            {partTools.map((row) => (
              <PartToolTableRow key={row.id} row={row} callbacks={callbacks} />
            ))}
          </tbody>
        </table>
      )}
      <button
        type="button"
        data-testid="parttool-add"
        className="flex items-center gap-1 px-1 py-1 text-[0.65rem] text-[var(--color-secondary)] hover:text-[var(--color-secondary-hover)] transition-colors cursor-pointer"
        onClick={callbacks.onAdd}
      >
        <Plus className="h-3 w-3" />
        <span>{t('editorCore.addPartTool', 'Add part/tool')}</span>
      </button>
    </div>
  );
}

// ── Row component ──

interface RowProps {
  row: EnrichedSubstepPartTool;
  callbacks: PartToolTableCallbacks;
}

const INPUT_CLASS =
  'w-full bg-transparent border border-[var(--color-border-base)] rounded px-1 py-0.5 text-[0.65rem] text-[var(--color-text-base)] focus:outline-none focus:border-[var(--color-secondary)] transition-colors';

function PartToolTableRow({ row, callbacks }: RowProps) {
  const { t } = useTranslation();
  const pt = row.partTool;

  // Local state for controlled inputs — committed on blur
  const [name, setName] = useState(pt.name);
  const [partNumber, setPartNumber] = useState(pt.partNumber ?? '');
  const [amount, setAmount] = useState(String(row.amount));
  const [unit, setUnit] = useState(pt.unit ?? '');
  const [material, setMaterial] = useState(pt.material ?? '');
  const [dimension, setDimension] = useState(pt.dimension ?? '');

  // Sync local state when props change externally (e.g. undo/redo)
  useEffect(() => { setName(pt.name); }, [pt.name]);
  useEffect(() => { setPartNumber(pt.partNumber ?? ''); }, [pt.partNumber]);
  useEffect(() => { setAmount(String(row.amount)); }, [row.amount]);
  useEffect(() => { setUnit(pt.unit ?? ''); }, [pt.unit]);
  useEffect(() => { setMaterial(pt.material ?? ''); }, [pt.material]);
  useEffect(() => { setDimension(pt.dimension ?? ''); }, [pt.dimension]);

  const commitField = useCallback(
    (field: keyof PartToolRow, value: string) => {
      const prev = pt[field];
      const next = value.trim() === '' ? null : value.trim();
      if (next !== prev) {
        callbacks.onUpdatePartTool(pt.id, { [field]: next } as Partial<PartToolRow>);
      }
    },
    [pt, callbacks],
  );

  const commitName = useCallback(() => {
    const trimmed = name.trim();
    if (trimmed !== pt.name) {
      callbacks.onUpdatePartTool(pt.id, { name: trimmed });
    }
    setName(trimmed);
  }, [name, pt.id, pt.name, callbacks]);

  const commitAmount = useCallback(() => {
    const parsed = Math.max(1, parseInt(amount, 10) || 1);
    if (parsed !== row.amount) {
      callbacks.onUpdateAmount(row.id, parsed);
    }
    setAmount(String(parsed));
  }, [amount, row.id, row.amount, callbacks]);

  const toggleType = useCallback(() => {
    callbacks.onUpdatePartTool(pt.id, { type: pt.type === 'Tool' ? 'Part' : 'Tool' });
  }, [pt.id, pt.type, callbacks]);

  // Stable onBlur handlers
  const blurPartNumber = useCallback(() => commitField('partNumber', partNumber), [commitField, partNumber]);
  const blurUnit = useCallback(() => commitField('unit', unit), [commitField, unit]);
  const blurMaterial = useCallback(() => commitField('material', material), [commitField, material]);
  const blurDimension = useCallback(() => commitField('dimension', dimension), [commitField, dimension]);
  const handleDelete = useCallback(() => callbacks.onDelete(row.id), [callbacks, row.id]);

  const isTool = pt.type === 'Tool';
  const nameValid = isPartToolNameValid(name);

  // Memoize class string to avoid recalculation
  const nameInputClass = useMemo(
    () => `${INPUT_CLASS} ${!nameValid ? 'border-red-500' : ''}`,
    [nameValid],
  );

  return (
    <tr data-testid={`parttool-row-${row.id}`} className="hover:bg-[var(--color-bg-hover)] transition-colors">
      {/* Type toggle */}
      <td className="px-1 py-0.5">
        <button
          type="button"
          data-testid={`type-toggle-${row.id}`}
          aria-label={isTool ? t('editorCore.typeTool', 'Tool') : t('editorCore.typePart', 'Part')}
          className={`flex items-center justify-center w-full rounded px-1 py-0.5 text-[0.6rem] font-semibold cursor-pointer transition-colors ${
            isTool
              ? 'bg-[var(--color-element-tool)]/15 text-[var(--color-element-tool)]'
              : 'bg-[var(--color-element-part)]/15 text-[var(--color-element-part)]'
          }`}
          onClick={toggleType}
        >
          {isTool ? <Wrench className="h-2.5 w-2.5" /> : <Package className="h-2.5 w-2.5" />}
        </button>
      </td>

      {/* Name */}
      <td className="px-1 py-0.5">
        <input
          data-testid={`name-input-${row.id}`}
          className={nameInputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          placeholder={t('editorCore.partToolName', 'Name')}
        />
      </td>

      {/* Part# */}
      <td className="px-1 py-0.5">
        <input
          className={INPUT_CLASS}
          value={partNumber}
          onChange={(e) => setPartNumber(e.target.value)}
          onBlur={blurPartNumber}
          placeholder={t('editorCore.partToolPartNumber', 'Part#')}
        />
      </td>

      {/* Amount */}
      <td className="px-1 py-0.5">
        <input
          className={INPUT_CLASS}
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onBlur={commitAmount}
        />
      </td>

      {/* Unit */}
      <td className="px-1 py-0.5">
        <input
          className={INPUT_CLASS}
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          onBlur={blurUnit}
          placeholder={t('editorCore.partToolUnit', 'Unit')}
        />
      </td>

      {/* Material */}
      <td className="px-1 py-0.5">
        <input
          className={INPUT_CLASS}
          value={material}
          onChange={(e) => setMaterial(e.target.value)}
          onBlur={blurMaterial}
          placeholder={t('editorCore.partToolMaterial', 'Material')}
        />
      </td>

      {/* Dimension */}
      <td className="px-1 py-0.5">
        <input
          className={INPUT_CLASS}
          value={dimension}
          onChange={(e) => setDimension(e.target.value)}
          onBlur={blurDimension}
          placeholder={t('editorCore.partToolDimension', 'Dim.')}
        />
      </td>

      {/* Delete */}
      <td className="px-1 py-0.5">
        <button
          type="button"
          aria-label={t('editorCore.deletePartTool', 'Delete part/tool')}
          className="flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-danger)] transition-colors cursor-pointer"
          onClick={handleDelete}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </td>
    </tr>
  );
}
