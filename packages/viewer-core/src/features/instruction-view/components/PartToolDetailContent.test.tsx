import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PartToolDetailContent } from './PartToolDetailContent';
import type { AggregatedPartTool } from '../hooks/useFilteredPartsTools';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { language: 'en' },
  }),
}));

afterEach(cleanup);

const mockPart: AggregatedPartTool = {
  partTool: {
    id: 'pt-1',
    versionId: 'v1',
    instructionId: 'i1',
    previewImageId: null,
    name: 'Steel Bolt',
    position: 'Label-A',
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

  // --- Image Thumbnail Sidebar ---

  it('no toggle badge when imageUrls is undefined', () => {
    render(<PartToolDetailContent item={mockPart} />);
    expect(screen.queryByTestId('parttool-image-toggle')).not.toBeInTheDocument();
  });

  it('no toggle badge when imageUrls has 1 entry', () => {
    render(<PartToolDetailContent item={mockPart} imageUrls={['url1']} />);
    expect(screen.queryByTestId('parttool-image-toggle')).not.toBeInTheDocument();
  });

  it('toggle badge with count when imageUrls has 2+ entries', () => {
    render(<PartToolDetailContent item={mockPart} imageUrls={['url1', 'url2', 'url3']} />);
    const badge = screen.getByTestId('parttool-image-toggle');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('3');
  });

  it('strip initially hidden (collapsed)', () => {
    render(<PartToolDetailContent item={mockPart} imageUrls={['url1', 'url2']} />);
    const strip = screen.getByTestId('parttool-image-strip');
    expect(strip.className).toContain('-translate-x-full');
  });

  it('clicking toggle expands strip', async () => {
    const user = userEvent.setup();
    render(<PartToolDetailContent item={mockPart} imageUrls={['url1', 'url2']} />);

    await user.click(screen.getByTestId('parttool-image-toggle'));

    const strip = screen.getByTestId('parttool-image-strip');
    expect(strip.className).not.toContain('-translate-x-full');
  });

  it('clicking toggle again collapses strip', async () => {
    const user = userEvent.setup();
    render(<PartToolDetailContent item={mockPart} imageUrls={['url1', 'url2']} />);

    const toggle = screen.getByTestId('parttool-image-toggle');
    await user.click(toggle);
    await user.click(toggle);

    const strip = screen.getByTestId('parttool-image-strip');
    expect(strip.className).toContain('-translate-x-full');
  });

  it('all thumbnails rendered in expanded strip', async () => {
    const user = userEvent.setup();
    render(<PartToolDetailContent item={mockPart} imageUrls={['url1', 'url2', 'url3']} />);

    await user.click(screen.getByTestId('parttool-image-toggle'));

    const thumbs = screen.getByTestId('parttool-image-strip').querySelectorAll('img');
    expect(thumbs).toHaveLength(3);
    expect(thumbs[0]).toHaveAttribute('src', 'url1');
    expect(thumbs[1]).toHaveAttribute('src', 'url2');
    expect(thumbs[2]).toHaveAttribute('src', 'url3');
  });

  it('clicking thumbnail changes hero image src', async () => {
    const user = userEvent.setup();
    render(<PartToolDetailContent item={mockPart} imageUrls={['url1', 'url2', 'url3']} />);

    // Hero initially shows first image
    const heroImg = screen.getByAltText('Steel Bolt') as HTMLImageElement;
    expect(heroImg.src).toContain('url1');

    // Expand and click second thumbnail
    await user.click(screen.getByTestId('parttool-image-toggle'));
    const thumbs = screen.getByTestId('parttool-image-strip').querySelectorAll('img');
    await user.click(thumbs[1]);

    expect(heroImg.src).toContain('url2');
  });

  it('active thumbnail has accent ring', async () => {
    const user = userEvent.setup();
    render(<PartToolDetailContent item={mockPart} imageUrls={['url1', 'url2']} />);

    await user.click(screen.getByTestId('parttool-image-toggle'));
    const thumbs = screen.getByTestId('parttool-image-strip').querySelectorAll('img');

    // First thumb (active) should have ring-2
    expect(thumbs[0].className).toContain('ring-2');
    // Second thumb should not
    expect(thumbs[1].className).not.toContain('ring-2');
  });

  it('works in compact mode (compactBadges sizing)', () => {
    render(<PartToolDetailContent item={mockPart} imageUrls={['url1', 'url2']} compactBadges />);
    const badge = screen.getByTestId('parttool-image-toggle');
    expect(badge).toBeInTheDocument();
    // compactBadges uses smaller positioning
    expect(badge.className).toContain('bottom-1.5');
  });

  it('resets selectedIndex and collapses strip when item changes', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <PartToolDetailContent item={mockPart} imageUrls={['url1', 'url2', 'url3']} />,
    );

    // Expand strip and select second thumbnail
    await user.click(screen.getByTestId('parttool-image-toggle'));
    const thumbs = screen.getByTestId('parttool-image-strip').querySelectorAll('img');
    await user.click(thumbs[1]);

    // Hero shows url2
    const heroImg = screen.getByAltText('Steel Bolt') as HTMLImageElement;
    expect(heroImg.src).toContain('url2');

    // Switch to a different item
    const otherItem: AggregatedPartTool = {
      partTool: { ...mockPart.partTool, id: 'pt-other', name: 'Other Part' },
      totalAmount: 2,
      amountsPerSubstep: new Map(),
    };
    rerender(
      <PartToolDetailContent item={otherItem} imageUrls={['urlA', 'urlB', 'urlC']} />,
    );

    // Hero should show first image (index reset to 0)
    const newHeroImg = screen.getByAltText('Other Part') as HTMLImageElement;
    expect(newHeroImg.src).toContain('urlA');

    // Strip should be collapsed
    const strip = screen.getByTestId('parttool-image-strip');
    expect(strip.className).toContain('-translate-x-full');
  });

  it('backward compatible: no imageUrls → existing behavior unchanged', () => {
    render(<PartToolDetailContent item={mockPart} previewImageUrl="hero.png" />);

    expect(screen.queryByTestId('parttool-image-toggle')).not.toBeInTheDocument();
    expect(screen.queryByTestId('parttool-image-strip')).not.toBeInTheDocument();

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'hero.png');
  });
});
