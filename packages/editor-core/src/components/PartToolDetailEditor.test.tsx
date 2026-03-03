import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PartToolDetailEditor } from './PartToolDetailEditor';
import type { AggregatedPartTool } from '@monta-vis/viewer-core';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback,
  }),
}));

// Mock PartToolImagePicker (editor-core internal)
const imagePickerSpy = vi.fn();
vi.mock('./PartToolImagePicker', () => ({
  PartToolImagePicker: (props: Record<string, unknown>) => {
    imagePickerSpy(props);
    return <div data-testid="image-picker">ImagePicker</div>;
  },
}));

// Mock ImageCropDialog
vi.mock('./ImageCropDialog', () => ({
  ImageCropDialog: () => <div data-testid="image-crop-dialog">CropDialog</div>,
}));

afterEach(() => {
  cleanup();
  document.body.style.overflow = '';
});

const mockItem: AggregatedPartTool = {
  partTool: {
    id: 'pt-1',
    versionId: 'v1',
    instructionId: 'i1',
    previewImageId: null,
    name: 'Steel Bolt',
    label: 'Main Bolt',
    type: 'Part',
    partNumber: 'BLT-001',
    amount: 4,
    description: 'High-strength bolt',
    unit: 'pcs',
    material: 'Stainless Steel',
    dimension: 'M8x40',
    iconId: null,
  },
  totalAmount: 8,
  amountsPerSubstep: new Map(),
};

const mockMinimalItem: AggregatedPartTool = {
  partTool: {
    id: 'pt-2',
    versionId: 'v1',
    instructionId: 'i1',
    previewImageId: null,
    name: 'Wrench',
    label: null,
    type: 'Tool',
    partNumber: null,
    amount: 1,
    description: null,
    unit: null,
    material: null,
    dimension: null,
    iconId: null,
  },
  totalAmount: 1,
  amountsPerSubstep: new Map(),
};

const mockCatalog = [
  { id: 'pt-10', name: 'Hex Bolt', label: null, partNumber: 'HEX-001', type: 'Part' as const, versionId: 'v1', instructionId: 'i1', previewImageId: null, amount: 1, description: null, unit: null, material: null, dimension: null, iconId: null },
  { id: 'pt-11', name: 'Cap Screw', label: null, partNumber: 'CAP-002', type: 'Part' as const, versionId: 'v1', instructionId: 'i1', previewImageId: null, amount: 1, description: null, unit: null, material: null, dimension: null, iconId: null },
];

const callbacks = {
  onReplacePartTool: vi.fn(),
  onCreatePartTool: vi.fn(),
  onEditPartToolAmount: vi.fn(),
  onDeletePartTool: vi.fn(),
  onUpdatePartTool: vi.fn(),
};

beforeEach(() => {
  Object.values(callbacks).forEach((fn) => fn.mockClear());
  imagePickerSpy.mockClear();
});

