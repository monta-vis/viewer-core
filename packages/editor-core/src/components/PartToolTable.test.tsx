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
  suggestions?: Array<{ id: string; label: string; sublabel?: string }>;
  onConfirm: (v: string) => void; onCancel: () => void;
  onSelect?: (id: string) => void;
  onSecondaryConfirm?: (v: string) => void;
  secondaryConfirmLabel?: string;
  confirmLabel?: string;
} | null = null;

// Mock viewer-core useMenuClose (used by PartToolImagePicker) + TextInputModal
vi.mock('@monta-vis/viewer-core', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useMenuClose: vi.fn(),
    TextInputModal: ({ label, value, inputType, suggestions, onConfirm, onCancel, onSelect, onSecondaryConfirm, secondaryConfirmLabel, confirmLabel }: {
      label: string; value: string; inputType?: string;
      suggestions?: Array<{ id: string; label: string; sublabel?: string }>;
      onConfirm: (v: string) => void; onCancel: () => void;
      onSelect?: (id: string) => void;
      onSecondaryConfirm?: (v: string) => void;
      secondaryConfirmLabel?: string;
      confirmLabel?: string;
    }) => {
      textInputModalProps = { label, value, inputType, suggestions, onConfirm, onCancel, onSelect, onSecondaryConfirm, secondaryConfirmLabel, confirmLabel };
      return (
        <div data-testid="text-input-modal">
          <span data-testid="text-input-modal-label">{label}</span>
          <span data-testid="text-input-modal-value">{value}</span>
          {suggestions?.map((s) => (
            <button key={s.id} data-testid={`suggestion-${s.id}`} onClick={() => onSelect?.(s.id)}>{s.label}</button>
          ))}
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

  // ── Autocomplete integration ──

  it('clicking name cell without allPartTools opens TextInputModal without suggestions', async () => {
    const user = userEvent.setup();
    const rows = [makeRow('1', 'Wrench', 'Tool', 1)];
    render(<PartToolTable rows={rows} callbacks={makeCallbacks()} />);

    await user.click(screen.getByTestId('parttool-row-name-spt-1'));
    expect(textInputModalProps).not.toBeNull();
    expect(textInputModalProps!.suggestions).toBeUndefined();
  });

  it('clicking name cell with allPartTools opens TextInputModal with suggestions', async () => {
    const user = userEvent.setup();
    const allPartTools = [
      makePt('cat-1', 'Wrench', 'Tool'),
      makePt('cat-2', 'Bolt', 'Part'),
    ];
    const rows = [makeRow('1', '', 'Part', 1)];
    const cbs = makeCallbacks();
    render(
      <PartToolTable rows={rows} callbacks={cbs} allPartTools={allPartTools} />,
    );

    await user.click(screen.getByTestId('parttool-row-name-spt-1'));

    expect(textInputModalProps).not.toBeNull();
    expect(textInputModalProps!.suggestions).toHaveLength(2);
    expect(textInputModalProps!.suggestions![0].label).toBe('Wrench');
    expect(textInputModalProps!.suggestions![1].label).toBe('Bolt');
  });

  it('selecting suggestion in TextInputModal calls onSelectPartTool', async () => {
    const user = userEvent.setup();
    const allPartTools = [
      makePt('cat-1', 'Wrench', 'Tool'),
      makePt('cat-2', 'Bolt', 'Part'),
    ];
    const rows = [makeRow('1', '', 'Part', 1)];
    const onSelectPartTool = vi.fn();
    const cbs = { ...makeCallbacks(), onSelectPartTool };
    render(
      <PartToolTable rows={rows} callbacks={cbs} allPartTools={allPartTools} />,
    );

    await user.click(screen.getByTestId('parttool-row-name-spt-1'));

    // Select a suggestion via the mock's onSelect
    expect(textInputModalProps).not.toBeNull();
    textInputModalProps!.onSelect!('pt-cat-2');
    expect(onSelectPartTool).toHaveBeenCalledWith('spt-1', 'pt-cat-2');
  });

  it('clicking label cell with allPartTools opens TextInputModal with suggestions', async () => {
    const user = userEvent.setup();
    const allPartTools = [makePt('cat-1', 'Wrench', 'Tool', 1, { label: 'W1' })];
    const rows = [makeRow('1', 'Bolt', 'Part', 1)];
    render(<PartToolTable rows={rows} callbacks={makeCallbacks()} allPartTools={allPartTools} />);

    await user.click(screen.getByTestId('parttool-row-label-spt-1'));
    expect(textInputModalProps).not.toBeNull();
    expect(textInputModalProps!.suggestions).toHaveLength(1);
  });

  it('clicking partNumber cell with allPartTools opens TextInputModal with suggestions', async () => {
    const user = userEvent.setup();
    const allPartTools = [makePt('cat-1', 'Wrench', 'Tool', 1, { partNumber: 'PN-1' })];
    const rows = [makeRow('1', 'Bolt', 'Part', 1)];
    render(<PartToolTable rows={rows} callbacks={makeCallbacks()} allPartTools={allPartTools} />);

    await user.click(screen.getByTestId('parttool-row-partNumber-spt-1'));
    expect(textInputModalProps).not.toBeNull();
    expect(textInputModalProps!.suggestions).toHaveLength(1);
  });

  it('clicking unit/material/dimension/description cells with allPartTools opens TextInputModal WITHOUT suggestions', async () => {
    const user = userEvent.setup();
    const allPartTools = [makePt('cat-1', 'Wrench', 'Tool', 1, { unit: 'pcs', material: 'Steel', dimension: '10mm', description: 'Desc' })];
    const rows = [makeRow('1', 'Bolt', 'Part', 1, { unit: 'kg', material: 'Aluminum', dimension: '5mm', description: 'Test' })];
    render(<PartToolTable rows={rows} callbacks={makeCallbacks()} allPartTools={allPartTools} />);

    for (const field of ['unit', 'material', 'dimension', 'description'] as const) {
      await user.click(screen.getByTestId(`parttool-row-${field}-spt-1`));
      expect(textInputModalProps).not.toBeNull();
      expect(textInputModalProps!.suggestions).toBeUndefined();
      textInputModalProps!.onCancel();
      textInputModalProps = null;
    }
  });

  // ── Inline dual-confirm for autocomplete fields ──

  it('shows dual confirm buttons when autocomplete field on named partTool with onCreateAndReplacePartTool', async () => {
    const user = userEvent.setup();
    const cbs = { ...makeCallbacks(), onCreateAndReplacePartTool: vi.fn() };
    const rows = [makeRow('1', 'Wrench', 'Tool', 1)];
    render(<PartToolTable rows={rows} callbacks={cbs} />);

    await user.click(screen.getByTestId('parttool-row-name-spt-1'));
    expect(textInputModalProps).not.toBeNull();
    expect(textInputModalProps!.onSecondaryConfirm).toBeDefined();
    expect(textInputModalProps!.secondaryConfirmLabel).toBe('Create new');
    expect(textInputModalProps!.confirmLabel).toBe('Update');
  });

  it('no dual confirm without onCreateAndReplacePartTool — direct update', async () => {
    const user = userEvent.setup();
    const cbs = makeCallbacks();
    const rows = [makeRow('1', 'Wrench', 'Tool', 1)];
    render(<PartToolTable rows={rows} callbacks={cbs} />);

    await user.click(screen.getByTestId('parttool-row-name-spt-1'));
    expect(textInputModalProps!.onSecondaryConfirm).toBeUndefined();
    expect(textInputModalProps!.confirmLabel).toBeUndefined();

    textInputModalProps!.onConfirm('Hammer');
    expect(cbs.onUpdatePartTool).toHaveBeenCalledWith('pt-1', { name: 'Hammer' });
  });

  it('no dual confirm for non-autocomplete fields even with onCreateAndReplacePartTool', async () => {
    const user = userEvent.setup();
    const cbs = { ...makeCallbacks(), onCreateAndReplacePartTool: vi.fn() };
    const rows = [makeRow('1', 'Wrench', 'Tool', 1, { unit: 'pcs' })];
    render(<PartToolTable rows={rows} callbacks={cbs} />);

    await user.click(screen.getByTestId('parttool-row-unit-spt-1'));
    expect(textInputModalProps!.onSecondaryConfirm).toBeUndefined();

    textInputModalProps!.onConfirm('kg');
    expect(cbs.onUpdatePartTool).toHaveBeenCalledWith('pt-1', { unit: 'kg' });
  });

  it('no dual confirm for blank partTool (name is empty) — direct update', async () => {
    const user = userEvent.setup();
    const cbs = { ...makeCallbacks(), onCreateAndReplacePartTool: vi.fn() };
    const rows = [makeRow('1', '', 'Part', 1)];
    render(<PartToolTable rows={rows} callbacks={cbs} />);

    await user.click(screen.getByTestId('parttool-row-name-spt-1'));
    expect(textInputModalProps!.onSecondaryConfirm).toBeUndefined();

    textInputModalProps!.onConfirm('NewName');
    expect(cbs.onUpdatePartTool).toHaveBeenCalledWith('pt-1', { name: 'NewName' });
  });

  it('onSecondaryConfirm calls onCreateAndReplacePartTool', async () => {
    const user = userEvent.setup();
    const cbs = { ...makeCallbacks(), onCreateAndReplacePartTool: vi.fn() };
    const rows = [makeRow('1', 'Wrench', 'Tool', 1)];
    render(<PartToolTable rows={rows} callbacks={cbs} />);

    await user.click(screen.getByTestId('parttool-row-name-spt-1'));
    textInputModalProps!.onSecondaryConfirm!('Hammer');
    expect(cbs.onCreateAndReplacePartTool).toHaveBeenCalledWith('spt-1', 'name', 'Hammer');
    expect(cbs.onUpdatePartTool).not.toHaveBeenCalled();
  });

  it('onConfirm (primary) calls onUpdatePartTool even with dual confirm', async () => {
    const user = userEvent.setup();
    const cbs = { ...makeCallbacks(), onCreateAndReplacePartTool: vi.fn() };
    const rows = [makeRow('1', 'Wrench', 'Tool', 1)];
    render(<PartToolTable rows={rows} callbacks={cbs} />);

    await user.click(screen.getByTestId('parttool-row-name-spt-1'));
    textInputModalProps!.onConfirm('Hammer');
    expect(cbs.onUpdatePartTool).toHaveBeenCalledWith('pt-1', { name: 'Hammer' });
    expect(cbs.onCreateAndReplacePartTool).not.toHaveBeenCalled();
  });

  it('dual confirm shown for label field on existing partTool', async () => {
    const user = userEvent.setup();
    const cbs = { ...makeCallbacks(), onCreateAndReplacePartTool: vi.fn() };
    const rows = [makeRow('1', 'Wrench', 'Tool', 1, { label: 'W1' })];
    render(<PartToolTable rows={rows} callbacks={cbs} />);

    await user.click(screen.getByTestId('parttool-row-label-spt-1'));
    expect(textInputModalProps!.onSecondaryConfirm).toBeDefined();
  });

  it('dual confirm shown for partNumber field on existing partTool', async () => {
    const user = userEvent.setup();
    const cbs = { ...makeCallbacks(), onCreateAndReplacePartTool: vi.fn() };
    const rows = [makeRow('1', 'Wrench', 'Tool', 1, { partNumber: 'PN-1' })];
    render(<PartToolTable rows={rows} callbacks={cbs} />);

    await user.click(screen.getByTestId('parttool-row-partNumber-spt-1'));
    expect(textInputModalProps!.onSecondaryConfirm).toBeDefined();
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
});
