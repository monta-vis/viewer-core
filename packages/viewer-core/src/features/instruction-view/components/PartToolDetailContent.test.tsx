import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { PartToolDetailContent } from './PartToolDetailContent';
import type { AggregatedPartTool } from '../hooks/useFilteredPartsTools';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('../utils/resolvePartToolImageUrl', () => ({
  resolvePartToolImageUrl: () => null,
}));

afterEach(cleanup);

const mockPart: AggregatedPartTool = {
  partTool: {
    id: 'pt-1',
    versionId: 'v1',
    instructionId: 'i1',
    previewImageId: null,
    name: 'Steel Bolt',
    label: 'Label-A',
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

const mockToolMinimal: AggregatedPartTool = {
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

describe('PartToolDetailContent', () => {
  it('renders name, type badge, and amount', () => {
    render(<PartToolDetailContent item={mockPart} />);

    expect(screen.getByTestId('parttool-detail-name')).toHaveTextContent('Steel Bolt');
    expect(screen.getByTestId('parttool-detail-type-badge')).toHaveTextContent('Part');
    expect(screen.getByTestId('parttool-detail-amount')).toHaveTextContent('8×');
  });

  it('renders placeholder icon when no image (previewImageUrl is null)', () => {
    render(<PartToolDetailContent item={mockToolMinimal} />);

    expect(screen.getByTestId('parttool-detail-content')).toBeInTheDocument();
    // No img element should be rendered
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders image when previewImageUrl is provided', () => {
    render(
      <PartToolDetailContent
        item={mockPart}
        previewImageUrl="https://example.com/bolt.png"
      />,
    );

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/bolt.png');
    expect(img).toHaveAttribute('alt', 'Steel Bolt');
  });

  it('renders actionSlot content when provided', () => {
    render(
      <PartToolDetailContent
        item={mockPart}
        actionSlot={<button data-testid="custom-action">Edit</button>}
      />,
    );

    expect(screen.getByTestId('parttool-detail-action-slot')).toBeInTheDocument();
    expect(screen.getByTestId('custom-action')).toBeInTheDocument();
  });

  it('does not render actionSlot wrapper when no actionSlot provided', () => {
    render(<PartToolDetailContent item={mockPart} />);

    expect(screen.queryByTestId('parttool-detail-action-slot')).not.toBeInTheDocument();
  });

  it('compact mode renders only image section, no text fields', () => {
    render(<PartToolDetailContent item={mockPart} compact />);

    // Image hero section still present
    expect(screen.getByTestId('parttool-detail-type-badge')).toBeInTheDocument();
    expect(screen.getByTestId('parttool-detail-amount')).toHaveTextContent('8×');

    // Text content section should be hidden
    expect(screen.queryByTestId('parttool-detail-name')).not.toBeInTheDocument();
    expect(screen.queryByTestId('parttool-detail-action-slot')).not.toBeInTheDocument();
  });

  it('compact mode defaults to false (full content rendered)', () => {
    render(<PartToolDetailContent item={mockPart} />);

    expect(screen.getByTestId('parttool-detail-name')).toBeInTheDocument();
    expect(screen.getByTestId('parttool-detail-type-badge')).toBeInTheDocument();
  });
});
