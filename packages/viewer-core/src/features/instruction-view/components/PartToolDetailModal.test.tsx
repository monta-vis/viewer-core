import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PartToolDetailModal } from './PartToolDetailModal';
import type { AggregatedPartTool } from '../hooks/useFilteredPartsTools';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback,
  }),
}));

afterEach(() => {
  cleanup();
  document.body.style.overflow = '';
});

const mockPartTool: AggregatedPartTool = {
  partTool: {
    id: 'pt-1',
    versionId: 'v1',
    instructionId: 'i1',
    previewImageId: null,
    name: 'Steel Bolt',
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
  usedInSteps: [1, 3],
  amountsPerSubstep: new Map(),
};

const mockPartToolMinimal: AggregatedPartTool = {
  partTool: {
    id: 'pt-2',
    versionId: 'v1',
    instructionId: 'i1',
    previewImageId: null,
    name: 'Wrench',
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
  usedInSteps: [2],
  amountsPerSubstep: new Map(),
};

const mockCatalog = [
  { id: 'pt-10', label: 'Hex Bolt', sublabel: 'HEX-001' },
  { id: 'pt-11', label: 'Cap Screw', sublabel: 'CAP-002' },
];

const editCallbacks = {
  onReplacePartTool: vi.fn(),
  onCreatePartTool: vi.fn(),
  onEditPartToolAmount: vi.fn(),
  onEditPartToolImage: vi.fn(),
  onDeletePartTool: vi.fn(),
};

beforeEach(() => {
  Object.values(editCallbacks).forEach((fn) => fn.mockClear());
});

// ============================================================
// editMode=false — no edit controls
// ============================================================
describe('PartToolDetailModal — editMode=false (default)', () => {
  it('renders no edit controls when editMode is not provided', () => {
    render(<PartToolDetailModal item={mockPartTool} onClose={vi.fn()} />);

    expect(screen.queryByLabelText('Edit')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Delete part/tool')).not.toBeInTheDocument();
    // Text fields should not have role="button"
    const nameEl = screen.getByText('Steel Bolt');
    expect(nameEl.closest('[role="button"]')).toBeNull();
  });

  it('renders no edit controls when editMode=false', () => {
    render(<PartToolDetailModal item={mockPartTool} onClose={vi.fn()} editMode={false} />);

    expect(screen.queryByLabelText('Edit')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Delete part/tool')).not.toBeInTheDocument();
  });
});

// ============================================================
// editMode=true — new behavior
// ============================================================
describe('PartToolDetailModal — editMode=true', () => {
  it('shows image edit button on image area', () => {
    render(
      <PartToolDetailModal
        item={mockPartTool}
        onClose={vi.fn()}
        editMode
        editCallbacks={editCallbacks}
      />
    );

    expect(screen.getByLabelText('Edit')).toBeInTheDocument();
  });

  it('fires onEditPartToolImage when image edit button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <PartToolDetailModal
        item={mockPartTool}
        onClose={vi.fn()}
        editMode
        editCallbacks={editCallbacks}
      />
    );

    await user.click(screen.getByLabelText('Edit'));
    expect(editCallbacks.onEditPartToolImage).toHaveBeenCalledWith('pt-1');
  });

  it('opens TextInputModal with suggestions when name is tapped', async () => {
    const user = userEvent.setup();
    render(
      <PartToolDetailModal
        item={mockPartTool}
        onClose={vi.fn()}
        editMode
        editCallbacks={editCallbacks}
        partToolCatalog={mockCatalog}
      />
    );

    await user.click(screen.getByTestId('editable-name'));

    // TextInputModal should be visible with empty input (ready to search)
    expect(screen.getByRole('textbox')).toHaveValue('');
    // Suggestion list should be present with all catalog items
    expect(screen.getByTestId('suggestion-list')).toBeInTheDocument();
    expect(screen.getByText('Hex Bolt')).toBeInTheDocument();
    expect(screen.getByText('Cap Screw')).toBeInTheDocument();
  });

  it('fires onReplacePartTool when a suggestion is selected from name edit', async () => {
    const user = userEvent.setup();
    render(
      <PartToolDetailModal
        item={mockPartTool}
        onClose={vi.fn()}
        editMode
        editCallbacks={editCallbacks}
        partToolCatalog={mockCatalog}
      />
    );

    await user.click(screen.getByTestId('editable-name'));
    await user.click(screen.getByText('Hex Bolt'));

    expect(editCallbacks.onReplacePartTool).toHaveBeenCalledWith('pt-1', 'pt-10');
  });

  it('fires onCreatePartTool when typing new name and pressing Enter', async () => {
    const user = userEvent.setup();
    render(
      <PartToolDetailModal
        item={mockPartTool}
        onClose={vi.fn()}
        editMode
        editCallbacks={editCallbacks}
        partToolCatalog={mockCatalog}
      />
    );

    await user.click(screen.getByTestId('editable-name'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Brand New Part{Enter}');

    expect(editCallbacks.onCreatePartTool).toHaveBeenCalledWith('pt-1', 'Brand New Part');
  });

  it('opens TextInputModal when amount badge is tapped (number, no suggestions)', async () => {
    const user = userEvent.setup();
    render(
      <PartToolDetailModal
        item={mockPartTool}
        onClose={vi.fn()}
        editMode
        editCallbacks={editCallbacks}
        partToolCatalog={mockCatalog}
      />
    );

    await user.click(screen.getByTestId('editable-amount'));

    // Amount uses number input
    expect(screen.getByRole('spinbutton')).toHaveValue(8);
    // No suggestion list for amount
    expect(screen.queryByTestId('suggestion-list')).not.toBeInTheDocument();
  });

  it('fires onEditPartToolAmount for amount', async () => {
    const user = userEvent.setup();
    render(
      <PartToolDetailModal
        item={mockPartTool}
        onClose={vi.fn()}
        editMode
        editCallbacks={editCallbacks}
      />
    );

    await user.click(screen.getByTestId('editable-amount'));
    const input = screen.getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '12{Enter}');

    expect(editCallbacks.onEditPartToolAmount).toHaveBeenCalledWith('pt-1', '12');
  });

  it('fires onDeletePartTool when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <PartToolDetailModal
        item={mockPartTool}
        onClose={vi.fn()}
        editMode
        editCallbacks={editCallbacks}
      />
    );

    await user.click(screen.getByLabelText('Delete part/tool'));
    expect(editCallbacks.onDeletePartTool).toHaveBeenCalledWith('pt-1');
  });
});

// ============================================================
// editMode=true — read-only fields (unit, material, dimension, description)
// ============================================================
describe('PartToolDetailModal — editMode=true, read-only fields', () => {
  it('unit/material/dimension are NOT tappable in edit mode', () => {
    render(
      <PartToolDetailModal
        item={mockPartTool}
        onClose={vi.fn()}
        editMode
        editCallbacks={editCallbacks}
      />
    );

    // These should be rendered as plain text, not as buttons
    const unitEl = screen.getByText('pcs');
    expect(unitEl.closest('[role="button"]')).toBeNull();

    const materialEl = screen.getByText('Stainless Steel');
    expect(materialEl.closest('[role="button"]')).toBeNull();

    const dimensionEl = screen.getByText('M8x40');
    expect(dimensionEl.closest('[role="button"]')).toBeNull();
  });

  it('description is NOT tappable in edit mode', () => {
    render(
      <PartToolDetailModal
        item={mockPartTool}
        onClose={vi.fn()}
        editMode
        editCallbacks={editCallbacks}
      />
    );

    const descEl = screen.getByText('High-strength bolt');
    expect(descEl.closest('[role="button"]')).toBeNull();
  });

  it('does NOT show "+ Add ..." placeholders for empty fields in edit mode', () => {
    render(
      <PartToolDetailModal
        item={mockPartToolMinimal}
        onClose={vi.fn()}
        editMode
        editCallbacks={editCallbacks}
      />
    );

    expect(screen.queryByText('+ Add description')).not.toBeInTheDocument();
    expect(screen.queryByText('+ Add material')).not.toBeInTheDocument();
    expect(screen.queryByText('+ Add unit')).not.toBeInTheDocument();
    expect(screen.queryByText('+ Add dimension')).not.toBeInTheDocument();
    expect(screen.queryByText('+ Add part number')).not.toBeInTheDocument();
  });
});
