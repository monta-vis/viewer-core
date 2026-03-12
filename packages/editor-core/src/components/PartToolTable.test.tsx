import React from 'react';
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

// Track TextInputModal instances for testing
let textInputModalProps: {
  label: string; value: string; inputType?: string;
  onConfirm: (v: string) => void; onCancel: () => void;
} | null = null;

// Mock viewer-core useMenuClose (used by PartToolImagePicker) + TextInputModal
vi.mock('@monta-vis/viewer-core', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useMenuClose: vi.fn(),
    TextInputModal: ({ label, value, inputType, onConfirm, onCancel }: {
      label: string; value: string; inputType?: string;
      onConfirm: (v: string) => void; onCancel: () => void;
    }) => {
      textInputModalProps = { label, value, inputType, onConfirm, onCancel };
      return (
        <div data-testid="text-input-modal">
          <span data-testid="text-input-modal-label">{label}</span>
          <span data-testid="text-input-modal-value">{value}</span>
          <button data-testid="text-input-modal-confirm" onClick={() => onConfirm(value)}>Confirm</button>
          <button data-testid="text-input-modal-cancel" onClick={() => onCancel()}>Cancel</button>
        </div>
      );
    },
  };
});

afterEach(() => {
  cleanup();
  textInputModalProps = null;
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

  it('shows cell buttons with partTool values', () => {
    const rows = [makeRow('1', 'Wrench', 'Tool', 3, { partNumber: 'PN-99', material: 'Steel', dimension: '10mm', unit: 'pcs' })];
    render(<PartToolTable rows={rows} callbacks={makeCallbacks()} />);

    expect(screen.getByTestId('parttool-row-name-spt-1')).toHaveTextContent('Wrench');
    expect(screen.getByTestId('parttool-row-partNumber-spt-1')).toHaveTextContent('PN-99');
    expect(screen.getByTestId('parttool-row-amount-spt-1')).toHaveTextContent('3');
    expect(screen.getByTestId('parttool-row-material-spt-1')).toHaveTextContent('Steel');
    expect(screen.getByTestId('parttool-row-dimension-spt-1')).toHaveTextContent('10mm');
    expect(screen.getByTestId('parttool-row-unit-spt-1')).toHaveTextContent('pcs');
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

  it('name change via TextInputModal fires onUpdatePartTool on confirm', async () => {
    const user = userEvent.setup();
    const cbs = makeCallbacks();
    const rows = [makeRow('1', 'Wrench', 'Tool', 1)];
    render(<PartToolTable rows={rows} callbacks={cbs} />);

    // Click name cell to open modal
    await user.click(screen.getByTestId('parttool-row-name-spt-1'));
    expect(textInputModalProps).not.toBeNull();
    expect(textInputModalProps!.value).toBe('Wrench');

    // Confirm with new value
    textInputModalProps!.onConfirm('Hammer');
    expect(cbs.onUpdatePartTool).toHaveBeenCalledWith('pt-1', { name: 'Hammer' });
  });

  it('amount change via TextInputModal fires onUpdateAmount on confirm', async () => {
    const user = userEvent.setup();
    const cbs = makeCallbacks();
    const rows = [makeRow('1', 'Wrench', 'Tool', 2)];
    render(<PartToolTable rows={rows} callbacks={cbs} />);

    // Click amount cell to open modal
    await user.click(screen.getByTestId('parttool-row-amount-spt-1'));
    expect(textInputModalProps).not.toBeNull();
    expect(textInputModalProps!.value).toBe('2');
    expect(textInputModalProps!.inputType).toBe('number');

    // Confirm with new value
    textInputModalProps!.onConfirm('5');
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

  it('shows red text on empty name', () => {
    const rows = [makeRow('1', '', 'Part', 1)];
    render(<PartToolTable rows={rows} callbacks={makeCallbacks()} />);

    const nameBtn = screen.getByTestId('parttool-row-name-spt-1');
    expect(nameBtn.className).toContain('text-red');
  });

  it('renders empty table when no rows', () => {
    render(<PartToolTable rows={[]} callbacks={makeCallbacks()} />);
    expect(screen.getByTestId('parttool-table')).toBeInTheDocument();
    expect(screen.queryAllByTestId(/^parttool-row-/)).toHaveLength(0);
  });

  it('description column renders and edits via TextInputModal', async () => {
    const user = userEvent.setup();
    const cbs = makeCallbacks();
    const rows = [makeRow('1', 'Wrench', 'Tool', 1, { description: 'A wrench' })];
    render(<PartToolTable rows={rows} callbacks={cbs} />);

    const descBtn = screen.getByTestId('parttool-row-description-spt-1');
    expect(descBtn).toHaveTextContent('A wrench');

    await user.click(descBtn);
    expect(textInputModalProps).not.toBeNull();
    expect(textInputModalProps!.value).toBe('A wrench');

    textInputModalProps!.onConfirm('Big wrench');
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

  // ── Image Picker integration ──

  it('thumbnail click opens image picker when getPartToolImages provided', async () => {
    const user = userEvent.setup();
    const rows = [makeRow('1', 'Bolt', 'Part', 1)];
    const getPartToolImages = vi.fn().mockReturnValue([
      { junctionId: 'j-1', areaId: 'a-1', url: 'http://example.com/img.jpg', isPreview: true },
    ]);
    render(
      <PartToolTable
        rows={rows}
        callbacks={makeCallbacks()}
        getPreviewUrl={() => 'http://example.com/img.jpg'}
        imageCallbacks={{ onUploadImage: vi.fn(), onSetPreviewImage: vi.fn() }}
        getPartToolImages={getPartToolImages}
      />,
    );

    // Picker not open yet
    expect(screen.queryByTestId('picker-add-image')).not.toBeInTheDocument();

    // Click thumbnail
    const thumbnail = screen.getByTestId('parttool-row-thumbnail-spt-1');
    await user.click(thumbnail);

    // Picker is now open
    expect(screen.getByTestId('picker-add-image')).toBeInTheDocument();
  });

  it('image picker select calls onSetPreviewImage and closes picker', async () => {
    const user = userEvent.setup();
    const onSetPreviewImage = vi.fn();
    const rows = [makeRow('1', 'Bolt', 'Part', 1)];
    const getPartToolImages = vi.fn().mockReturnValue([
      { junctionId: 'j-1', areaId: 'a-1', url: 'http://example.com/img1.jpg', isPreview: true },
      { junctionId: 'j-2', areaId: 'a-2', url: 'http://example.com/img2.jpg', isPreview: false },
    ]);
    render(
      <PartToolTable
        rows={rows}
        callbacks={makeCallbacks()}
        getPreviewUrl={() => 'http://example.com/img1.jpg'}
        imageCallbacks={{ onUploadImage: vi.fn(), onSetPreviewImage }}
        getPartToolImages={getPartToolImages}
      />,
    );

    // Open picker
    await user.click(screen.getByTestId('parttool-row-thumbnail-spt-1'));

    // Select second image
    await user.click(screen.getByTestId('picker-image-j-2'));
    expect(onSetPreviewImage).toHaveBeenCalledWith('pt-1', 'j-2', 'a-2');

    // Picker should be closed
    expect(screen.queryByTestId('picker-add-image')).not.toBeInTheDocument();
  });

  // ── onOpenPartToolList integration ──

  it('clicking catalog field (name) calls onOpenPartToolList when provided', async () => {
    const user = userEvent.setup();
    const onOpenPartToolList = vi.fn();
    const rows = [makeRow('1', 'Wrench', 'Tool', 1)];
    render(<PartToolTable rows={rows} callbacks={makeCallbacks()} onOpenPartToolList={onOpenPartToolList} />);

    await user.click(screen.getByTestId('parttool-row-name-spt-1'));
    expect(onOpenPartToolList).toHaveBeenCalledOnce();
    expect(textInputModalProps).toBeNull(); // no modal opened
  });

  it('clicking catalog field (label) calls onOpenPartToolList when provided', async () => {
    const user = userEvent.setup();
    const onOpenPartToolList = vi.fn();
    const rows = [makeRow('1', 'Wrench', 'Tool', 1, { label: 'W1' })];
    render(<PartToolTable rows={rows} callbacks={makeCallbacks()} onOpenPartToolList={onOpenPartToolList} />);

    await user.click(screen.getByTestId('parttool-row-label-spt-1'));
    expect(onOpenPartToolList).toHaveBeenCalledOnce();
  });

  it('clicking catalog field (partNumber) calls onOpenPartToolList when provided', async () => {
    const user = userEvent.setup();
    const onOpenPartToolList = vi.fn();
    const rows = [makeRow('1', 'Wrench', 'Tool', 1, { partNumber: 'PN-1' })];
    render(<PartToolTable rows={rows} callbacks={makeCallbacks()} onOpenPartToolList={onOpenPartToolList} />);

    await user.click(screen.getByTestId('parttool-row-partNumber-spt-1'));
    expect(onOpenPartToolList).toHaveBeenCalledOnce();
  });

  it('clicking catalog field without onOpenPartToolList opens TextInputModal', async () => {
    const user = userEvent.setup();
    const rows = [makeRow('1', 'Wrench', 'Tool', 1)];
    render(<PartToolTable rows={rows} callbacks={makeCallbacks()} />);

    await user.click(screen.getByTestId('parttool-row-name-spt-1'));
    expect(textInputModalProps).not.toBeNull();
    expect(textInputModalProps!.value).toBe('Wrench');
  });

  it('clicking non-catalog fields opens TextInputModal even with onOpenPartToolList', async () => {
    const user = userEvent.setup();
    const onOpenPartToolList = vi.fn();
    const rows = [makeRow('1', 'Wrench', 'Tool', 1, { unit: 'pcs', material: 'Steel', dimension: '10mm', description: 'Desc' })];
    render(<PartToolTable rows={rows} callbacks={makeCallbacks()} onOpenPartToolList={onOpenPartToolList} />);

    for (const field of ['unit', 'material', 'dimension', 'description'] as const) {
      await user.click(screen.getByTestId(`parttool-row-${field}-spt-1`));
      expect(textInputModalProps).not.toBeNull();
      expect(onOpenPartToolList).not.toHaveBeenCalled();
      textInputModalProps!.onCancel();
      textInputModalProps = null;
    }
  });

  it('image picker add triggers file input flow', async () => {
    const user = userEvent.setup();
    const rows = [makeRow('1', 'Bolt', 'Part', 1)];
    const getPartToolImages = vi.fn().mockReturnValue([]);
    render(
      <PartToolTable
        rows={rows}
        callbacks={makeCallbacks()}
        getPreviewUrl={() => null}
        imageCallbacks={{ onUploadImage: vi.fn() }}
        getPartToolImages={getPartToolImages}
      />,
    );

    // Open picker
    await user.click(screen.getByTestId('parttool-row-thumbnail-spt-1'));

    // Click add button
    await user.click(screen.getByTestId('picker-add-image'));

    // Picker should close (file input triggered)
    expect(screen.queryByTestId('picker-add-image')).not.toBeInTheDocument();
  });

  // ── readOnly mode ──

  it('readOnly: renders cells as plain text, not buttons', () => {
    const rows = [makeRow('1', 'Wrench', 'Tool', 2, { partNumber: 'PN-99', unit: 'pcs' })];
    render(<PartToolTable rows={rows} callbacks={makeCallbacks()} readOnly />);

    // Name cell should be a span, not a button
    const nameCell = screen.getByTestId('parttool-row-name-spt-1');
    expect(nameCell.tagName).toBe('SPAN');
    expect(nameCell).toHaveTextContent('Wrench');

    // Amount cell should also be a span
    const amountCell = screen.getByTestId('parttool-row-amount-spt-1');
    expect(amountCell.tagName).toBe('SPAN');
    expect(amountCell).toHaveTextContent('2');
  });

  it('readOnly: hides delete button', () => {
    const rows = [makeRow('1', 'Wrench', 'Tool', 1)];
    render(<PartToolTable rows={rows} callbacks={makeCallbacks()} readOnly />);
    expect(screen.queryByTestId('parttool-row-delete-spt-1')).not.toBeInTheDocument();
  });

  it('readOnly: hides delete column header', () => {
    const rows = [makeRow('1', 'Wrench', 'Tool', 1)];
    const { container, unmount } = render(<PartToolTable rows={rows} callbacks={makeCallbacks()} readOnly />);
    const readOnlyHeaderCount = container.querySelectorAll('th').length;
    unmount();

    const { container: c2 } = render(<PartToolTable rows={rows} callbacks={makeCallbacks()} />);
    const normalHeaderCount = c2.querySelectorAll('th').length;
    // readOnly should have one fewer header (the delete column)
    expect(readOnlyHeaderCount).toBe(normalHeaderCount - 1);
  });

  it('readOnly: type toggle is disabled (not clickable)', async () => {
    const user = userEvent.setup();
    const cbs = makeCallbacks();
    const rows = [makeRow('1', 'Wrench', 'Tool', 1)];
    render(<PartToolTable rows={rows} callbacks={cbs} readOnly />);

    // Type should be a span, not a button
    const typeCell = screen.getByTestId('parttool-row-type-spt-1');
    expect(typeCell.tagName).toBe('SPAN');
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

  it('defaults unchanged: non-readOnly renders buttons and delete', () => {
    const rows = [makeRow('1', 'Wrench', 'Tool', 1)];
    render(<PartToolTable rows={rows} callbacks={makeCallbacks()} />);

    // Name should be a button
    const nameCell = screen.getByTestId('parttool-row-name-spt-1');
    expect(nameCell.tagName).toBe('BUTTON');

    // Delete should exist
    expect(screen.getByTestId('parttool-row-delete-spt-1')).toBeInTheDocument();
  });

  // ── editingRowId (inline editing) ──

  it('editingRowId: matching row renders EditInput fields', () => {
    const rows = [makeRow('1', 'Wrench', 'Tool', 2, { label: 'W1', partNumber: 'PN-1', unit: 'pcs', material: 'Steel', dimension: '10mm', description: 'Desc' })];
    render(<PartToolTable rows={rows} callbacks={makeCallbacks()} editingRowId="spt-1" />);

    // All editable fields should be input elements
    for (const field of ['label', 'name', 'partNumber', 'amount', 'unit', 'material', 'dimension', 'description']) {
      const el = screen.getByTestId(`parttool-row-${field}-spt-1`);
      expect(el.tagName).toBe('INPUT');
    }
  });

  it('editingRowId: non-matching rows render as read-only spans', () => {
    const rows = [makeRow('1', 'Wrench', 'Tool', 1), makeRow('2', 'Bolt', 'Part', 2)];
    render(<PartToolTable rows={rows} callbacks={makeCallbacks()} editingRowId="spt-1" />);

    // Row 2 (non-editing) should have spans
    const nameCell = screen.getByTestId('parttool-row-name-spt-2');
    expect(nameCell.tagName).toBe('SPAN');
  });

  it('editingRowId: blur with changed value fires onUpdatePartTool', async () => {
    const user = userEvent.setup();
    const cbs = makeCallbacks();
    const rows = [makeRow('1', 'Wrench', 'Tool', 1)];
    render(<PartToolTable rows={rows} callbacks={cbs} editingRowId="spt-1" />);

    const nameInput = screen.getByTestId('parttool-row-name-spt-1');
    await user.clear(nameInput);
    await user.type(nameInput, 'Hammer');
    await user.tab(); // blur

    expect(cbs.onUpdatePartTool).toHaveBeenCalledWith('pt-1', { name: 'Hammer' });
  });

  it('editingRowId: blur with unchanged value does NOT fire callback', async () => {
    const user = userEvent.setup();
    const cbs = makeCallbacks();
    const rows = [makeRow('1', 'Wrench', 'Tool', 1)];
    render(<PartToolTable rows={rows} callbacks={cbs} editingRowId="spt-1" />);

    const nameInput = screen.getByTestId('parttool-row-name-spt-1');
    // Focus and blur without changing
    await user.click(nameInput);
    await user.tab();

    expect(cbs.onUpdatePartTool).not.toHaveBeenCalled();
  });

  it('editingRowId: amount blur fires onUpdateAmount with parsed number', async () => {
    const user = userEvent.setup();
    const cbs = makeCallbacks();
    const rows = [makeRow('1', 'Wrench', 'Tool', 2)];
    render(<PartToolTable rows={rows} callbacks={cbs} editingRowId="spt-1" />);

    const amountInput = screen.getByTestId('parttool-row-amount-spt-1') as HTMLInputElement;
    // Focus, select all, replace
    await user.click(amountInput);
    await user.keyboard('{Control>}a{/Control}');
    await user.keyboard('5');
    await user.tab();

    expect(cbs.onUpdateAmount).toHaveBeenCalledWith('spt-1', 5);
  });

  it('editingRowId: type toggle works in editing row', async () => {
    const user = userEvent.setup();
    const cbs = makeCallbacks();
    const rows = [makeRow('1', 'Wrench', 'Tool', 1)];
    render(<PartToolTable rows={rows} callbacks={cbs} editingRowId="spt-1" />);

    const toggle = screen.getByTestId('parttool-row-type-spt-1');
    await user.click(toggle);
    expect(cbs.onUpdatePartTool).toHaveBeenCalledWith('pt-1', { type: 'Part' });
  });

  it('editingRowId: delete button visible on editing row', () => {
    const rows = [makeRow('1', 'Wrench', 'Tool', 1)];
    render(<PartToolTable rows={rows} callbacks={makeCallbacks()} editingRowId="spt-1" />);
    expect(screen.getByTestId('parttool-row-delete-spt-1')).toBeInTheDocument();
  });

  // ── addRow ──

  it('addRow: renders empty editable row at top of tbody', () => {
    const rows = [makeRow('1', 'Wrench', 'Tool', 1)];
    const addRow = {
      values: { type: 'Part' as const, label: '', name: '', partNumber: '', amount: 1, unit: '', material: '', dimension: '', description: '' },
      onChange: vi.fn(),
      onConfirm: vi.fn(),
      canConfirm: false,
    };
    render(<PartToolTable rows={rows} callbacks={makeCallbacks()} addRow={addRow} />);

    const addRowEl = screen.getByTestId('parttool-add-row');
    expect(addRowEl).toBeInTheDocument();
    // Add row should be first in tbody (before the data rows)
    const tbody = addRowEl.closest('tbody')!;
    expect(tbody.children[0]).toBe(addRowEl);
  });

  it('addRow: confirm button calls onConfirm', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const addRow = {
      values: { type: 'Part' as const, label: '', name: 'Bolt', partNumber: '', amount: 1, unit: '', material: '', dimension: '', description: '' },
      onChange: vi.fn(),
      onConfirm,
      canConfirm: true,
    };
    render(<PartToolTable rows={[]} callbacks={makeCallbacks()} addRow={addRow} />);

    await user.click(screen.getByTestId('parttool-add-confirm'));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('addRow: confirm button disabled when canConfirm=false', () => {
    const addRow = {
      values: { type: 'Part' as const, label: '', name: '', partNumber: '', amount: 1, unit: '', material: '', dimension: '', description: '' },
      onChange: vi.fn(),
      onConfirm: vi.fn(),
      canConfirm: false,
    };
    render(<PartToolTable rows={[]} callbacks={makeCallbacks()} addRow={addRow} />);

    expect(screen.getByTestId('parttool-add-confirm')).toBeDisabled();
  });
});

describe('PartToolTable — compact mode', () => {
  it('compact mode renders only 5 column headers (thumbnail, type, name, part#, amount)', () => {
    const rows = [makeRow('1', 'Wrench', 'Tool', 2, { label: 'W1', partNumber: 'PN-1' })];
    const { container } = render(
      <PartToolTable rows={rows} callbacks={makeCallbacks()} compact getPreviewUrl={() => null} />,
    );
    const headers = container.querySelectorAll('th');
    // 5 columns: Img, Type, Name, Part#, Amt
    expect(headers).toHaveLength(5);
  });

  it('compact mode does not render action column', () => {
    const rows = [makeRow('1', 'Wrench', 'Tool', 1)];
    render(<PartToolTable rows={rows} callbacks={makeCallbacks()} compact />);
    expect(screen.queryByTestId('parttool-row-delete-spt-1')).not.toBeInTheDocument();
  });

  it('compact mode rows are read-only (spans not buttons)', () => {
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

  it('compact mode ignores editingRowId (all rows read-only)', () => {
    const rows = [makeRow('1', 'Wrench', 'Tool', 1)];
    render(<PartToolTable rows={rows} callbacks={makeCallbacks()} compact editingRowId="spt-1" />);

    const nameCell = screen.getByTestId('parttool-row-name-spt-1');
    expect(nameCell.tagName).toBe('SPAN');
  });

  it('compact mode ignores addRow', () => {
    const addRow = {
      values: { type: 'Part' as const, label: '', name: 'Bolt', partNumber: '', amount: 1, unit: '', material: '', dimension: '', description: '' },
      onChange: vi.fn(),
      onConfirm: vi.fn(),
      canConfirm: true,
    };
    render(<PartToolTable rows={[]} callbacks={makeCallbacks()} compact addRow={addRow} />);

    expect(screen.queryByTestId('parttool-add-row')).not.toBeInTheDocument();
  });
});
