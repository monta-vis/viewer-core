import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sun } from 'lucide-react';
import { OptionButton } from './OptionButton';

afterEach(cleanup);

describe('OptionButton', () => {
  it('renders children text', () => {
    render(
      <OptionButton active={false} onClick={vi.fn()}>
        Light
      </OptionButton>,
    );
    expect(screen.getByRole('button', { name: /Light/i })).toBeInTheDocument();
  });

  it('applies active styling when active=true', () => {
    render(
      <OptionButton active onClick={vi.fn()}>
        Active
      </OptionButton>,
    );
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('border-[var(--color-secondary)]');
  });

  it('applies inactive styling when active=false', () => {
    render(
      <OptionButton active={false} onClick={vi.fn()}>
        Inactive
      </OptionButton>,
    );
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('border-[var(--color-border-base)]');
  });

  it('shows Check icon when showCheck=true and active=true', () => {
    render(
      <OptionButton active showCheck onClick={vi.fn()}>
        Checked
      </OptionButton>,
    );
    // Check icon has a specific class
    const svg = screen.getByRole('button').querySelector('svg:last-child');
    expect(svg).toBeInTheDocument();
  });

  it('does not show Check icon when showCheck=true and active=false', () => {
    const { container } = render(
      <OptionButton active={false} showCheck onClick={vi.fn()}>
        Unchecked
      </OptionButton>,
    );
    // Only the children span should be present, no trailing Check svg
    const svgs = container.querySelectorAll('svg');
    expect(svgs).toHaveLength(0);
  });

  it('fires onClick when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(
      <OptionButton active={false} onClick={handleClick}>
        Click me
      </OptionButton>,
    );
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders optional icon', () => {
    render(
      <OptionButton
        active={false}
        onClick={vi.fn()}
        icon={<Sun data-testid="custom-icon" />}
      >
        With Icon
      </OptionButton>,
    );
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <OptionButton active={false} onClick={vi.fn()} className="my-custom">
        Custom
      </OptionButton>,
    );
    expect(screen.getByRole('button').className).toContain('my-custom');
  });
});