describe('PartToolDetailEditor — field editing', () => {
  it('renders all fields with values', () => {
    render(
      <PartToolDetailEditor
        partToolId="pt-1"
        item={mockItem}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Steel Bolt')).toBeInTheDocument();
    expect(screen.getByText('Main Bolt')).toBeInTheDocument();
    expect(screen.getByText('BLT-001')).toBeInTheDocument();
    expect(screen.getByText('8×')).toBeInTheDocument();
  });

  it('shows placeholders for empty fields', () => {
    render(
      <PartToolDetailEditor
        partToolId="pt-2"
        item={mockMinimalItem}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Add label')).toBeInTheDocument();
    expect(screen.getByText('Add part number')).toBeInTheDocument();
    expect(screen.getByText('Add unit')).toBeInTheDocument();
    expect(screen.getByText('Add material')).toBeInTheDocument();
    expect(screen.getByText('Add dimension')).toBeInTheDocument();
    expect(screen.getByText('Add description')).toBeInTheDocument();
  });

  it('opens TextInputModal when name is tapped and fires onUpdatePartTool on confirm (primary = update)', async () => {
    const user = userEvent.setup();
    render(
      <PartToolDetailEditor
        partToolId="pt-1"
        item={mockItem}
        onClose={vi.fn()}
        allPartTools={mockCatalog}
        onCreatePartTool={callbacks.onCreatePartTool}
        onUpdatePartTool={callbacks.onUpdatePartTool}
      />,
    );

    await user.click(screen.getByTestId('editable-name'));
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('Steel Bolt');

    await user.clear(input);
    await user.type(input, 'New Part{Enter}');
    expect(callbacks.onUpdatePartTool).toHaveBeenCalledWith('pt-1', { name: 'New Part' });
    expect(callbacks.onCreatePartTool).not.toHaveBeenCalled();
  });

  it('shows catalog suggestions and fires onReplacePartTool when selected', async () => {
    const user = userEvent.setup();
    render(
      <PartToolDetailEditor
        partToolId="pt-1"
        item={mockItem}
        onClose={vi.fn()}
        allPartTools={mockCatalog}
        onReplacePartTool={callbacks.onReplacePartTool}
      />,
    );

    await user.click(screen.getByTestId('editable-name'));
    await user.clear(screen.getByRole('textbox'));
    await user.click(screen.getByText('Hex Bolt'));

    expect(callbacks.onReplacePartTool).toHaveBeenCalledWith('pt-1', 'pt-10');
  });

  it('fires onEditPartToolAmount when amount is edited', async () => {
    const user = userEvent.setup();
    render(
      <PartToolDetailEditor
        partToolId="pt-1"
        item={mockItem}
        onClose={vi.fn()}
        onEditPartToolAmount={callbacks.onEditPartToolAmount}
      />,
    );

    await user.click(screen.getByTestId('editable-amount'));
    const input = screen.getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '12{Enter}');
    expect(callbacks.onEditPartToolAmount).toHaveBeenCalledWith('pt-1', '12');
  });

  it('fires onUpdatePartTool for unit field', async () => {
    const user = userEvent.setup();
    render(
      <PartToolDetailEditor
        partToolId="pt-1"
        item={mockItem}
        onClose={vi.fn()}
        onUpdatePartTool={callbacks.onUpdatePartTool}
      />,
    );

    await user.click(screen.getByTestId('editable-unit'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'kg{Enter}');
    expect(callbacks.onUpdatePartTool).toHaveBeenCalledWith('pt-1', { unit: 'kg' });
  });

  it('sends null for empty field value', async () => {
    const user = userEvent.setup();
    render(
      <PartToolDetailEditor
        partToolId="pt-1"
        item={mockItem}
        onClose={vi.fn()}
        onUpdatePartTool={callbacks.onUpdatePartTool}
      />,
    );

    await user.click(screen.getByTestId('editable-unit'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '{Enter}');
    expect(callbacks.onUpdatePartTool).toHaveBeenCalledWith('pt-1', { unit: null });
  });
});

describe('PartToolDetailEditor — image picker', () => {
  it('shows image edit button and toggles image picker on click', async () => {
    const user = userEvent.setup();
    render(
      <PartToolDetailEditor
        partToolId="pt-1"
        item={mockItem}
        onClose={vi.fn()}
        imageCallbacks={{ onUploadImage: vi.fn() }}
        getPartToolImages={() => []}
      />,
    );

    const imageBtn = screen.getByLabelText('Edit image');
    expect(imageBtn).toBeInTheDocument();

    await user.click(imageBtn);
    expect(screen.getByTestId('image-picker')).toBeInTheDocument();
  });
});

describe('PartToolDetailEditor — delete', () => {
  it('fires onDeletePartTool when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <PartToolDetailEditor
        partToolId="pt-1"
        item={mockItem}
        onClose={vi.fn()}
        onDeletePartTool={callbacks.onDeletePartTool}
      />,
    );

    await user.click(screen.getByLabelText('Delete part/tool'));
    expect(callbacks.onDeletePartTool).toHaveBeenCalledWith('pt-1');
  });
});

describe('PartToolDetailEditor — dual-confirm', () => {
  it('passes onSecondaryConfirm to TextInputModal for catalog fields when onCreatePartTool is provided', async () => {
    const user = userEvent.setup();
    render(
      <PartToolDetailEditor
        partToolId="pt-1"
        item={mockItem}
        onClose={vi.fn()}
        allPartTools={mockCatalog}
        onCreatePartTool={callbacks.onCreatePartTool}
        onUpdatePartTool={callbacks.onUpdatePartTool}
      />,
    );

    await user.click(screen.getByTestId('editable-name'));
    // Secondary confirm button should be visible with "Create new" label
    expect(screen.getByLabelText('Create new')).toBeInTheDocument();
    // Primary confirm button should show "Update"
    expect(screen.getByLabelText('Update')).toBeInTheDocument();
  });

  it('fires onCreatePartTool when secondary confirm (Create new) is clicked', async () => {
    const user = userEvent.setup();
    render(
      <PartToolDetailEditor
        partToolId="pt-1"
        item={mockItem}
        onClose={vi.fn()}
        allPartTools={mockCatalog}
        onCreatePartTool={callbacks.onCreatePartTool}
        onUpdatePartTool={callbacks.onUpdatePartTool}
      />,
    );

    await user.click(screen.getByTestId('editable-name'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Brand New Part');
    await user.click(screen.getByLabelText('Create new'));

    expect(callbacks.onCreatePartTool).toHaveBeenCalledWith('pt-1', 'Brand New Part');
    expect(callbacks.onUpdatePartTool).not.toHaveBeenCalled();
  });

  it('does not show dual-confirm for non-autocomplete fields (unit)', async () => {
    const user = userEvent.setup();
    render(
      <PartToolDetailEditor
        partToolId="pt-1"
        item={mockItem}
        onClose={vi.fn()}
        onCreatePartTool={callbacks.onCreatePartTool}
        onUpdatePartTool={callbacks.onUpdatePartTool}
      />,
    );

    await user.click(screen.getByTestId('editable-unit'));
    // Only the default "Confirm" button should be present, no "Create new"
    expect(screen.queryByLabelText('Create new')).not.toBeInTheDocument();
  });

  it('does not show dual-confirm when onCreatePartTool is not provided', async () => {
    const user = userEvent.setup();
    render(
      <PartToolDetailEditor
        partToolId="pt-1"
        item={mockItem}
        onClose={vi.fn()}
        allPartTools={mockCatalog}
        onUpdatePartTool={callbacks.onUpdatePartTool}
      />,
    );

    await user.click(screen.getByTestId('editable-name'));
    expect(screen.queryByLabelText('Create new')).not.toBeInTheDocument();
  });

  it('does not show dual-confirm for a blank/new partTool (empty name)', async () => {
    const user = userEvent.setup();
    const blankItem: AggregatedPartTool = {
      ...mockItem,
      partTool: { ...mockItem.partTool, name: '' },
    };
    render(
      <PartToolDetailEditor
        partToolId="pt-1"
        item={blankItem}
        onClose={vi.fn()}
        allPartTools={mockCatalog}
        onCreatePartTool={callbacks.onCreatePartTool}
        onUpdatePartTool={callbacks.onUpdatePartTool}
      />,
    );

    await user.click(screen.getByTestId('editable-name'));
    expect(screen.queryByLabelText('Create new')).not.toBeInTheDocument();
  });
});

describe('PartToolDetailEditor — close', () => {
  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <PartToolDetailEditor
        partToolId="pt-1"
        item={mockItem}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose on Escape key when not editing a field', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <PartToolDetailEditor
        partToolId="pt-1"
        item={mockItem}
        onClose={onClose}
      />,
    );

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
