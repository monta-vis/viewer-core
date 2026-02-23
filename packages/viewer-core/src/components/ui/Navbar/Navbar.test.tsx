import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Navbar } from './Navbar';

describe('Navbar', () => {
  it('renders left/center/right slots', () => {
    const { getByTestId } = render(
      <Navbar
        left={<span data-testid="left">Left</span>}
        center={<span data-testid="center">Center</span>}
        right={<span data-testid="right">Right</span>}
      />
    );

    expect(getByTestId('left')).toBeInTheDocument();
    expect(getByTestId('center')).toBeInTheDocument();
    expect(getByTestId('right')).toBeInTheDocument();
  });

  it('renders with no slots (empty)', () => {
    const { container } = render(<Navbar />);
    expect(container.querySelector('header')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Navbar className="custom-nav" />);
    expect(container.querySelector('header')).toHaveClass('custom-nav');
  });

  it('has sticky positioning', () => {
    const { container } = render(<Navbar />);
    const header = container.querySelector('header');
    expect(header?.className).toContain('sticky');
    expect(header?.className).toContain('top-0');
  });

  it('renders as a header element', () => {
    const { container } = render(<Navbar />);
    expect(container.querySelector('header')).toBeTruthy();
  });
});
