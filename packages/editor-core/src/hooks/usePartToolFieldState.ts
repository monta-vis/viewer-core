import { useState, useCallback, useEffect } from 'react';
import type { PartToolRow } from '@monta-vis/viewer-core';
import { isPartToolNameValid } from '../utils/partToolHelpers';

interface PartToolFieldStateOptions {
  partTool: PartToolRow;
  /** The amount value to track (may differ: row.amount for substep table, pt.amount for list panel). */
  amount: number;
  onUpdatePartTool: (id: string, updates: Partial<PartToolRow>) => void;
  /** Commit amount change (different for substep table vs list panel). */
  onCommitAmount: (parsed: number) => void;
}

export function usePartToolFieldState({
  partTool: pt,
  amount: externalAmount,
  onUpdatePartTool,
  onCommitAmount,
}: PartToolFieldStateOptions) {
  const [name, setName] = useState(pt.name);
  const [partNumber, setPartNumber] = useState(pt.partNumber ?? '');
  const [amount, setAmount] = useState(String(externalAmount));
  const [unit, setUnit] = useState(pt.unit ?? '');
  const [material, setMaterial] = useState(pt.material ?? '');
  const [dimension, setDimension] = useState(pt.dimension ?? '');
  const [description, setDescription] = useState(pt.description ?? '');

  // Sync local state when props change externally (e.g. undo/redo)
  useEffect(() => { setName(pt.name); }, [pt.name]);
  useEffect(() => { setPartNumber(pt.partNumber ?? ''); }, [pt.partNumber]);
  useEffect(() => { setAmount(String(externalAmount)); }, [externalAmount]);
  useEffect(() => { setUnit(pt.unit ?? ''); }, [pt.unit]);
  useEffect(() => { setMaterial(pt.material ?? ''); }, [pt.material]);
  useEffect(() => { setDimension(pt.dimension ?? ''); }, [pt.dimension]);
  useEffect(() => { setDescription(pt.description ?? ''); }, [pt.description]);

  const commitField = useCallback(
    (field: keyof PartToolRow, value: string) => {
      const prev = pt[field];
      const next = value.trim() === '' ? null : value.trim();
      if (next !== prev) {
        onUpdatePartTool(pt.id, { [field]: next } as Partial<PartToolRow>);
      }
    },
    [pt, onUpdatePartTool],
  );

  const commitName = useCallback(() => {
    const trimmed = name.trim();
    if (trimmed !== pt.name) {
      onUpdatePartTool(pt.id, { name: trimmed });
    }
    setName(trimmed);
  }, [name, pt.id, pt.name, onUpdatePartTool]);

  const commitAmount = useCallback(() => {
    const parsed = Math.max(1, parseInt(amount, 10) || 1);
    onCommitAmount(parsed);
    setAmount(String(parsed));
  }, [amount, onCommitAmount]);

  const toggleType = useCallback(() => {
    onUpdatePartTool(pt.id, { type: pt.type === 'Tool' ? 'Part' : 'Tool' });
  }, [pt.id, pt.type, onUpdatePartTool]);

  const blurPartNumber = useCallback(() => commitField('partNumber', partNumber), [commitField, partNumber]);
  const blurUnit = useCallback(() => commitField('unit', unit), [commitField, unit]);
  const blurMaterial = useCallback(() => commitField('material', material), [commitField, material]);
  const blurDimension = useCallback(() => commitField('dimension', dimension), [commitField, dimension]);
  const blurDescription = useCallback(() => commitField('description', description), [commitField, description]);

  const nameValid = isPartToolNameValid(name);

  return {
    name, setName, commitName, nameValid,
    partNumber, setPartNumber, blurPartNumber,
    amount, setAmount, commitAmount,
    unit, setUnit, blurUnit,
    material, setMaterial, blurMaterial,
    dimension, setDimension, blurDimension,
    description, setDescription, blurDescription,
    toggleType,
    isTool: pt.type === 'Tool',
  };
}
