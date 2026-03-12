import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PartToolListPanel, type PartToolListPanelCallbacks, type PartToolListPanelProps } from './PartToolListPanel';
import type { PartToolIconItem } from './PartToolCatalogGrid';
import type { PartToolRow } from '@monta-vis/viewer-core';

// Mock react-image-crop
vi.mock('react-image-crop', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="react-crop">{children}</div>
  ),
}));
vi.mock('react-image-crop/dist/ReactCrop.css', () => ({}));

// Mock viewer-core — provide SearchInput + fuzzySearch for CatalogGrid + PartToolDetailContent
vi.mock('@monta-vis/viewer-core', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@monta-vis/viewer-core');
  return {
    ...actual,
    SearchInput: ({ value, onChange, placeholder, 'aria-label': ariaLabel }: { value: string; onChange: (v: string) => void; placeholder?: string; 'aria-label'?: string }) => (
      <input type="text" value={value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)} placeholder={placeholder} aria-label={ariaLabel} data-testid="search-input" />
    ),
    fuzzySearch: (items: PartToolIconItem[], query: string, getTerms: (item: PartToolIconItem) => string[]) => {
      const q = query.toLowerCase();
      return items
        .filter((item: PartToolIconItem) => getTerms(item).some((term: string) => term.toLowerCase().includes(q)))
        .map((item: PartToolIconItem) => ({ item, score: 1 }));
    },
    PartToolDetailContent: ({ item, actionSlot }: { item: { partTool: PartToolRow; totalAmount: number }; actionSlot?: React.ReactNode }) => (
      <div data-testid="parttool-detail-content">
        <span data-testid="parttool-detail-name">{item.partTool.name}</span>
        <span data-testid="parttool-detail-amount">{item.totalAmount}</span>
        {actionSlot && <div data-testid="parttool-detail-action-slot">{actionSlot}</div>}
      </div>
    ),
  };
});

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

const makePt = (id: string, name: string, type: 'Part' | 'Tool', amount = 1): PartToolRow => ({
  id, versionId: 'v1', instructionId: 'i1', previewImageId: null,
  name, label: null, type, partNumber: null, amount,
  description: null, unit: null, material: null, dimension: null, iconId: null,
});

const makeCallbacks = (): PartToolListPanelCallbacks => ({
  onAddPartTool: vi.fn(),
  onUpdatePartTool: vi.fn(),
  onDeletePartTool: vi.fn(),
});

function renderPanel(overrides: Partial<PartToolListPanelProps> = {}) {
  const defaults: PartToolListPanelProps = {
    open: true,
    onClose: vi.fn(),
    partTools: {},
    substepPartTools: {},
    callbacks: makeCallbacks(),
    ...overrides,
  };
  return render(<PartToolListPanel {...defaults} />);
}

