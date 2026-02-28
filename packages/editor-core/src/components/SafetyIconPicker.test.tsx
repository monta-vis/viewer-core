import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SafetyIconPicker, type SafetyIconItem } from './SafetyIconPicker';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

// Mock viewer-core safety icon utilities
vi.mock('@monta-vis/viewer-core', () => ({
  getCategoryPriority: (cat: string) => {
    const order: Record<string, number> = { Danger: 0, Warning: 1, Info: 2 };
    return order[cat] ?? 99;
  },
  getCategoryColor: () => '#888',
  SAFETY_ICON_CATEGORIES: {
    Danger: { label: 'Danger' },
    Warning: { label: 'Warning' },
    Info: { label: 'Info' },
  },
}));

afterEach(() => {
  cleanup();
});

const icons: SafetyIconItem[] = [
  { id: 'icon-1', filename: 'fire.png', category: 'Danger', label: 'Fire hazard' },
  { id: 'icon-2', filename: 'electric.png', category: 'Danger', label: 'Electric shock' },
  { id: 'icon-3', filename: 'caution.png', category: 'Warning', label: 'Caution wet floor' },
  { id: 'icon-4', filename: 'info-sign.png', category: 'Info', label: 'Information' },
];

const defaultProps = {
  icons,
  getIconUrl: (icon: SafetyIconItem) => `/icons/${icon.filename}`,
  selectedIconId: null as string | null,
  onSelect: vi.fn(),
};

beforeEach(() => {
  defaultProps.onSelect.mockClear();
});

// ============================================================
// Search filtering
// ============================================================
describe('SafetyIconPicker — search', () => {
  it('shows all icons of first category by default', () => {
    render(<SafetyIconPicker {...defaultProps} />);
    // Danger tab should be active (lowest priority), showing 2 icons
    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThanOrEqual(2);
  });

  it('filters icons by search term', async () => {
    const user = userEvent.setup();
    render(<SafetyIconPicker {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Search icons...');
    await user.type(searchInput, 'fire');

    // Only the fire icon should match
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute('alt', 'Fire hazard');
  });
});

// ============================================================
// Category tabs
// ============================================================
describe('SafetyIconPicker — category tabs', () => {
  it('renders category tab buttons', () => {
    render(<SafetyIconPicker {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Danger' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Warning' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Info' })).toBeInTheDocument();
  });

  it('switches icons when a different tab is clicked', async () => {
    const user = userEvent.setup();
    render(<SafetyIconPicker {...defaultProps} />);

    // Click Warning tab
    await user.click(screen.getByRole('button', { name: 'Warning' }));

    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute('alt', 'Caution wet floor');
  });
});

// ============================================================
// Selection
// ============================================================
describe('SafetyIconPicker — selection', () => {
  it('calls onSelect when an icon is clicked', async () => {
    const user = userEvent.setup();
    render(<SafetyIconPicker {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Fire hazard' }));
    expect(defaultProps.onSelect).toHaveBeenCalledWith(icons[0]);
  });
});

// ============================================================
// Empty state
// ============================================================
describe('SafetyIconPicker — empty state', () => {
  it('shows "No icons found" when search matches nothing', async () => {
    const user = userEvent.setup();
    render(<SafetyIconPicker {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Search icons...');
    await user.type(searchInput, 'xyznonexistent');

    expect(screen.getByText('No icons found')).toBeInTheDocument();
  });

  it('shows "No icons found" when icons array is empty', () => {
    render(<SafetyIconPicker {...defaultProps} icons={[]} />);
    expect(screen.getByText('No icons found')).toBeInTheDocument();
  });
});
