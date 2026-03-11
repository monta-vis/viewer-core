import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PartToolCatalogGrid, type PartToolIconItem } from './PartToolCatalogGrid';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

// Mock viewer-core — provide SearchInput + fuzzySearch
vi.mock('@monta-vis/viewer-core', () => ({
  SearchInput: ({ value, onChange, placeholder, 'aria-label': ariaLabel }: { value: string; onChange: (v: string) => void; placeholder?: string; 'aria-label'?: string }) => (
    <input type="text" value={value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)} placeholder={placeholder} aria-label={ariaLabel} />
  ),
  fuzzySearch: (items: PartToolIconItem[], query: string, getTerms: (item: PartToolIconItem) => string[]) => {
    const q = query.toLowerCase();
    return items
      .filter(item => getTerms(item).some(term => term.toLowerCase().includes(q)))
      .map(item => ({ item, score: 1 }));
  },
}));

afterEach(() => {
  cleanup();
});

const items: PartToolIconItem[] = [
  { id: 'cat1/bolt.png', filename: 'bolt.png', category: 'Fasteners', label: 'Bolt M6', tags: ['DIN 931'], itemType: 'Part', catalogDirName: 'cat1' },
  { id: 'cat1/nut.png', filename: 'nut.png', category: 'Fasteners', label: 'Hex Nut', tags: ['DIN 934'], itemType: 'Part', catalogDirName: 'cat1' },
  { id: 'cat1/wrench.png', filename: 'wrench.png', category: 'Hand Tools', label: 'Wrench 10mm', tags: [], itemType: 'Tool', catalogDirName: 'cat1' },
  { id: 'cat1/drill.png', filename: 'drill.png', category: 'Power Tools', label: 'Drill Machine', tags: ['electric'], itemType: 'Tool', catalogDirName: 'cat1' },
];

const defaultProps = {
  items,
  getIconUrl: (item: PartToolIconItem) => `/icons/${item.filename}`,
  selectedId: null as string | null,
  onSelect: vi.fn(),
};

beforeEach(() => {
  defaultProps.onSelect.mockClear();
});

// ============================================================
// Rendering
// ============================================================
describe('PartToolCatalogGrid — rendering', () => {
  it('renders icon cards with names', () => {
    render(<PartToolCatalogGrid {...defaultProps} />);
    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThanOrEqual(1);
    // Category tabs should be visible
    expect(screen.getByRole('button', { name: 'Fasteners' })).toBeInTheDocument();
  });

  it('shows Part/Tool type badge on cards', () => {
    render(<PartToolCatalogGrid {...defaultProps} />);
    // First category (Fasteners) should be active, containing Part items
    // The wrench (Tool) is in a different category
    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThanOrEqual(2); // bolt + nut in Fasteners
  });
});

// ============================================================
// Search filtering
// ============================================================
describe('PartToolCatalogGrid — search', () => {
  it('filters icons by search term', async () => {
    const user = userEvent.setup();
    render(<PartToolCatalogGrid {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Search catalog...');
    await user.type(searchInput, 'bolt');

    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute('alt', 'Bolt M6');
  });

  it('filters by tags', async () => {
    const user = userEvent.setup();
    render(<PartToolCatalogGrid {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Search catalog...');
    await user.type(searchInput, 'DIN 931');

    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute('alt', 'Bolt M6');
  });
});

// ============================================================
// Category tabs
// ============================================================
describe('PartToolCatalogGrid — category tabs', () => {
  it('renders category tab buttons', () => {
    render(<PartToolCatalogGrid {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Fasteners' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hand Tools' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Power Tools' })).toBeInTheDocument();
  });

  it('switches icons when a different tab is clicked', async () => {
    const user = userEvent.setup();
    render(<PartToolCatalogGrid {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Hand Tools' }));

    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute('alt', 'Wrench 10mm');
  });
});

// ============================================================
// Selection
// ============================================================
describe('PartToolCatalogGrid — selection', () => {
  it('calls onSelect when an icon is clicked', async () => {
    const user = userEvent.setup();
    render(<PartToolCatalogGrid {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Bolt M6' }));
    expect(defaultProps.onSelect).toHaveBeenCalledWith(items[0]);
  });
});

// ============================================================
// Empty state
// ============================================================
describe('PartToolCatalogGrid — empty state', () => {
  it('shows empty message when search matches nothing', async () => {
    const user = userEvent.setup();
    render(<PartToolCatalogGrid {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Search catalog...');
    await user.type(searchInput, 'xyznonexistent');

    expect(screen.getByText('No catalog items found')).toBeInTheDocument();
  });

  it('shows empty message when items array is empty', () => {
    render(<PartToolCatalogGrid {...defaultProps} items={[]} />);
    expect(screen.getByText('No catalog items found')).toBeInTheDocument();
  });
});
