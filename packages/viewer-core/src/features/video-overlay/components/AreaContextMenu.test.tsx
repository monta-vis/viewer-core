import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AreaContextMenu } from './AreaContextMenu';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback,
  }),
}));

afterEach(() => { cleanup(); });

describe('AreaContextMenu', () => {
  const defaultProps = {
    position: { x: 100, y: 200 },
    onSetAsCoverImage: vi.fn(),
    onClose: vi.fn(),
  };

  it('renders with correct position', () => {
    const { container } = render(<AreaContextMenu {...defaultProps} />);
    const menu = container.querySelector('[role="menu"]') as HTMLElement;
    expect(menu).not.toBeNull();
    expect(menu.style.left).toBe('100px');
    expect(menu.style.top).toBe('200px');
  });

  it('renders "Set as Instruction Image" menu item', () => {
    render(<AreaContextMenu {...defaultProps} />);
    expect(screen.getByText('Set as Instruction Image')).not.toBeNull();
  });

  it('calls onSetAsCoverImage and onClose when menu item is clicked', () => {
    const onSetAsCoverImage = vi.fn();
    const onClose = vi.fn();
    render(
      <AreaContextMenu
        position={{ x: 0, y: 0 }}
        onSetAsCoverImage={onSetAsCoverImage}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByText('Set as Instruction Image'));
    expect(onSetAsCoverImage).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(
      <AreaContextMenu
        position={{ x: 0, y: 0 }}
        onSetAsCoverImage={vi.fn()}
        onClose={onClose}
      />,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when clicking outside the menu', () => {
    const onClose = vi.fn();
    render(
      <AreaContextMenu
        position={{ x: 0, y: 0 }}
        onSetAsCoverImage={vi.fn()}
        onClose={onClose}
      />,
    );

    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
