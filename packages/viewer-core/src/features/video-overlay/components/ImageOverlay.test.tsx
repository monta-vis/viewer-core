import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ImageOverlay } from './ImageOverlay';

// Mock ResizeObserver
vi.stubGlobal('ResizeObserver', vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})));

describe('ImageOverlay', () => {
  const defaultProps = {
    imageSrc: 'test-image.jpg',
  };

  it('renders the image with correct src', () => {
    const { container } = render(<ImageOverlay {...defaultProps} />);
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'test-image.jpg');
  });

  it('renders with object-contain class', () => {
    const { container } = render(<ImageOverlay {...defaultProps} />);
    const img = container.querySelector('img');
    expect(img).toHaveClass('object-contain');
  });

  it('accepts className prop', () => {
    const { container } = render(<ImageOverlay {...defaultProps} className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders outer container with bg-black', () => {
    const { container } = render(<ImageOverlay {...defaultProps} />);
    expect(container.firstChild).toHaveClass('bg-black');
  });
});
