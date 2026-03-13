import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
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
    position: null,
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

const mockPartToolMinimal: AggregatedPartTool = {
  partTool: {
    id: 'pt-2',
    versionId: 'v1',
    instructionId: 'i1',
    previewImageId: null,
    name: 'Wrench',
    position: null,
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

describe('PartToolDetailModal — read-only', () => {
  it('renders part details correctly', () => {
    render(<PartToolDetailModal item={mockPartTool} onClose={vi.fn()} />);

    expect(screen.getByText('Steel Bolt')).toBeInTheDocument();
    expect(screen.getByText('BLT-001')).toBeInTheDocument();
    expect(screen.getByText('High-strength bolt')).toBeInTheDocument();
    expect(screen.getByText('pcs')).toBeInTheDocument();
    expect(screen.getByText('Stainless Steel')).toBeInTheDocument();
    expect(screen.getByText('M8x40')).toBeInTheDocument();
    expect(screen.getByText('8×')).toBeInTheDocument();
  });

  it('renders no edit controls', () => {
    render(<PartToolDetailModal item={mockPartTool} onClose={vi.fn()} />);

    expect(screen.queryByLabelText('Edit')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Delete part/tool')).not.toBeInTheDocument();
    // Text fields should not have role="button"
    const nameEl = screen.getByText('Steel Bolt');
    expect(nameEl.closest('[role="button"]')).toBeNull();
  });

  it('hides empty optional fields for minimal item', () => {
    render(<PartToolDetailModal item={mockPartToolMinimal} onClose={vi.fn()} />);

    expect(screen.getByText('Wrench')).toBeInTheDocument();
    // No placeholders shown (read-only mode)
    expect(screen.queryByText('Add label')).not.toBeInTheDocument();
    expect(screen.queryByText('Add part number')).not.toBeInTheDocument();
  });

  it('returns null when item is null', () => {
    const { container } = render(<PartToolDetailModal item={null} onClose={vi.fn()} />);
    // Only the backdrop and modal divs should not be present
    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });
});
