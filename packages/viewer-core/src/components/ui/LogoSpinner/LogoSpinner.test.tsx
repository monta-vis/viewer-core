import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { LogoSpinner } from './LogoSpinner';

afterEach(() => { cleanup(); });

describe('LogoSpinner', () => {
  it('renders without crashing', () => {
    render(<LogoSpinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has role="status" for accessibility', () => {
    render(<LogoSpinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has default aria-label of Loading', () => {
    render(<LogoSpinner />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading');
  });

  it('uses custom label when provided', () => {
    render(<LogoSpinner label="Processing..." />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Processing...');
  });

  it('includes screen reader text', () => {
    render(<LogoSpinner label="Loading data" />);
    expect(screen.getByText('Loading data')).toHaveClass('sr-only');
  });

  it('applies correct size for xs', () => {
    const { container } = render(<LogoSpinner size="xs" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveStyle({ width: '0.875rem', height: '0.875rem' });
  });

  it('applies correct size for sm', () => {
    const { container } = render(<LogoSpinner size="sm" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveStyle({ width: '1.25rem', height: '1.25rem' });
  });

  it('applies correct size for md (default)', () => {
    const { container } = render(<LogoSpinner />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveStyle({ width: '1.5rem', height: '1.5rem' });
  });

  it('applies correct size for lg', () => {
    const { container } = render(<LogoSpinner size="lg" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveStyle({ width: '2rem', height: '2rem' });
  });

  it('applies correct size for xl', () => {
    const { container } = render(<LogoSpinner size="xl" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveStyle({ width: '2.5rem', height: '2.5rem' });
  });

  it('accepts and applies custom className', () => {
    render(<LogoSpinner className="custom-class" />);
    expect(screen.getByRole('status')).toHaveClass('custom-class');
  });

  it('has spin animation on the SVG', () => {
    const { container } = render(<LogoSpinner />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveStyle({ animation: 'montavis-spin 1.2s linear infinite' });
  });
});
