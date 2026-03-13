import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PartToolTable, type PartToolTableCallbacks, type PartToolTableItem } from './PartToolTable';
import type { PartToolRow } from '@monta-vis/viewer-core';

// Mock viewer-core — only ConfirmDeleteDialog needed now
vi.mock('@monta-vis/viewer-core', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    ConfirmDeleteDialog: ({ open, onConfirm, onClose }: { open: boolean; onConfirm: () => void; onClose: () => void }) => (
      open ? (
        <div data-testid="confirm-delete-dialog">
          <button data-testid="confirm-delete-confirm" onClick={() => { onConfirm(); onClose(); }}>Delete</button>
          <button data-testid="confirm-delete-cancel" onClick={onClose}>Cancel</button>
        </div>
      ) : null
    ),
  };
});

afterEach(cleanup);

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { language: 'en' },
  }),
}));

const makePt = (
  id: string,
  name: string,
  type: 'Part' | 'Tool',
  amount = 1,
  overrides: Partial<PartToolRow> = {},
): PartToolRow => ({
  id: `pt-${id}`,
  versionId: 'v1',
  instructionId: 'i1',
  previewImageId: null,
  name,
  type,
  partNumber: null,
  amount,
  description: null,
  unit: null,
  material: null,
  dimension: null,
  iconId: null,
  ...overrides,
});

const makeRow = (
  rowId: string,
  name: string,
  type: 'Part' | 'Tool',
  amount: number,
  ptOverrides: Partial<PartToolRow> = {},
): PartToolTableItem => ({
  rowId: `spt-${rowId}`,
  partTool: makePt(rowId, name, type, 1, ptOverrides),
  amount,
});

const makeCallbacks = (): PartToolTableCallbacks => ({
  onUpdatePartTool: vi.fn(),
  onUpdateAmount: vi.fn(),
  onDelete: vi.fn(),
});

