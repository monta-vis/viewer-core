import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { PartToolSearchBar } from './PartToolSearchBar';
import type { PartToolRow } from '@/features/instruction';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

afterEach(cleanup);

function makePart(overrides: Partial<PartToolRow> = {}): PartToolRow {
  return {
    id: 'pt-1', versionId: 'v1', instructionId: 'i1', previewImageId: null,
    name: 'M6 Bolt', position: 'Steel', type: 'Part', partNumber: 'BLT-001',
    amount: 4, description: null, unit: null, material: null, dimension: null, iconId: null,
    ...overrides,
  };
}

const partTools: PartToolRow[] = [
  makePart({ id: 'pt-1', name: 'M6 Bolt', position: 'Steel', partNumber: 'BLT-001', type: 'Part' }),
  makePart({ id: 'pt-2', name: 'Screwdriver', position: null, partNumber: null, type: 'Tool' }),
  makePart({ id: 'pt-3', name: 'Washer', position: 'Zinc', partNumber: 'WSH-002', type: 'Part' }),
];

describe('PartToolSearchBar', () => {
  it('renders search input with placeholder', () => {
    render(
      <PartToolSearchBar
        partTools={partTools}
        selectedPartTool={null}
        onSelect={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByPlaceholderText('Search parts & tools...')).toBeInTheDocument();
  });

  it('shows all items when focusing the input with empty query', () => {
    render(
      <PartToolSearchBar
        partTools={partTools}
        selectedPartTool={null}
        onSelect={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    fireEvent.focus(screen.getByPlaceholderText('Search parts & tools...'));
    expect(screen.getByText('M6 Bolt')).toBeInTheDocument();
    expect(screen.getByText('Screwdriver')).toBeInTheDocument();
    expect(screen.getByText('Washer')).toBeInTheDocument();
  });

  it('shows ALL items on focus even when count exceeds MAX_RESULTS (6)', () => {
    const manyPartTools = Array.from({ length: 10 }, (_, i) =>
      makePart({ id: `pt-${i}`, name: `Part ${i}` }),
    );
    render(
      <PartToolSearchBar
        partTools={manyPartTools}
        selectedPartTool={null}
        onSelect={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    fireEvent.focus(screen.getByPlaceholderText('Search parts & tools...'));
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(10);
  });

  it('shows fuzzy-matched results when typing', () => {
    render(
      <PartToolSearchBar
        partTools={partTools}
        selectedPartTool={null}
        onSelect={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText('Search parts & tools...'), {
      target: { value: 'bolt' },
    });
    expect(screen.getByText('M6 Bolt')).toBeInTheDocument();
    expect(screen.queryByText('Washer')).not.toBeInTheDocument();
  });

  it('calls onSelect when clicking a result', () => {
    const onSelect = vi.fn();
    render(
      <PartToolSearchBar
        partTools={partTools}
        selectedPartTool={null}
        onSelect={onSelect}
        onClear={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText('Search parts & tools...'), {
      target: { value: 'bolt' },
    });
    fireEvent.click(screen.getByText('M6 Bolt'));
    expect(onSelect).toHaveBeenCalledWith('pt-1');
  });

  it('shows chip with name and clear button when selectedPartTool is set', () => {
    render(
      <PartToolSearchBar
        partTools={partTools}
        selectedPartTool={partTools[0]}
        onSelect={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByText('M6 Bolt')).toBeInTheDocument();
    expect(screen.getByLabelText('Clear filter')).toBeInTheDocument();
  });

  it('calls onClear when clicking the clear button', () => {
    const onClear = vi.fn();
    render(
      <PartToolSearchBar
        partTools={partTools}
        selectedPartTool={partTools[0]}
        onSelect={vi.fn()}
        onClear={onClear}
      />,
    );
    fireEvent.click(screen.getByLabelText('Clear filter'));
    expect(onClear).toHaveBeenCalled();
  });

  it('shows empty state when no results match', () => {
    render(
      <PartToolSearchBar
        partTools={partTools}
        selectedPartTool={null}
        onSelect={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText('Search parts & tools...'), {
      target: { value: 'xyznonexistent' },
    });
    expect(screen.getByText('No matching parts or tools')).toBeInTheDocument();
  });

  it('closes dropdown on Escape', () => {
    render(
      <PartToolSearchBar
        partTools={partTools}
        selectedPartTool={null}
        onSelect={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    const input = screen.getByPlaceholderText('Search parts & tools...');
    fireEvent.focus(input);
    expect(screen.getByText('M6 Bolt')).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByText('M6 Bolt')).not.toBeInTheDocument();
  });

  it('closes dropdown after selection', () => {
    render(
      <PartToolSearchBar
        partTools={partTools}
        selectedPartTool={null}
        onSelect={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText('Search parts & tools...'), {
      target: { value: 'bolt' },
    });
    fireEvent.click(screen.getByText('M6 Bolt'));
    // After selection, dropdown should close (input value cleared)
    expect(screen.queryByText('M6 Bolt')).not.toBeInTheDocument();
  });
});
