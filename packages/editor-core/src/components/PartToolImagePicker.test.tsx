import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PartToolImagePicker, type PartToolImageItem } from './PartToolImagePicker';

afterEach(() => {
  cleanup();
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { language: 'en' },
  }),
}));

const makeImages = (count: number): PartToolImageItem[] =>
  Array.from({ length: count }, (_, i) => ({
    junctionId: `j-${i}`,
    areaId: `a-${i}`,
    url: `http://example.com/img-${i}.jpg`,
    isPreview: i === 0,
  }));

const defaultPosition = { left: 100, bottom: 604 };

describe('PartToolImagePicker', () => {
  it('renders thumbnail strip with all images', () => {
    const images = makeImages(3);
    render(
      <PartToolImagePicker
        open
        onClose={vi.fn()}
        position={defaultPosition}
        images={images}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
      />,
    );

    for (const img of images) {
      expect(screen.getByTestId(`picker-image-${img.junctionId}`)).toBeInTheDocument();
    }
  });

  it('shows large preview of the isPreview image', () => {
    const images = makeImages(2);
    render(
      <PartToolImagePicker
        open
        onClose={vi.fn()}
        position={defaultPosition}
        images={images}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
      />,
    );

    const preview = screen.getByTestId('picker-preview');
    expect(preview).toBeInTheDocument();
    expect(preview).toHaveAttribute('src', 'http://example.com/img-0.jpg');
  });

  it('selected thumbnail has border highlight', () => {
    const images = makeImages(2);
    render(
      <PartToolImagePicker
        open
        onClose={vi.fn()}
        position={defaultPosition}
        images={images}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
      />,
    );

    const selected = screen.getByTestId('picker-image-j-0');
    expect(selected.className).toContain('border-[var(--color-secondary)]');

    const notSelected = screen.getByTestId('picker-image-j-1');
    expect(notSelected.className).toContain('border-transparent');
  });

  it('click thumbnail calls onSelect(junctionId, areaId)', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const images = makeImages(2);
    render(
      <PartToolImagePicker
        open
        onClose={vi.fn()}
        position={defaultPosition}
        images={images}
        onSelect={onSelect}
        onAdd={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId('picker-image-j-1'));
    expect(onSelect).toHaveBeenCalledWith('j-1', 'a-1');
  });

  it('"+" button calls onAdd', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(
      <PartToolImagePicker
        open
        onClose={vi.fn()}
        position={defaultPosition}
        images={makeImages(1)}
        onSelect={vi.fn()}
        onAdd={onAdd}
      />,
    );

    await user.click(screen.getByTestId('picker-add-image'));
    expect(onAdd).toHaveBeenCalledOnce();
  });

  it('delete button calls onDelete on click', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const images = makeImages(2);
    render(
      <PartToolImagePicker
        open
        onClose={vi.fn()}
        position={defaultPosition}
        images={images}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
        onDelete={onDelete}
      />,
    );

    const deleteBtn = screen.getByTestId('picker-delete-j-0');
    await user.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith('j-0', 'a-0');
  });

  it('does not render delete buttons when onDelete not provided', () => {
    render(
      <PartToolImagePicker
        open
        onClose={vi.fn()}
        position={defaultPosition}
        images={makeImages(1)}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('picker-delete-j-0')).not.toBeInTheDocument();
  });

  it('shows add button when no images', () => {
    render(
      <PartToolImagePicker
        open
        onClose={vi.fn()}
        position={defaultPosition}
        images={[]}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
      />,
    );

    expect(screen.getByTestId('picker-add-image')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(
      <PartToolImagePicker
        open={false}
        onClose={vi.fn()}
        position={defaultPosition}
        images={makeImages(1)}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('picker-add-image')).not.toBeInTheDocument();
  });

  it('popover renders via portal in document.body with fixed positioning', () => {
    render(
      <PartToolImagePicker
        open
        onClose={vi.fn()}
        position={defaultPosition}
        images={makeImages(1)}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
      />,
    );

    const popover = screen.getByTestId('picker-popover');
    expect(popover.parentElement).toBe(document.body);
    expect(popover.style.position).toBe('fixed');
    expect(popover.style.left).toBe('100px');
    expect(popover.style.bottom).toBe('604px');
  });
});
