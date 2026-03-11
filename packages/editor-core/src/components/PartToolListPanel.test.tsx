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

// Mock viewer-core — provide SearchInput + fuzzySearch for CatalogGrid
vi.mock('@monta-vis/viewer-core', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@monta-vis/viewer-core');
  return {
    ...actual,
    SearchInput: ({ value, onChange, placeholder, 'aria-label': ariaLabel }: { value: string; onChange: (v: string) => void; placeholder?: string; 'aria-label'?: string }) => (
      <input type="text" value={value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)} placeholder={placeholder} aria-label={ariaLabel} />
    ),
    fuzzySearch: (items: PartToolIconItem[], query: string, getTerms: (item: PartToolIconItem) => string[]) => {
      const q = query.toLowerCase();
      return items
        .filter((item: PartToolIconItem) => getTerms(item).some((term: string) => term.toLowerCase().includes(q)))
        .map((item: PartToolIconItem) => ({ item, score: 1 }));
    },
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
    expect(screen.queryByTestId('dialog-shell-backdrop')).not.toBeInTheDocument();
  });

  it('renders table with sorted rows (Parts first, then Tools, alpha)', () => {
    const partTools: Record<string, PartToolRow> = {
      t1: makePt('t1', 'Wrench', 'Tool'),
      p2: makePt('p2', 'Screw', 'Part'),
      p1: makePt('p1', 'Nut', 'Part'),
    };
    renderPanel({ partTools });
    const rows = screen.getAllByTestId(/^parttool-list-row-/);
    // Rows include type/name/delete etc. so filter to just the row <tr> elements
    const rowTrs = rows.filter((el) => el.tagName === 'TR');
    expect(rowTrs).toHaveLength(3);
    // Parts first alphabetically, then tools
    expect(rowTrs[0]).toHaveAttribute('data-testid', 'parttool-list-row-p1');
    expect(rowTrs[1]).toHaveAttribute('data-testid', 'parttool-list-row-p2');
    expect(rowTrs[2]).toHaveAttribute('data-testid', 'parttool-list-row-t1');
  });

  it('type toggle calls onUpdatePartTool with toggled type', async () => {
    const user = userEvent.setup();
    const cbs = makeCallbacks();
    const partTools = { t1: makePt('t1', 'Wrench', 'Tool') };
    renderPanel({ partTools, callbacks: cbs });

    const toggle = screen.getByTestId('parttool-list-row-type-t1');
    await user.click(toggle);
    expect(cbs.onUpdatePartTool).toHaveBeenCalledWith('t1', { type: 'Part' });
  });

  it('inline edit fields commit on blur', async () => {
    const user = userEvent.setup();
    const cbs = makeCallbacks();
    const partTools = { p1: makePt('p1', 'Nut', 'Part') };
    renderPanel({ partTools, callbacks: cbs });

    const nameInput = screen.getByTestId('parttool-list-row-name-p1');
    await user.clear(nameInput);
    await user.type(nameInput, 'Nut');
    await user.tab();
    expect(cbs.onUpdatePartTool).toHaveBeenCalledWith('p1', { name: 'Nut' });
  });

  it('add button calls onAddPartTool', async () => {
    const user = userEvent.setup();
    const cbs = makeCallbacks();
    renderPanel({ callbacks: cbs });

    const addBtn = screen.getByTestId('parttool-list-add');
    await user.click(addBtn);
    expect(cbs.onAddPartTool).toHaveBeenCalledOnce();
  });

  it('delete button calls onDeletePartTool', async () => {
    const user = userEvent.setup();
    const cbs = makeCallbacks();
    const partTools = { p1: makePt('p1', 'Nut', 'Part') };
    renderPanel({ partTools, callbacks: cbs });

    const deleteBtn = screen.getByTestId('parttool-list-row-delete-p1');
    await user.click(deleteBtn);
    expect(cbs.onDeletePartTool).toHaveBeenCalledWith('p1');
  });

  it('Used column shows computed amount', () => {
    const partTools = { p1: makePt('p1', 'Nut', 'Part', 5) };
    const substepPartTools = {
      spt1: { id: 'spt1', versionId: 'v1', substepId: 's1', partToolId: 'p1', amount: 2, order: 0 },
      spt2: { id: 'spt2', versionId: 'v1', substepId: 's2', partToolId: 'p1', amount: 3, order: 0 },
    };
    renderPanel({ partTools, substepPartTools });
    expect(screen.getByTestId('parttool-list-row-used-p1')).toHaveTextContent('5');
  });

  it('mismatch row has red styling when used !== declared', () => {
    const partTools = { p1: makePt('p1', 'Nut', 'Part', 5) };
    const substepPartTools = {
      spt1: { id: 'spt1', versionId: 'v1', substepId: 's1', partToolId: 'p1', amount: 2, order: 0 },
    };
    renderPanel({ partTools, substepPartTools });
    const usedCell = screen.getByTestId('parttool-list-row-used-p1');
    expect(usedCell.className).toContain('text-red');
  });

  it('import button shown only when callback provided', () => {
    renderPanel({ callbacks: { ...makeCallbacks(), onImportPartTools: vi.fn() } });
    expect(screen.getByTestId('parttool-list-import')).toBeInTheDocument();
  });

  it('import button hidden when callback not provided', () => {
    renderPanel();
    expect(screen.queryByTestId('parttool-list-import')).not.toBeInTheDocument();
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

    const backdrop = screen.getByTestId('dialog-shell-backdrop');
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows ImagePlus button when onUploadImage provided and no preview', () => {
    const cbs = { ...makeCallbacks(), onUploadImage: vi.fn() };
    const partTools = { p1: makePt('p1', 'Nut', 'Part') };
    renderPanel({
      partTools,
      callbacks: cbs,
      getPreviewUrl: () => null,
    });
    expect(screen.getByTestId('parttool-list-row-upload-p1')).toBeInTheDocument();
  });

  it('shows thumbnail when getPreviewUrl returns a URL', () => {
    const partTools = { p1: makePt('p1', 'Nut', 'Part') };
    renderPanel({
      partTools,
      getPreviewUrl: () => 'http://example.com/img.jpg',
    });
    expect(screen.getByTestId('parttool-list-row-thumbnail-p1')).toBeInTheDocument();
    expect(screen.getByTestId('parttool-list-row-thumbnail-p1')).toHaveAttribute('src', 'http://example.com/img.jpg');
  });

  it('shows delete overlay on thumbnail when onDeleteImage provided', () => {
    const cbs = { ...makeCallbacks(), onUploadImage: vi.fn(), onDeleteImage: vi.fn() };
    const partTools = { p1: makePt('p1', 'Nut', 'Part') };
    renderPanel({
      partTools,
      callbacks: cbs,
      getPreviewUrl: () => 'http://example.com/img.jpg',
    });
    expect(screen.getByTestId('parttool-list-row-delete-image-p1')).toBeInTheDocument();
  });
});

