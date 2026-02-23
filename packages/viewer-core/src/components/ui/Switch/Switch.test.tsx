import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Switch } from './Switch';

afterEach(cleanup);

describe('Switch', () => {
  it('renders unchecked state', () => {
    render(<Switch checked={false} onChange={() => {}} />);
    const switchEl = screen.getByRole('switch');
    expect(switchEl).toHaveAttribute('aria-checked', 'false');
  });

  it('renders checked state', () => {
    render(<Switch checked={true} onChange={() => {}} />);
    const switchEl = screen.getByRole('switch');
    expect(switchEl).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onChange when clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} />);

    await user.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('toggles on Enter key', () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} />);

    const switchEl = screen.getByRole('switch');
    fireEvent.keyDown(switchEl, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('toggles on Space key', () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} />);

    const switchEl = screen.getByRole('switch');
    fireEvent.keyDown(switchEl, { key: ' ' });
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('does not toggle on other keys', () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} />);

    const switchEl = screen.getByRole('switch');
    fireEvent.keyDown(switchEl, { key: 'Tab' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not call onChange when disabled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} disabled />);

    await user.click(screen.getByRole('switch'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not toggle on keypress when disabled', () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} disabled />);

    const switchEl = screen.getByRole('switch');
    fireEvent.keyDown(switchEl, { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('sets aria-label', () => {
    render(<Switch checked={false} onChange={() => {}} aria-label="Toggle feature" />);
    const switchEl = screen.getByRole('switch');
    expect(switchEl).toHaveAttribute('aria-label', 'Toggle feature');
  });

  it('renders with custom id', () => {
    render(<Switch checked={false} onChange={() => {}} id="custom-switch" />);
    const switchEl = screen.getByRole('switch');
    expect(switchEl).toHaveAttribute('id', 'custom-switch');
  });

  it('renders with sm size', () => {
    render(<Switch checked={false} onChange={() => {}} size="sm" />);
    const switchEl = screen.getByRole('switch');
    expect(switchEl).toHaveClass('w-8');
    expect(switchEl).toHaveClass('h-4');
  });

  it('renders with md size (default)', () => {
    render(<Switch checked={false} onChange={() => {}} size="md" />);
    const switchEl = screen.getByRole('switch');
    expect(switchEl).toHaveClass('w-10');
    expect(switchEl).toHaveClass('h-5');
  });

  it('has disabled attribute when disabled', () => {
    render(<Switch checked={false} onChange={() => {}} disabled />);
    const switchEl = screen.getByRole('switch');
    expect(switchEl).toBeDisabled();
  });
});