describe('PartToolTable', () => {
  it('renders a row per item', () => {
    const rows = [makeRow('1', 'Wrench', 'Tool', 2), makeRow('2', 'Bolt', 'Part', 5)];
    render(<PartToolTable rows={rows} callbacks={makeCallbacks()} />);

    expect(screen.getByTestId('parttool-row-spt-1')).toBeInTheDocument();
    expect(screen.getByTestId('parttool-row-spt-2')).toBeInTheDocument();
  });

  it('renders all cell values as read-only spans', () => {
    const rows = [makeRow('1', 'Wrench', 'Tool', 3, { partNumber: 'PN-99', material: 'Steel', dimension: '10mm', unit: 'pcs' })];
    render(<PartToolTable rows={rows} callbacks={makeCallbacks()} />);

    const fields = ['name', 'partNumber', 'amount', 'material', 'dimension', 'unit'] as const;
    for (const field of fields) {
      const el = screen.getByTestId(`parttool-row-${field}-spt-1`);
      expect(el.tagName).toBe('SPAN');
    }

    expect(screen.getByTestId('parttool-row-name-spt-1')).toHaveTextContent('Wrench');
    expect(screen.getByTestId('parttool-row-partNumber-spt-1')).toHaveTextContent('PN-99');
    expect(screen.getByTestId('parttool-row-amount-spt-1')).toHaveTextContent('3');
    expect(screen.getByTestId('parttool-row-material-spt-1')).toHaveTextContent('Steel');
    expect(screen.getByTestId('parttool-row-dimension-spt-1')).toHaveTextContent('10mm');
    expect(screen.getByTestId('parttool-row-unit-spt-1')).toHaveTextContent('pcs');
  });

  it('type column is always a read-only span with icon', () => {
    const rows = [makeRow('1', 'Wrench', 'Tool', 1)];
    render(<PartToolTable rows={rows} callbacks={makeCallbacks()} />);

    const typeCell = screen.getByTestId('parttool-row-type-spt-1');
    expect(typeCell.tagName).toBe('SPAN');
  });

  it('delete button opens confirmation dialog', async () => {
    const user = userEvent.setup();
    const cbs = makeCallbacks();
    const rows = [makeRow('1', 'Wrench', 'Tool', 1)];
    render(<PartToolTable rows={rows} callbacks={cbs} />);

    await user.click(screen.getByTestId('parttool-row-delete-spt-1'));
    expect(screen.getByTestId('confirm-delete-dialog')).toBeInTheDocument();
    expect(cbs.onDelete).not.toHaveBeenCalled();
  });

  it('confirming delete dialog fires onDelete with row id', async () => {
    const user = userEvent.setup();
    const cbs = makeCallbacks();
    const rows = [makeRow('1', 'Wrench', 'Tool', 1)];
    render(<PartToolTable rows={rows} callbacks={cbs} />);

    await user.click(screen.getByTestId('parttool-row-delete-spt-1'));
    await user.click(screen.getByTestId('confirm-delete-confirm'));
    expect(cbs.onDelete).toHaveBeenCalledWith('spt-1');
  });

  it('canceling delete dialog does NOT fire onDelete', async () => {
    const user = userEvent.setup();
    const cbs = makeCallbacks();
    const rows = [makeRow('1', 'Wrench', 'Tool', 1)];
    render(<PartToolTable rows={rows} callbacks={cbs} />);

    await user.click(screen.getByTestId('parttool-row-delete-spt-1'));
    await user.click(screen.getByTestId('confirm-delete-cancel'));
    expect(cbs.onDelete).not.toHaveBeenCalled();
  });

  it('delete click does not trigger row click', async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    const rows = [makeRow('1', 'Wrench', 'Tool', 1)];
    render(<PartToolTable rows={rows} callbacks={makeCallbacks()} onRowClick={onRowClick} />);

    await user.click(screen.getByTestId('parttool-row-delete-spt-1'));
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('shows red text on empty name', () => {
    const rows = [makeRow('1', '', 'Part', 1)];
    render(<PartToolTable rows={rows} callbacks={makeCallbacks()} />);

    const nameEl = screen.getByTestId('parttool-row-name-spt-1');
    expect(nameEl.className).toContain('text-red');
  });

  it('renders empty table when no rows', () => {
    render(<PartToolTable rows={[]} callbacks={makeCallbacks()} />);
    expect(screen.getByTestId('parttool-table')).toBeInTheDocument();
    expect(screen.queryAllByTestId(/^parttool-row-spt-/)).toHaveLength(0);
  });

  it('used column renders computed amount', () => {
    const rows = [makeRow('1', 'Bolt', 'Part', 2)];
    const allSubstepPartTools = {
      spt1: { partToolId: 'pt-1', amount: 1 },
      spt2: { partToolId: 'pt-1', amount: 3 },
    };
    render(<PartToolTable rows={rows} callbacks={makeCallbacks()} allSubstepPartTools={allSubstepPartTools} />);
    const usedCell = screen.getByTestId('parttool-row-used-spt-1');
    expect(usedCell).toHaveTextContent('4');
  });

  it('mismatch styling applied when used !== declared amount', () => {
    const rows = [makeRow('1', 'Bolt', 'Part', 5)];
    const allSubstepPartTools = {
      spt1: { partToolId: 'pt-1', amount: 2 },
    };
    render(<PartToolTable rows={rows} callbacks={makeCallbacks()} allSubstepPartTools={allSubstepPartTools} />);
    const usedCell = screen.getByTestId('parttool-row-used-spt-1');
    expect(usedCell.className).toContain('text-red');
  });

  // ── testIdPrefix ──

  it('uses custom testIdPrefix for data-testid values', () => {
    const rows = [makeRow('1', 'Bolt', 'Part', 1)];
    render(<PartToolTable rows={rows} callbacks={makeCallbacks()} testIdPrefix="custom" />);
    expect(screen.getByTestId('custom-spt-1')).toBeInTheDocument();
    expect(screen.getByTestId('custom-type-spt-1')).toBeInTheDocument();
    expect(screen.getByTestId('custom-name-spt-1')).toBeInTheDocument();
    expect(screen.getByTestId('custom-delete-spt-1')).toBeInTheDocument();
  });

  // ── Thumbnail support ──

  it('shows thumbnail when getPreviewUrl returns a URL', () => {
    const rows = [makeRow('1', 'Bolt', 'Part', 1)];
    render(
      <PartToolTable
        rows={rows}
        callbacks={makeCallbacks()}
        getPreviewUrl={() => 'http://example.com/img.jpg'}
      />,
    );
    const img = screen.getByTestId('parttool-row-thumbnail-spt-1');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'http://example.com/img.jpg');
  });

  it('shows placeholder when getPreviewUrl returns null', () => {
    const rows = [makeRow('1', 'Bolt', 'Part', 1)];
    render(
      <PartToolTable
        rows={rows}
        callbacks={makeCallbacks()}
        getPreviewUrl={() => null}
      />,
    );
    expect(screen.queryByTestId('parttool-row-thumbnail-spt-1')).not.toBeInTheDocument();
  });

  it('does not show thumbnail column when getPreviewUrl not provided', () => {
    const rows = [makeRow('1', 'Bolt', 'Part', 1)];
    render(<PartToolTable rows={rows} callbacks={makeCallbacks()} />);
    expect(screen.queryByTestId('parttool-row-thumbnail-spt-1')).not.toBeInTheDocument();
  });

  // ── onRowClick ──

  it('onRowClick: calls callback when row is clicked', async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    const rows = [makeRow('1', 'Wrench', 'Tool', 2)];
    render(<PartToolTable rows={rows} callbacks={makeCallbacks()} onRowClick={onRowClick} />);

    const row = screen.getByTestId('parttool-row-spt-1');
    await user.click(row);
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });

  it('onRowClick: row has cursor-pointer class', () => {
    const rows = [makeRow('1', 'Wrench', 'Tool', 1)];
    render(<PartToolTable rows={rows} callbacks={makeCallbacks()} onRowClick={vi.fn()} />);
    const row = screen.getByTestId('parttool-row-spt-1');
    expect(row.className).toContain('cursor-pointer');
  });

  // ── selectedRowId ──

  it('selectedRowId: applies highlight class to matching row', () => {
    const rows = [makeRow('1', 'Wrench', 'Tool', 1), makeRow('2', 'Bolt', 'Part', 1)];
    render(<PartToolTable rows={rows} callbacks={makeCallbacks()} selectedRowId="spt-1" />);

    const selected = screen.getByTestId('parttool-row-spt-1');
    expect(selected.className).toContain('bg-[var(--color-bg-selected)]');

    const unselected = screen.getByTestId('parttool-row-spt-2');
    expect(unselected.className).not.toContain('bg-[var(--color-bg-selected)]');
  });
});

