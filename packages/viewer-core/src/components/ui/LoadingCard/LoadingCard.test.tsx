import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { LoadingCard } from './LoadingCard';

afterEach(() => { cleanup(); });

describe('LoadingCard', () => {
  it('renders the title text', () => {
    render(<LoadingCard title="My Project" />);
    expect(screen.getByText('My Project')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<LoadingCard title="My Project" subtitle="Loading instruction..." />);
    expect(screen.getByText('Loading instruction...')).toBeInTheDocument();
  });

  it('does not render subtitle when omitted', () => {
    render(<LoadingCard title="My Project" />);
    expect(screen.queryByText('Loading instruction...')).not.toBeInTheDocument();
  });

  it('contains a Spinner with role="status"', () => {
    render(<LoadingCard title="My Project" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('contains an indeterminate progress bar', () => {
    render(<LoadingCard title="My Project" />);
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toBeInTheDocument();
    expect(progressbar).not.toHaveAttribute('aria-valuenow');
  });

  it('applies custom className', () => {
    const { container } = render(<LoadingCard title="My Project" className="my-custom" />);
    expect(container.firstChild).toHaveClass('my-custom');
  });
});
