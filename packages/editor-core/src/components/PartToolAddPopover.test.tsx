import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PartToolAddPopover } from './PartToolAddPopover';
import type { PartToolIconItem } from './PartToolCatalogGrid';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { language: 'en' },
  }),
}));

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

afterEach(cleanup);

const catalogItems: PartToolIconItem[] = [
  { id: 'cat1/bolt.png', filename: 'bolt.png', category: 'Fasteners', label: 'Bolt M6', tags: ['DIN 931'], itemType: 'Part', catalogDirName: 'cat1' },
  { id: 'cat1/wrench.png', filename: 'wrench.png', category: 'Tools', label: 'Wrench', tags: [], itemType: 'Tool', catalogDirName: 'cat1' },
];

describe('PartToolAddPopover', () => {
  it('does not render when open=false', () => {
    render(
      <PartToolAddPopover open={false} onClose={vi.fn()} onAdd={vi.fn()} />,
    );
    expect(screen.queryByTestId('parttool-add-popover')).not.toBeInTheDocument();
  });

  it('renders with Manual tab active by default', () => {
    render(
      <PartToolAddPopover open onClose={vi.fn()} onAdd={vi.fn()} catalogItems={catalogItems} getCatalogIconUrl={() => '/icon.png'} />,
    );
    expect(screen.getByTestId('parttool-add-popover')).toBeInTheDocument();
    expect(screen.getByTestId('parttool-add-tab-manual')).toBeInTheDocument();
    expect(screen.getByTestId('parttool-add-tab-catalog')).toBeInTheDocument();
  });

  it('manual tab shows form fields and Add button', () => {
    render(
      <PartToolAddPopover open onClose={vi.fn()} onAdd={vi.fn()} />,
    );
    expect(screen.getByTestId('parttool-add-manual-name')).toBeInTheDocument();
    expect(screen.getByTestId('parttool-add-manual-submit')).toBeInTheDocument();
  });

  it('submitting manual form calls onAdd with correct prefill', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(
      <PartToolAddPopover open onClose={vi.fn()} onAdd={onAdd} />,
    );

    await user.type(screen.getByTestId('parttool-add-manual-name'), 'NewBolt');
    await user.click(screen.getByTestId('parttool-add-manual-submit'));

    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'NewBolt' }),
    );
  });

  it('catalog tab shows when catalogItems provided', async () => {
    const user = userEvent.setup();
    render(
      <PartToolAddPopover open onClose={vi.fn()} onAdd={vi.fn()} catalogItems={catalogItems} getCatalogIconUrl={() => '/icon.png'} />,
    );

    await user.click(screen.getByTestId('parttool-add-tab-catalog'));
    // Catalog grid should be visible (the form appears via PartToolAddForm)
    expect(screen.getByTestId('add-form-submit')).toBeInTheDocument();
  });

  it('selecting catalog item and submitting calls onAdd with iconId', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(
      <PartToolAddPopover open onClose={vi.fn()} onAdd={onAdd} catalogItems={catalogItems} getCatalogIconUrl={() => '/icon.png'} />,
    );

    await user.click(screen.getByTestId('parttool-add-tab-catalog'));
    await user.click(screen.getByRole('button', { name: 'Bolt M6' }));
    await user.click(screen.getByTestId('add-form-submit'));

    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Bolt M6', iconId: 'cat1/bolt.png' }),
    );
  });

  it('escape closes popover', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <PartToolAddPopover open onClose={onClose} onAdd={vi.fn()} />,
    );

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not show catalog tab when catalogItems not provided', () => {
    render(
      <PartToolAddPopover open onClose={vi.fn()} onAdd={vi.fn()} />,
    );
    expect(screen.queryByTestId('parttool-add-tab-catalog')).not.toBeInTheDocument();
  });

  it('backdrop click closes popover', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <PartToolAddPopover open onClose={onClose} onAdd={vi.fn()} />,
    );

    const backdrop = screen.getByTestId('parttool-add-backdrop');
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
