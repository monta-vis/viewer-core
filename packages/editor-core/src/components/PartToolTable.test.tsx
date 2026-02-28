import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PartToolTable, type PartToolTableCallbacks, type PartToolTableItem } from './PartToolTable';
import type { PartToolRow } from '@monta-vis/viewer-core';

// Mock react-image-crop
vi.mock('react-image-crop', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="react-crop">{children}</div>
  ),
}));
vi.mock('react-image-crop/dist/ReactCrop.css', () => ({}));

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

  it('shows inputs pre-filled with partTool values', () => {
    const rows = [makeRow('1', 'Wrench', 'Tool', 3, { partNumber: 'PN-99', material: 'Steel', dimension: '10mm', unit: 'pcs' })];
    render(<PartToolTable rows={rows} callbacks={makeCallbacks()} />);

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
    const rows = [makeRow('1', 'Wrench', 'Tool', 1)];
    render(<PartToolTable rows={rows} callbacks={cbs} />);

    const toggle = screen.getByTestId('parttool-row-type-spt-1');
    await user.click(toggle);
    expect(cbs.onUpdatePartTool).toHaveBeenCalledWith('pt-1', { type: 'Part' });
  });

  it('name change fires onUpdatePartTool on blur', async () => {
    const user = userEvent.setup();
    const cbs = makeCallbacks();
    const rows = [makeRow('1', 'Wrench', 'Tool', 1)];
    render(<PartToolTable rows={rows} callbacks={cbs} />);

    const input = screen.getByDisplayValue('Wrench');
    await user.clear(input);
    await user.type(input, 'Hammer');
    await user.tab(); // blur
    expect(cbs.onUpdatePartTool).toHaveBeenCalledWith('pt-1', { name: 'Hammer' });
  });

  it('amount change fires onUpdateAmount on blur', async () => {
    const user = userEvent.setup();
    const cbs = makeCallbacks();
    const rows = [makeRow('1', 'Wrench', 'Tool', 2)];
    render(<PartToolTable rows={rows} callbacks={cbs} />);

    const input = screen.getByDisplayValue('2');
    await user.clear(input);
    await user.type(input, '5');
    await user.tab();
    expect(cbs.onUpdateAmount).toHaveBeenCalledWith('spt-1', 5);
  });

  it('delete fires onDelete with row id', async () => {
    const user = userEvent.setup();
    const cbs = makeCallbacks();
    const rows = [makeRow('1', 'Wrench', 'Tool', 1)];
    render(<PartToolTable rows={rows} callbacks={cbs} />);

    const deleteBtn = screen.getByTestId('parttool-row-delete-spt-1');
    await user.click(deleteBtn);
    expect(cbs.onDelete).toHaveBeenCalledWith('spt-1');
  });

  it('shows red border on empty name', () => {
    const rows = [makeRow('1', '', 'Part', 1)];
    render(<PartToolTable rows={rows} callbacks={makeCallbacks()} />);

    const nameInput = screen.getByTestId('parttool-row-name-spt-1');
    expect(nameInput.className).toContain('border-red');
  });

  it('renders empty table when no rows', () => {
    render(<PartToolTable rows={[]} callbacks={makeCallbacks()} />);
    expect(screen.getByTestId('parttool-table')).toBeInTheDocument();
    expect(screen.queryAllByTestId(/^parttool-row-/)).toHaveLength(0);
  });

  it('description column renders and edits on blur', async () => {
    const user = userEvent.setup();
    const cbs = makeCallbacks();
    const rows = [makeRow('1', 'Wrench', 'Tool', 1, { description: 'A wrench' })];
    render(<PartToolTable rows={rows} callbacks={cbs} />);

    const descInput = screen.getByDisplayValue('A wrench');
    expect(descInput).toBeInTheDocument();
    await user.clear(descInput);
    await user.type(descInput, 'Big wrench');
    await user.tab();
    expect(cbs.onUpdatePartTool).toHaveBeenCalledWith('pt-1', { description: 'Big wrench' });
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

  it('shows upload button when getPreviewUrl returns null and imageCallbacks provided', () => {
    const rows = [makeRow('1', 'Bolt', 'Part', 1)];
    render(
      <PartToolTable
        rows={rows}
        callbacks={makeCallbacks()}
        getPreviewUrl={() => null}
        imageCallbacks={{ onUploadImage: vi.fn() }}
      />,
    );
    expect(screen.getByTestId('parttool-row-upload-spt-1')).toBeInTheDocument();
  });

  it('shows fallback placeholder when getPreviewUrl returns null and no imageCallbacks', () => {
    const rows = [makeRow('1', 'Bolt', 'Part', 1)];
    render(
      <PartToolTable
        rows={rows}
        callbacks={makeCallbacks()}
        getPreviewUrl={() => null}
      />,
    );
    // No upload button, no thumbnail — just the placeholder div
    expect(screen.queryByTestId('parttool-row-thumbnail-spt-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('parttool-row-upload-spt-1')).not.toBeInTheDocument();
  });

  it('shows delete-image overlay when imageCallbacks.onDeleteImage provided', () => {
    const rows = [makeRow('1', 'Bolt', 'Part', 1)];
    render(
      <PartToolTable
        rows={rows}
        callbacks={makeCallbacks()}
        getPreviewUrl={() => 'http://example.com/img.jpg'}
        imageCallbacks={{ onUploadImage: vi.fn(), onDeleteImage: vi.fn() }}
      />,
    );
    expect(screen.getByTestId('parttool-row-delete-image-spt-1')).toBeInTheDocument();
  });

  it('does not show thumbnail column when getPreviewUrl not provided', () => {
    const rows = [makeRow('1', 'Bolt', 'Part', 1)];
    render(<PartToolTable rows={rows} callbacks={makeCallbacks()} />);
    expect(screen.queryByTestId('parttool-row-thumbnail-spt-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('parttool-row-upload-spt-1')).not.toBeInTheDocument();
  });
});