describe('PartToolListPanel', () => {
  it('does not render when closed', () => {
    renderPanel({ open: false });
    expect(screen.queryByTestId('parttool-list-panel')).not.toBeInTheDocument();
  });

  it('renders search bar and compact table', () => {
    const partTools = { p1: makePt('p1', 'Nut', 'Part') };
    renderPanel({ partTools });
    expect(screen.getByTestId('parttool-list-panel')).toBeInTheDocument();
    expect(screen.getByTestId('parttool-list-search')).toBeInTheDocument();
    expect(screen.getByTestId('parttool-table')).toBeInTheDocument();
  });

  it('renders table with sorted rows (Parts first, then Tools, alpha)', () => {
    const partTools: Record<string, PartToolRow> = {
      t1: makePt('t1', 'Wrench', 'Tool'),
      p2: makePt('p2', 'Screw', 'Part'),
      p1: makePt('p1', 'Nut', 'Part'),
    };
    renderPanel({ partTools });
    const rows = screen.getAllByTestId(/^parttool-list-row-/);
    const rowTrs = rows.filter((el) => el.tagName === 'TR');
    expect(rowTrs).toHaveLength(3);
    expect(rowTrs[0]).toHaveAttribute('data-testid', 'parttool-list-row-p1');
    expect(rowTrs[1]).toHaveAttribute('data-testid', 'parttool-list-row-p2');
    expect(rowTrs[2]).toHaveAttribute('data-testid', 'parttool-list-row-t1');
  });

  it('clicking row shows detail in sidebar', async () => {
    const user = userEvent.setup();
    const partTools = { p1: makePt('p1', 'Nut', 'Part', 3) };
    renderPanel({ partTools });

    // No sidebar content initially
    expect(screen.queryByTestId('parttool-detail-content')).not.toBeInTheDocument();

    // Click a row
    const row = screen.getByTestId('parttool-list-row-p1');
    await user.click(row);

    // Sidebar shows detail
    expect(screen.getByTestId('parttool-detail-content')).toBeInTheDocument();
    expect(screen.getByTestId('parttool-detail-name')).toHaveTextContent('Nut');
  });

  it('sidebar shows empty state when no item selected', () => {
    const partTools = { p1: makePt('p1', 'Nut', 'Part') };
    renderPanel({ partTools });
    expect(screen.getByTestId('parttool-list-sidebar-empty')).toBeInTheDocument();
  });

  it('"Edit" button in sidebar opens PartToolDetailEditor', async () => {
    const user = userEvent.setup();
    const partTools = { p1: makePt('p1', 'Nut', 'Part', 2) };
    renderPanel({ partTools });

    // Select a row
    await user.click(screen.getByTestId('parttool-list-row-p1'));

    // Click Edit button in sidebar
    const editBtn = screen.getByTestId('parttool-list-edit-btn');
    await user.click(editBtn);

    // PartToolDetailEditor wrapper should be open
    expect(screen.getByTestId('parttool-list-edit-dialog')).toBeInTheDocument();
  });

  it('"Delete" button calls onDeletePartTool', async () => {
    const user = userEvent.setup();
    const cbs = makeCallbacks();
    const partTools = { p1: makePt('p1', 'Nut', 'Part') };
    renderPanel({ partTools, callbacks: cbs });

    await user.click(screen.getByTestId('parttool-list-row-p1'));
    await user.click(screen.getByTestId('parttool-list-delete-btn'));

    expect(cbs.onDeletePartTool).toHaveBeenCalledWith('p1');
  });

  it('"+" button opens add popover', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByTestId('parttool-list-add'));
    expect(screen.getByTestId('parttool-add-popover')).toBeInTheDocument();
  });

  it('search filters table rows', async () => {
    const user = userEvent.setup();
    const partTools = {
      p1: makePt('p1', 'Nut', 'Part'),
      p2: makePt('p2', 'Screw', 'Part'),
      t1: makePt('t1', 'Wrench', 'Tool'),
    };
    renderPanel({ partTools });

    const searchInput = screen.getByTestId('parttool-list-search');
    await user.type(searchInput, 'nut');

    // Only matching row visible
    const rowTrs = screen.getAllByTestId(/^parttool-list-row-/).filter((el) => el.tagName === 'TR');
    expect(rowTrs).toHaveLength(1);
    expect(rowTrs[0]).toHaveAttribute('data-testid', 'parttool-list-row-p1');
  });

  it('escape closes panel', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderPanel({ onClose });

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('backdrop click closes panel', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderPanel({ onClose });

    const backdrop = screen.getByTestId('parttool-list-backdrop');
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('import button shown only when callback provided', () => {
    renderPanel({ callbacks: { ...makeCallbacks(), onImportPartTools: vi.fn() } });
    expect(screen.getByTestId('parttool-list-import')).toBeInTheDocument();
  });

  it('import button hidden when callback not provided', () => {
    renderPanel();
    expect(screen.queryByTestId('parttool-list-import')).not.toBeInTheDocument();
  });

  it('row selection is highlighted', async () => {
    const user = userEvent.setup();
    const partTools = {
      p1: makePt('p1', 'Nut', 'Part'),
      t1: makePt('t1', 'Wrench', 'Tool'),
    };
    renderPanel({ partTools });

    await user.click(screen.getByTestId('parttool-list-row-p1'));
    const row = screen.getByTestId('parttool-list-row-p1');
    expect(row.className).toContain('bg-[var(--color-bg-selected)]');
  });

  it('selecting deleted item clears sidebar', async () => {
    const user = userEvent.setup();
    const partTools = { p1: makePt('p1', 'Nut', 'Part') };
    const { rerender } = render(
      <PartToolListPanel
        open
        onClose={vi.fn()}
        partTools={partTools}
        substepPartTools={{}}
        callbacks={makeCallbacks()}
      />,
    );

    // Select the item
    await user.click(screen.getByTestId('parttool-list-row-p1'));
    expect(screen.getByTestId('parttool-detail-content')).toBeInTheDocument();

    // Re-render without the item (simulating deletion)
    rerender(
      <PartToolListPanel
        open
        onClose={vi.fn()}
        partTools={{}}
        substepPartTools={{}}
        callbacks={makeCallbacks()}
      />,
    );

    // Sidebar should show empty state
    expect(screen.queryByTestId('parttool-detail-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('parttool-list-sidebar-empty')).toBeInTheDocument();
  });
});

// ============================================================
// Catalog integration via PartToolAddPopover
// ============================================================

const catalogItems: PartToolIconItem[] = [
  { id: 'cat1/bolt.png', filename: 'bolt.png', category: 'Fasteners', label: 'Bolt M6', tags: ['DIN 931'], itemType: 'Part', catalogDirName: 'cat1' },
  { id: 'cat1/wrench.png', filename: 'wrench.png', category: 'Tools', label: 'Wrench', tags: [], itemType: 'Tool', catalogDirName: 'cat1' },
];

describe('PartToolListPanel — add popover integration', () => {
  it('"+" opens add popover with catalog tabs when catalogItems provided', async () => {
    const user = userEvent.setup();
    renderPanel({ catalogItems, getCatalogIconUrl: () => '/icon.png' });

    await user.click(screen.getByTestId('parttool-list-add'));
    expect(screen.getByTestId('parttool-add-popover')).toBeInTheDocument();
    expect(screen.getByTestId('parttool-add-tab-manual')).toBeInTheDocument();
    expect(screen.getByTestId('parttool-add-tab-catalog')).toBeInTheDocument();
  });

  it('adding from manual form calls onAddPartTool', async () => {
    const user = userEvent.setup();
    const cbs = makeCallbacks();
    renderPanel({ callbacks: cbs });

    await user.click(screen.getByTestId('parttool-list-add'));
    await user.type(screen.getByTestId('parttool-add-manual-name'), 'NewBolt');
    await user.click(screen.getByTestId('parttool-add-manual-submit'));

    expect(cbs.onAddPartTool).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'NewBolt' }),
    );
  });
});
