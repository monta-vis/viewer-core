import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PartToolTable, type PartToolTableCallbacks } from './PartToolTable';
import type { EnrichedSubstepPartTool } from '@monta-vis/viewer-core';

afterEach(() => {
  cleanup();
});

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { language: 'en' },
  }),
}));

const makeRow = (
  id: string,
  name: string,
  type: 'Part' | 'Tool',
  amount: number,
  order: number,
  overrides: Partial<EnrichedSubstepPartTool['partTool']> = {},
): EnrichedSubstepPartTool => ({
  id: `spt-${id}`,
  versionId: 'v1',
  substepId: 's1',
  partToolId: `pt-${id}`,
  amount,
  order,
  partTool: {
    id: `pt-${id}`,
    versionId: 'v1',
    instructionId: 'i1',
    previewImageId: null,
    name,
    type,
    partNumber: null,
    amount: 1,
    description: null,
    unit: null,
    material: null,
    dimension: null,
    iconId: null,
    ...overrides,
  },
});

const makeCallbacks = (): PartToolTableCallbacks => ({
  onUpdatePartTool: vi.fn(),
  onUpdateAmount: vi.fn(),
  onAdd: vi.fn(),
  onDelete: vi.fn(),
});

describe('PartToolTable', () => {
  it('renders a row per partTool', () => {
    const rows = [makeRow('1', 'Wrench', 'Tool', 2, 1), makeRow('2', 'Bolt', 'Part', 5, 2)];
    render(<PartToolTable partTools={rows} callbacks={makeCallbacks()} />);

    expect(screen.getByTestId('parttool-row-spt-1')).toBeInTheDocument();
    expect(screen.getByTestId('parttool-row-spt-2')).toBeInTheDocument();
  });

  it('shows inputs pre-filled with partTool values', () => {
    const rows = [makeRow('1', 'Wrench', 'Tool', 3, 1, { partNumber: 'PN-99', material: 'Steel', dimension: '10mm', unit: 'pcs' })];
    render(<PartToolTable partTools={rows} callbacks={makeCallbacks()} />);

    expect(screen.getByDisplayValue('Wrench')).toBeInTheDocument();
    expect(screen.getByDisplayValue('PN-99')).toBeInTheDocument();
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Steel')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10mm')).toBeInTheDocument();
    expect(screen.getByDisplayValue('pcs')).toBeInTheDocument();
  });

  it('type toggle fires onUpdatePartTool with toggled type', async () => {
    const user = userEvent.setup();
    const cbs = makeCallbacks();
    const rows = [makeRow('1', 'Wrench', 'Tool', 1, 1)];
    render(<PartToolTable partTools={rows} callbacks={cbs} />);

    const toggle = screen.getByTestId('type-toggle-spt-1');
    await user.click(toggle);
    expect(cbs.onUpdatePartTool).toHaveBeenCalledWith('pt-1', { type: 'Part' });
  });

  it('name change fires onUpdatePartTool on blur', async () => {
    const user = userEvent.setup();
    const cbs = makeCallbacks();
    const rows = [makeRow('1', 'Wrench', 'Tool', 1, 1)];
    render(<PartToolTable partTools={rows} callbacks={cbs} />);

    const input = screen.getByDisplayValue('Wrench');
    await user.clear(input);
    await user.type(input, 'Hammer');
    await user.tab(); // blur
    expect(cbs.onUpdatePartTool).toHaveBeenCalledWith('pt-1', { name: 'Hammer' });
  });

  it('amount change fires onUpdateAmount on blur', async () => {
    const user = userEvent.setup();
    const cbs = makeCallbacks();
    const rows = [makeRow('1', 'Wrench', 'Tool', 2, 1)];
    render(<PartToolTable partTools={rows} callbacks={cbs} />);

    const input = screen.getByDisplayValue('2');
    await user.clear(input);
    await user.type(input, '5');
    await user.tab();
    expect(cbs.onUpdateAmount).toHaveBeenCalledWith('spt-1', 5);
  });

  it('delete fires onDelete with substepPartTool id', async () => {
    const user = userEvent.setup();
    const cbs = makeCallbacks();
    const rows = [makeRow('1', 'Wrench', 'Tool', 1, 1)];
    render(<PartToolTable partTools={rows} callbacks={cbs} />);

    const deleteBtn = screen.getByLabelText('Delete part/tool');
    await user.click(deleteBtn);
    expect(cbs.onDelete).toHaveBeenCalledWith('spt-1');
  });

  it('add button fires onAdd', async () => {
    const user = userEvent.setup();
    const cbs = makeCallbacks();
    render(<PartToolTable partTools={[]} callbacks={cbs} />);

    const addBtn = screen.getByTestId('parttool-add');
    await user.click(addBtn);
    expect(cbs.onAdd).toHaveBeenCalledOnce();
  });

  it('shows red border on empty name', () => {
    const rows = [makeRow('1', '', 'Part', 1, 1)];
    render(<PartToolTable partTools={rows} callbacks={makeCallbacks()} />);

    const nameInput = screen.getByTestId('name-input-spt-1');
    expect(nameInput.className).toContain('border-red');
  });

  it('renders empty state with add button when no partTools', () => {
    render(<PartToolTable partTools={[]} callbacks={makeCallbacks()} />);
    expect(screen.getByTestId('parttool-add')).toBeInTheDocument();
  });
});
