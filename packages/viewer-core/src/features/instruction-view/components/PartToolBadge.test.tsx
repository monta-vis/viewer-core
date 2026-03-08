import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { PartToolBadge } from './PartToolBadge';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string, opts?: Record<string, unknown>) => {
      if (opts?.count !== undefined) return `${opts.count} ${fallback?.replace('{{count}} ', '') ?? key}`;
      return fallback ?? key;
    },
  }),
}));

afterEach(() => cleanup());

describe('PartToolBadge', () => {
  it('renders nothing when both counts are 0', () => {
    const { container } = render(
      <PartToolBadge partCount={0} toolCount={0} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows part icon and count when partCount > 0', () => {
    render(
      <PartToolBadge partCount={3} toolCount={0} onClick={() => {}} />,
    );
    expect(screen.getByText('×3')).toBeTruthy();
    expect(screen.queryByText('×0')).toBeNull();
  });

  it('shows tool icon and count when toolCount > 0', () => {
    render(
      <PartToolBadge partCount={0} toolCount={5} onClick={() => {}} />,
    );
    expect(screen.getByText('×5')).toBeTruthy();
    expect(screen.queryByText('×0')).toBeNull();
  });

  it('shows both when both counts > 0', () => {
    render(
      <PartToolBadge partCount={2} toolCount={4} onClick={() => {}} />,
    );
    expect(screen.getByText('×2')).toBeTruthy();
    expect(screen.getByText('×4')).toBeTruthy();
  });

  it('shows chevron only when showChevron is true', () => {
    const { rerender } = render(
      <PartToolBadge partCount={1} toolCount={0} onClick={() => {}} />,
    );
    expect(screen.queryByTestId('part-tool-badge-chevron')).toBeNull();

    rerender(
      <PartToolBadge partCount={1} toolCount={0} showChevron onClick={() => {}} />,
    );
    expect(screen.getByTestId('part-tool-badge-chevron')).toBeTruthy();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(
      <PartToolBadge partCount={3} toolCount={2} onClick={handleClick} />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('has accessible aria-label with both counts', () => {
    render(
      <PartToolBadge partCount={3} toolCount={5} onClick={() => {}} />,
    );
    expect(screen.getByRole('button').getAttribute('aria-label')).toBe('3 Parts, 5 Tools');
  });

  it('has accessible aria-label with only parts', () => {
    render(
      <PartToolBadge partCount={3} toolCount={0} onClick={() => {}} />,
    );
    expect(screen.getByRole('button').getAttribute('aria-label')).toBe('3 Parts');
  });

  it('applies part-only background when only parts present', () => {
    render(
      <PartToolBadge partCount={2} toolCount={0} onClick={() => {}} />,
    );
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-[var(--color-element-part)]');
  });

  it('applies tool-only background when only tools present', () => {
    render(
      <PartToolBadge partCount={0} toolCount={3} onClick={() => {}} />,
    );
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-[var(--color-element-tool)]');
  });

  it('applies gradient background when both parts and tools present', () => {
    render(
      <PartToolBadge partCount={2} toolCount={3} onClick={() => {}} />,
    );
    const button = screen.getByRole('button');
    expect(button.style.background).toContain('linear-gradient');
  });
});
