import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditInput, EditTextarea } from './EditInput';

afterEach(cleanup);

describe('EditInput', () => {
  it('renders an input element', () => {
    render(<EditInput data-testid="edit-input" />);
    expect(screen.getByTestId('edit-input')).toBeInTheDocument();
    expect(screen.getByTestId('edit-input').tagName).toBe('INPUT');
  });

  it('applies md size classes by default', () => {
    render(<EditInput data-testid="edit-input" />);
    const el = screen.getByTestId('edit-input');
    expect(el.className).toContain('rounded-lg');
    expect(el.className).toContain('text-sm');
  });

  it('applies sm size classes when size="sm"', () => {
    render(<EditInput data-testid="edit-input" size="sm" />);
    const el = screen.getByTestId('edit-input');
    expect(el.className).toContain('bg-transparent');
    expect(el.className).toContain('border-b');
  });

  it('applies error styling when error=true', () => {
    render(<EditInput data-testid="edit-input" error />);
    const el = screen.getByTestId('edit-input');
    expect(el.className).toContain('border-red-500');
  });

  it('passes native input props through', async () => {
    const onChange = vi.fn();
    render(<EditInput data-testid="edit-input" placeholder="Type here" onChange={onChange} />);
    const el = screen.getByPlaceholderText('Type here');
    expect(el).toBeInTheDocument();
    const user = userEvent.setup();
    await user.type(el, 'a');
    expect(onChange).toHaveBeenCalled();
  });

  it('merges custom className', () => {
    render(<EditInput data-testid="edit-input" className="custom-class" />);
    const el = screen.getByTestId('edit-input');
    expect(el.className).toContain('custom-class');
  });
});

describe('EditTextarea', () => {
  it('renders a textarea element', () => {
    render(<EditTextarea data-testid="edit-ta" />);
    expect(screen.getByTestId('edit-ta').tagName).toBe('TEXTAREA');
  });

  it('applies md size classes by default', () => {
    render(<EditTextarea data-testid="edit-ta" />);
    const el = screen.getByTestId('edit-ta');
    expect(el.className).toContain('rounded-lg');
    expect(el.className).toContain('text-sm');
  });

  it('passes native textarea props through', () => {
    render(<EditTextarea data-testid="edit-ta" rows={5} placeholder="Notes" />);
    const el = screen.getByPlaceholderText('Notes');
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute('rows', '5');
  });
});
