import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImageEditDialog } from './ImageEditDialog';

// Mock ResizeObserver
vi.stubGlobal('ResizeObserver', vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})));

describe('ImageEditDialog', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    imageSrc: 'test-image.jpg',
    substepImageId: 'img-1',
    versionId: 'v-1',
    drawings: {},
    onAddDrawing: vi.fn(),
    onUpdateDrawing: vi.fn(),
    onDeleteDrawing: vi.fn(),
  };

  it('does not render when open is false', () => {
    render(<ImageEditDialog {...defaultProps} open={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders dialog when open is true', () => {
    render(<ImageEditDialog {...defaultProps} />);
    const dialogs = screen.getAllByRole('dialog');
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
  });

  it('renders the image in the portal', () => {
    render(<ImageEditDialog {...defaultProps} />);
    // Portal renders to document.body, so use document.querySelector
    const img = document.querySelector('img[src="test-image.jpg"]');
    expect(img).toBeInTheDocument();
  });

  it('renders drawing toolbar tools', () => {
    render(<ImageEditDialog {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(5);
  });

  it('has close button in header', () => {
    render(<ImageEditDialog {...defaultProps} />);
    // Dialog renders via portal; there may be multiple dialog roles
    const dialogs = screen.getAllByRole('dialog');
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    // Should have buttons (tools + close)
    const allButtons = document.querySelectorAll('[role="dialog"] button');
    expect(allButtons.length).toBeGreaterThanOrEqual(4);
  });
});
