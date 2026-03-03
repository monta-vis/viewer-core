import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { PartToolCard, PartsDrawer } from './PartsDrawer';
import type { AggregatedPartTool } from '../hooks/useFilteredPartsTools';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

// Mock resolvePartToolImageUrl
vi.mock('../utils/resolvePartToolImageUrl', () => ({
  resolvePartToolImageUrl: () => null,
}));

// Mock resolveRawFrameCapture
vi.mock('../utils/resolveRawFrameCapture', () => ({
  resolvePartToolFrameCapture: () => null,
}));

// Mock VideoFrameCapture
vi.mock('./VideoFrameCapture', () => ({
  VideoFrameCapture: () => null,
}));

// Mock Drawer to always render children (bypass animation/portal)
vi.mock('@/components/ui', () => ({
  Drawer: ({ children }: { children: React.ReactNode }) => <div data-testid="drawer">{children}</div>,
  TutorialClickIcon: () => null,
  IconButton: (props: Record<string, unknown>) => <button {...props} />,
}));

// Track props passed to PartToolDetailModal
const detailModalItemSpy = vi.fn();
vi.mock('./PartToolDetailModal', () => ({
  PartToolDetailModal: (props: { item: AggregatedPartTool | null }) => {
    detailModalItemSpy(props.item);
    if (!props.item) return null;
    return <div data-testid="detail-modal">{props.item.partTool.name}</div>;
  },
}));

// Mock context
vi.mock('../context', () => ({
  useViewerData: () => ({
    steps: {},
    substeps: {},
    partTools: {},
    videos: {},
    videoFrameAreas: {},
    partToolVideoFrameAreas: {},
  }),
}));

// Mock part for useFilteredPartsTools
const mockPart: AggregatedPartTool = {
  partTool: {
    id: 'pt-1', versionId: 'v1', instructionId: 'i1', previewImageId: null,
    name: 'Steel Bolt', label: null, type: 'Part', partNumber: 'BLT-001',
    amount: 4, description: null, unit: null, material: null, dimension: null, iconId: null,
  },
  totalAmount: 4,
  amountsPerSubstep: new Map(),
};

vi.mock('../hooks/useFilteredPartsTools', () => ({
  useFilteredPartsTools: () => ({ parts: [mockPart], tools: [] }),
}));

// Mock useClickOutside (no-op)
vi.mock('@/hooks', () => ({
  useClickOutside: () => {},
}));

afterEach(() => {
  cleanup();
});

function makeItem(overrides: Partial<AggregatedPartTool['partTool']> = {}): AggregatedPartTool {
  return {
    partTool: {
      id: 'pt-1',
      versionId: 'v1',
      instructionId: 'i1',
      previewImageId: null,
      name: 'Steel Bolt',
      label: null,
      type: 'Part',
      partNumber: 'BLT-001',
      amount: 4,
      description: null,
      unit: null,
      material: null,
      dimension: null,
      iconId: null,
      ...overrides,
    },
    totalAmount: 4,
    amountsPerSubstep: new Map(),
  };
}

describe('PartToolCard', () => {
  it('renders material when present', () => {
    render(
      <PartToolCard
        item={makeItem({ material: 'Stainless Steel' })}
        size="large"
        onClick={() => {}}
      />,
    );
    expect(screen.getByText('Stainless Steel')).toBeInTheDocument();
  });

  it('renders dimension when present', () => {
    render(
      <PartToolCard
        item={makeItem({ dimension: 'M8x40' })}
        size="large"
        onClick={() => {}}
      />,
    );
    expect(screen.getByText('M8x40')).toBeInTheDocument();
  });

  it('does NOT render material/dimension section when both are null', () => {
    render(
      <PartToolCard
        item={makeItem({ material: null, dimension: null })}
        size="large"
        onClick={() => {}}
      />,
    );
    expect(screen.queryByText('Stainless Steel')).not.toBeInTheDocument();
    expect(screen.queryByText('M8x40')).not.toBeInTheDocument();
  });

  it('shows edit pencil icon when editMode and onEditClick are provided', () => {
    const onEdit = vi.fn();
    render(
      <PartToolCard
        item={makeItem()}
        size="large"
        onClick={() => {}}
        editMode
        onEditClick={onEdit}
      />,
    );
    expect(screen.getByTestId('edit-parttool-pt-1')).toBeInTheDocument();
  });

  it('does NOT show edit icon when editMode is false', () => {
    render(
      <PartToolCard
        item={makeItem()}
        size="large"
        onClick={() => {}}
        editMode={false}
      />,
    );
    expect(screen.queryByTestId('edit-parttool-pt-1')).not.toBeInTheDocument();
  });

  it('fires onEditClick when pencil is clicked (not onClick)', () => {
    const onClick = vi.fn();
    const onEdit = vi.fn();
    render(
      <PartToolCard
        item={makeItem()}
        size="large"
        onClick={onClick}
        editMode
        onEditClick={onEdit}
      />,
    );
    fireEvent.click(screen.getByTestId('edit-parttool-pt-1'));
    expect(onEdit).toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('PartsDrawer', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    currentStepNumber: 1,
    totalSteps: 3,
  };

  beforeEach(() => {
    detailModalItemSpy.mockClear();
  });

  it('clears detail modal when drawer closes and reopens', () => {
    // 1. Render with drawer open
    const { rerender } = render(<PartsDrawer {...defaultProps} isOpen={true} />);

    // 2. Click a part card to open detail modal
    const partCard = screen.getByText('Steel Bolt').closest('button')!;
    fireEvent.click(partCard);

    // Detail modal should be visible
    expect(screen.getByTestId('detail-modal')).toBeInTheDocument();

    // 3. Close the drawer
    rerender(<PartsDrawer {...defaultProps} isOpen={false} />);

    // Detail modal should be gone (selectedItem cleared)
    expect(screen.queryByTestId('detail-modal')).not.toBeInTheDocument();

    // 4. Reopen the drawer — detail should still be gone
    rerender(<PartsDrawer {...defaultProps} isOpen={true} />);
    expect(screen.queryByTestId('detail-modal')).not.toBeInTheDocument();
  });

  it('renders editor via renderPartToolEditor when edit icon is clicked', () => {
    const renderEditor = vi.fn(({ item, onClose }: { item: AggregatedPartTool; onClose: () => void }) => (
      <div data-testid="part-editor">{item.partTool.name} <button onClick={onClose}>close</button></div>
    ));

    render(
      <PartsDrawer
        {...defaultProps}
        editMode
        renderPartToolEditor={renderEditor}
      />,
    );

    // Click the edit pencil on the card
    fireEvent.click(screen.getByTestId('edit-parttool-pt-1'));

    // Editor should be rendered
    expect(screen.getByTestId('part-editor')).toBeInTheDocument();
    expect(renderEditor).toHaveBeenCalledWith(
      expect.objectContaining({ item: mockPart }),
    );
  });
});