describe('PartToolTable — compact mode', () => {
  it('compact mode renders 6 column headers with edit icon (thumbnail, type, name, part#, amount, action)', () => {
    const rows = [makeRow('1', 'Wrench', 'Tool', 2)];
    const { container } = render(
      <PartToolTable rows={rows} callbacks={makeCallbacks()} compact getPreviewUrl={() => null} onEditClick={vi.fn()} />,
    );
    const headers = container.querySelectorAll('th');
    // 6 columns: Img, Type, Name, Part#, Amt, Action (edit)
    expect(headers).toHaveLength(6);
  });

  it('compact mode without onEditClick renders 5 headers (no action column)', () => {
    const rows = [makeRow('1', 'Wrench', 'Tool', 2)];
    const { container } = render(
      <PartToolTable rows={rows} callbacks={makeCallbacks()} compact getPreviewUrl={() => null} />,
    );
    const headers = container.querySelectorAll('th');
    expect(headers).toHaveLength(5);
  });

  it('compact mode shows edit icon instead of delete', () => {
    const rows = [makeRow('1', 'Wrench', 'Tool', 1)];
    render(<PartToolTable rows={rows} callbacks={makeCallbacks()} compact onEditClick={vi.fn()} />);
    expect(screen.getByTestId('parttool-row-edit-spt-1')).toBeInTheDocument();
    expect(screen.queryByTestId('parttool-row-delete-spt-1')).not.toBeInTheDocument();
  });

  it('compact mode edit click fires onEditClick and does not trigger row click', async () => {
    const user = userEvent.setup();
    const onEditClick = vi.fn();
    const onRowClick = vi.fn();
    const rows = [makeRow('1', 'Wrench', 'Tool', 1)];
    render(<PartToolTable rows={rows} callbacks={makeCallbacks()} compact onEditClick={onEditClick} onRowClick={onRowClick} />);

    await user.click(screen.getByTestId('parttool-row-edit-spt-1'));
    expect(onEditClick).toHaveBeenCalledWith(rows[0]);
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('compact mode renders cells as read-only spans', () => {
    const rows = [makeRow('1', 'Wrench', 'Tool', 2, { partNumber: 'PN-99' })];
    render(<PartToolTable rows={rows} callbacks={makeCallbacks()} compact />);

    const nameCell = screen.getByTestId('parttool-row-name-spt-1');
    expect(nameCell.tagName).toBe('SPAN');

    const amountCell = screen.getByTestId('parttool-row-amount-spt-1');
    expect(amountCell.tagName).toBe('SPAN');
  });

  it('compact mode hides label, unit, material, dimension, description columns', () => {
    const rows = [makeRow('1', 'Wrench', 'Tool', 1, { label: 'W1', unit: 'pcs', material: 'Steel', dimension: '10mm', description: 'Desc' })];
    render(<PartToolTable rows={rows} callbacks={makeCallbacks()} compact />);

    expect(screen.queryByTestId('parttool-row-label-spt-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('parttool-row-unit-spt-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('parttool-row-material-spt-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('parttool-row-dimension-spt-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('parttool-row-description-spt-1')).not.toBeInTheDocument();
  });
});
