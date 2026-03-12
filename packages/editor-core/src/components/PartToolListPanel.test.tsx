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
    PartToolDetailContent: ({ item }: { item: { partTool: { name: string } } }) => (
      <div data-testid="parttool-detail-content">{item.partTool.name}</div>
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

const makePt = (id: string, name: string, type: 'Part' | 'Tool', amount = 1, extras?: Partial<PartToolRow>): PartToolRow => ({
  id, versionId: 'v1', instructionId: 'i1', previewImageId: null,
  name, label: null, type, partNumber: null, amount,
  description: null, unit: null, material: null, dimension: null, iconId: null,
  ...extras,
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
    expect(screen.getByTestId('sidebar-form-name')).toHaveValue('Nut');

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

    // Sidebar form should be empty (add mode)
    expect(screen.getByTestId('sidebar-form-name')).toHaveValue('');
  });
});

// ============================================================
// Inline sidebar form integration
// ============================================================

describe('PartToolListPanel — inline sidebar form', () => {
  it('no selection → placeholder hero shown, detail card hidden, form shown', () => {
    renderPanel();
    expect(screen.queryByTestId('parttool-detail-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('sidebar-hero-placeholder')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-form')).toBeInTheDocument();
  });

  it('selection → detail card + form both shown', async () => {
    const user = userEvent.setup();
    const partTools = { p1: makePt('p1', 'Nut', 'Part') };
    renderPanel({ partTools });

    await user.click(screen.getByTestId('parttool-list-row-p1'));

    expect(screen.getByTestId('parttool-detail-content')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-form')).toBeInTheDocument();
  });

  it('deselect shows placeholder hero instead of detail card', async () => {
    const user = userEvent.setup();
    const partTools = { p1: makePt('p1', 'Nut', 'Part') };
    renderPanel({ partTools });

    await user.click(screen.getByTestId('parttool-list-row-p1'));
    expect(screen.getByTestId('parttool-detail-content')).toBeInTheDocument();
    expect(screen.queryByTestId('sidebar-hero-placeholder')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('sidebar-form-deselect-btn'));
    expect(screen.queryByTestId('parttool-detail-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('sidebar-hero-placeholder')).toBeInTheDocument();
  });

  it('placeholder hero shows when no item selected', () => {
    renderPanel();
    const placeholder = screen.getByTestId('sidebar-hero-placeholder');
    expect(placeholder).toBeInTheDocument();
  });

  it('empty state: no item selected → form fields empty, both buttons disabled', () => {
    renderPanel();
    expect(screen.getByTestId('sidebar-form-name')).toHaveValue('');
    expect(screen.getByTestId('sidebar-form-add-btn')).toBeDisabled();
    expect(screen.getByTestId('sidebar-form-update-btn')).toBeDisabled();
  });

  it('form populates on selection', async () => {
    const user = userEvent.setup();
    const partTools = {
      p1: makePt('p1', 'Nut', 'Part', 3, { label: 'N1', partNumber: 'PN-42' }),
    };
    renderPanel({ partTools });

    await user.click(screen.getByTestId('parttool-list-row-p1'));

    expect(screen.getByTestId('sidebar-form-name')).toHaveValue('Nut');
    expect(screen.getByTestId('sidebar-form-label')).toHaveValue('N1');
    expect(screen.getByTestId('sidebar-form-partNumber')).toHaveValue('PN-42');
    expect(screen.getByTestId('sidebar-form-amount')).toHaveValue(3);
  });

  it('Add enables when fields filled (no selection)', async () => {
    const user = userEvent.setup();
    renderPanel();

    expect(screen.getByTestId('sidebar-form-add-btn')).toBeDisabled();

    await user.type(screen.getByTestId('sidebar-form-name'), 'NewPart');

    expect(screen.getByTestId('sidebar-form-add-btn')).toBeEnabled();
    expect(screen.getByTestId('sidebar-form-update-btn')).toBeDisabled();
  });

  it('both disabled when item selected but unmodified', async () => {
    const user = userEvent.setup();
    const partTools = { p1: makePt('p1', 'Nut', 'Part', 2) };
    renderPanel({ partTools });

    await user.click(screen.getByTestId('parttool-list-row-p1'));

    expect(screen.getByTestId('sidebar-form-add-btn')).toBeDisabled();
    expect(screen.getByTestId('sidebar-form-update-btn')).toBeDisabled();
  });

  it('both enable on modification of selected item', async () => {
    const user = userEvent.setup();
    const partTools = { p1: makePt('p1', 'Nut', 'Part', 2) };
    renderPanel({ partTools });

    await user.click(screen.getByTestId('parttool-list-row-p1'));
    // Modify name
    const nameInput = screen.getByTestId('sidebar-form-name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Bolt');

    expect(screen.getByTestId('sidebar-form-add-btn')).toBeEnabled();
    expect(screen.getByTestId('sidebar-form-update-btn')).toBeEnabled();
  });

  it('Add creates new item from form data', async () => {
    const user = userEvent.setup();
    const cbs = makeCallbacks();
    renderPanel({ callbacks: cbs });

    await user.type(screen.getByTestId('sidebar-form-name'), 'NewPart');
    await user.click(screen.getByTestId('sidebar-form-add-btn'));

    expect(cbs.onAddPartTool).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'NewPart', type: 'Part', amount: 1 }),
    );
  });

  it('Add from modified selection creates new item', async () => {
    const user = userEvent.setup();
    const cbs = makeCallbacks();
    const partTools = { p1: makePt('p1', 'Nut', 'Part', 2) };
    renderPanel({ partTools, callbacks: cbs });

    await user.click(screen.getByTestId('parttool-list-row-p1'));
    const nameInput = screen.getByTestId('sidebar-form-name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Modified Nut');
    await user.click(screen.getByTestId('sidebar-form-add-btn'));

    expect(cbs.onAddPartTool).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Modified Nut', type: 'Part', amount: 2 }),
    );
  });

  it('Update saves to existing item', async () => {
    const user = userEvent.setup();
    const cbs = makeCallbacks();
    const partTools = { p1: makePt('p1', 'Nut', 'Part', 2) };
    renderPanel({ partTools, callbacks: cbs });

    await user.click(screen.getByTestId('parttool-list-row-p1'));
    const nameInput = screen.getByTestId('sidebar-form-name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Bolt');
    await user.click(screen.getByTestId('sidebar-form-update-btn'));

    expect(cbs.onUpdatePartTool).toHaveBeenCalledWith('p1', expect.objectContaining({ name: 'Bolt' }));
  });

  it('Delete calls onDeletePartTool', async () => {
    const user = userEvent.setup();
    const cbs = makeCallbacks();
    const partTools = { p1: makePt('p1', 'Nut', 'Part') };
    renderPanel({ partTools, callbacks: cbs });

    await user.click(screen.getByTestId('parttool-list-row-p1'));
    await user.click(screen.getByTestId('sidebar-form-delete-btn'));

    expect(cbs.onDeletePartTool).toHaveBeenCalledWith('p1');
  });

  it('selection change resets form to new item values', async () => {
    const user = userEvent.setup();
    const partTools = {
      p1: makePt('p1', 'Nut', 'Part', 1),
      p2: makePt('p2', 'Bolt', 'Part', 5),
    };
    renderPanel({ partTools });

    await user.click(screen.getByTestId('parttool-list-row-p1'));
    expect(screen.getByTestId('sidebar-form-name')).toHaveValue('Nut');

    await user.click(screen.getByTestId('parttool-list-row-p2'));
    expect(screen.getByTestId('sidebar-form-name')).toHaveValue('Bolt');
    expect(screen.getByTestId('sidebar-form-amount')).toHaveValue(5);
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
