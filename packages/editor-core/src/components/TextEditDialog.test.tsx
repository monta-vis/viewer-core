import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextEditDialog } from './TextEditDialog';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

afterEach(() => {
  cleanup();
});

const defaultProps = {
  open: true,
  title: 'Edit Text',
  initialValue: 'Hello world',
  onSave: vi.fn(),
  onClose: vi.fn(),
};

beforeEach(() => {
  defaultProps.onSave.mockClear();
  defaultProps.onClose.mockClear();
});

// ============================================================
// Visibility
// ============================================================
describe('TextEditDialog — visibility', () => {
  it('renders nothing when open=false', () => {
    const { container } = render(<TextEditDialog {...defaultProps} open={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders dialog when open=true', () => {
    render(<TextEditDialog {...defaultProps} />);
    expect(screen.getByText('Edit Text')).toBeInTheDocument();
  });
});

// ============================================================
// Initial value
// ============================================================
describe('TextEditDialog — initial value', () => {
  it('pre-fills the textarea with initialValue', () => {
    render(<TextEditDialog {...defaultProps} />);
    const textarea = screen.getByPlaceholderText('Enter text...');
    expect(textarea).toHaveValue('Hello world');
  });
});

// ============================================================
// Save / Cancel
// ============================================================
describe('TextEditDialog — save/cancel', () => {
  it('calls onSave with trimmed text and onClose when Save clicked', async () => {
    const user = userEvent.setup();
    render(<TextEditDialog {...defaultProps} initialValue="  trimmed  " />);

    await user.click(screen.getByText('Save'));
    expect(defaultProps.onSave).toHaveBeenCalledWith('trimmed');
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onClose without onSave when Cancel clicked', async () => {
    const user = userEvent.setup();
    render(<TextEditDialog {...defaultProps} />);

    await user.click(screen.getByText('Cancel'));
    expect(defaultProps.onClose).toHaveBeenCalled();
    expect(defaultProps.onSave).not.toHaveBeenCalled();
  });

  it('calls onClose when backdrop clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(<TextEditDialog {...defaultProps} />);

    // Click the backdrop (outermost div)
    const backdrop = container.firstElementChild!;
    await user.click(backdrop);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});

// ============================================================
// Keyboard shortcuts
// ============================================================
describe('TextEditDialog — keyboard shortcuts', () => {
  it('calls onClose on Escape', async () => {
    const user = userEvent.setup();
    render(<TextEditDialog {...defaultProps} />);

    // Focus inside the dialog so keydown fires on the backdrop's handler
    const textarea = screen.getByPlaceholderText('Enter text...');
    await user.click(textarea);
    await user.keyboard('{Escape}');
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onSave on Ctrl+Enter', async () => {
    const user = userEvent.setup();
    render(<TextEditDialog {...defaultProps} />);

    // Focus textarea first
    const textarea = screen.getByPlaceholderText('Enter text...');
    await user.click(textarea);
    await user.keyboard('{Control>}{Enter}{/Control}');
    expect(defaultProps.onSave).toHaveBeenCalledWith('Hello world');
  });
});

// ============================================================
// Disabled state
// ============================================================
describe('TextEditDialog — disabled state', () => {
  it('disables Save button when text is empty', async () => {
    const user = userEvent.setup();
    render(<TextEditDialog {...defaultProps} initialValue="" />);

    const saveBtn = screen.getByText('Save');
    expect(saveBtn).toBeDisabled();
  });

  it('disables Save button when text is only whitespace', async () => {
    const user = userEvent.setup();
    render(<TextEditDialog {...defaultProps} initialValue="   " />);

    const saveBtn = screen.getByText('Save');
    expect(saveBtn).toBeDisabled();
  });
});