// ============================================================
// Tab layout (catalog integration)
// ============================================================

const catalogItems: PartToolIconItem[] = [
  { id: 'cat1/bolt.png', filename: 'bolt.png', category: 'Fasteners', label: 'Bolt M6', tags: ['DIN 931'], itemType: 'Part', catalogDirName: 'cat1' },
  { id: 'cat1/wrench.png', filename: 'wrench.png', category: 'Tools', label: 'Wrench', tags: [], itemType: 'Tool', catalogDirName: 'cat1' },
];

describe('PartToolListPanel — tabs', () => {
  it('does not show tabs when catalogItems is absent', () => {
    renderPanel();
    expect(screen.queryByTestId('parttool-list-tab-instruction')).not.toBeInTheDocument();
    expect(screen.queryByTestId('parttool-list-tab-add')).not.toBeInTheDocument();
  });

  it('shows tabs when catalogItems is provided', () => {
    renderPanel({ catalogItems, getCatalogIconUrl: () => '/icon.png' });
    expect(screen.getByTestId('parttool-list-tab-instruction')).toBeInTheDocument();
    expect(screen.getByTestId('parttool-list-tab-add')).toBeInTheDocument();
  });

  it('instruction tab shows PartToolTable by default', () => {
    const partTools = { p1: makePt('p1', 'Nut', 'Part') };
    renderPanel({ partTools, catalogItems, getCatalogIconUrl: () => '/icon.png' });
    // Table row should be visible
    expect(screen.getByTestId('parttool-list-row-p1')).toBeInTheDocument();
  });

  it('add tab shows catalog grid and form', async () => {
    const user = userEvent.setup();
    renderPanel({ catalogItems, getCatalogIconUrl: () => '/icon.png' });

    await user.click(screen.getByTestId('parttool-list-tab-add'));

    // Form and grid should be visible
    expect(screen.getByTestId('add-form-name')).toBeInTheDocument();
    expect(screen.getByTestId('add-form-submit')).toBeInTheDocument();
  });

  it('selecting catalog entry fills form and submitting calls onAddPartTool', async () => {
    const user = userEvent.setup();
    const cbs = makeCallbacks();
    renderPanel({
      catalogItems,
      getCatalogIconUrl: () => '/icon.png',
      callbacks: cbs,
    });

    // Switch to Add tab
    await user.click(screen.getByTestId('parttool-list-tab-add'));

    // Click catalog icon
    await user.click(screen.getByRole('button', { name: 'Bolt M6' }));

    // Form should now have the name filled — submit should be enabled
    const submitBtn = screen.getByTestId('add-form-submit');
    expect(submitBtn).not.toBeDisabled();

    await user.click(submitBtn);
    expect(cbs.onAddPartTool).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Bolt M6', type: 'Part', iconId: 'cat1/bolt.png' }),
    );
  });
});
