import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { Spinner } from './Spinner';

afterEach(() => { cleanup(); });

describe('Spinner', () => {
  it('renders with status role', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has default aria-label of Loading', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading');
  });

  it('uses custom label when provided', () => {
    render(<Spinner label="Saving..." />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Saving...');
  });

  it('includes screen reader text', () => {
    render(<Spinner label="Loading data" />);
    expect(screen.getByText('Loading data')).toHaveClass('sr-only');
  });

  it('renders with xs size', () => {
    const { container } = render(<Spinner size="xs" />);
    const spinnerElement = container.querySelector('[role="status"] > div');
    expect(spinnerElement).toHaveStyle({ width: '0.875rem', height: '0.875rem' });
  });

  it('renders with sm size', () => {
    const { container } = render(<Spinner size="sm" />);
    const spinnerElement = container.querySelector('[role="status"] > div');
    expect(spinnerElement).toHaveStyle({ width: '1.25rem', height: '1.25rem' });
  });

  it('renders with md size (default)', () => {
    const { container } = render(<Spinner size="md" />);
    const spinnerElement = container.querySelector('[role="status"] > div');
    expect(spinnerElement).toHaveStyle({ width: '1.5rem', height: '1.5rem' });
  });

  it('renders with lg size', () => {
    const { container } = render(<Spinner size="lg" />);
    const spinnerElement = container.querySelector('[role="status"] > div');
    expect(spinnerElement).toHaveStyle({ width: '2rem', height: '2rem' });
  });

  it('renders with xl size', () => {
    const { container } = render(<Spinner size="xl" />);
    const spinnerElement = container.querySelector('[role="status"] > div');
    expect(spinnerElement).toHaveStyle({ width: '2.5rem', height: '2.5rem' });
  });

  it('applies light variant styling', () => {
    const { container } = render(<Spinner light />);
    const spinnerElement = container.querySelector('[role="status"] > div');
    expect(spinnerElement).toHaveClass('border-white/20');
    expect(spinnerElement).toHaveClass('border-t-white');
  });

  it('applies default (dark) styling', () => {
    const { container } = render(<Spinner light={false} />);
    const spinnerElement = container.querySelector('[role="status"] > div');
    expect(spinnerElement).not.toHaveClass('border-white/20');
    expect(spinnerElement).not.toHaveClass('border-t-white');
  });

  it('applies custom className', () => {
    render(<Spinner className="custom-spinner" />);
    expect(screen.getByRole('status')).toHaveClass('custom-spinner');
  });

  it('passes through additional HTML attributes', () => {
    render(<Spinner data-testid="my-spinner" />);
    expect(screen.getByTestId('my-spinner')).toBeInTheDocument();
  });

  it('has animation style', () => {
    const { container } = render(<Spinner />);
    const spinnerElement = container.querySelector('[role="status"] > div');
    expect(spinnerElement).toHaveStyle({ animation: 'montavis-spin 0.75s linear infinite' });
  });
});
