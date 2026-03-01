import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchInput } from './SearchInput';

afterEach(cleanup);

describe('SearchInput', () => {
  it('renders with placeholder', () => {
    render(<SearchInput value="" onChange={vi.fn()} placeholder="Search..." />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('displays current value', () => {
    render(<SearchInput value="hello" onChange={vi.fn()} />);
    expect(screen.getByRole('textbox')).toHaveValue('hello');
  });

  it('fires onChange when typing', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<SearchInput value="" onChange={handleChange} />);
    await user.type(screen.getByRole('textbox'), 'a');
    expect(handleChange).toHaveBeenCalledWith('a');
  });

  it('shows clear button when value is non-empty', () => {
    render(<SearchInput value="test" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
  });

  it('does not show clear button when value is empty', () => {
    render(<SearchInput value="" onChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
  });

  it('clears value on clear button click', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<SearchInput value="test" onChange={handleChange} />);
    await user.click(screen.getByRole('button', { name: /clear/i }));
    expect(handleChange).toHaveBeenCalledWith('');
  });

  it('has aria-label', () => {
    render(<SearchInput value="" onChange={vi.fn()} aria-label="Search items" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-label', 'Search items');
  });

  it('applies custom className', () => {
    const { container } = render(
      <SearchInput value="" onChange={vi.fn()} className="my-custom" />,
    );
    expect(container.firstElementChild?.className).toContain('my-custom');
  });

  it('hides clear button when showClear=false', () => {
    render(<SearchInput value="test" onChange={vi.fn()} showClear={false} />);
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
  });
});
