import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextInputModal } from './TextInputModal';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string) => fallback,
  }),
}));

afterEach(cleanup);

const defaultProps = {
  label: 'Part Name',
  value: 'Steel Bolt',
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

describe('TextInputModal', () => {
  it('renders label and current value in input', () => {
    render(<TextInputModal {...defaultProps} />);

    expect(screen.getByText('Part Name')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('Steel Bolt');
  });

  it('auto-focuses the input', () => {
    render(<TextInputModal {...defaultProps} />);

    expect(screen.getByRole('textbox')).toHaveFocus();
  });

  it('fires onConfirm with new value on Enter key', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<TextInputModal {...defaultProps} onConfirm={onConfirm} />);

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'New Bolt{Enter}');

    expect(onConfirm).toHaveBeenCalledWith('New Bolt');
  });

  it('fires onCancel on Escape key', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<TextInputModal {...defaultProps} onCancel={onCancel} />);

    await user.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalled();
  });

  it('fires onCancel when clicking backdrop', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<TextInputModal {...defaultProps} onCancel={onCancel} />);

    // Click the backdrop (the outermost fixed overlay)
    const backdrop = screen.getByTestId('text-input-modal-backdrop');
    await user.click(backdrop);

    expect(onCancel).toHaveBeenCalled();
  });

  it('does not fire onCancel when clicking inside the card', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<TextInputModal {...defaultProps} onCancel={onCancel} />);

    await user.click(screen.getByText('Part Name'));

    expect(onCancel).not.toHaveBeenCalled();
  });

  it('fires onConfirm when clicking the confirm button', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<TextInputModal {...defaultProps} onConfirm={onConfirm} />);

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Updated');
    await user.click(screen.getByRole('button', { name: /confirm/i }));

    expect(onConfirm).toHaveBeenCalledWith('Updated');
  });

  it('fires onCancel when clicking the cancel button', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<TextInputModal {...defaultProps} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalled();
  });

  it('renders a textarea when inputType is textarea', () => {
    render(<TextInputModal {...defaultProps} inputType="textarea" />);

    expect(screen.queryByRole('textbox')).toBeInTheDocument();
    // textarea element
    const el = screen.getByRole('textbox');
    expect(el.tagName).toBe('TEXTAREA');
  });

  it('renders number input when inputType is number', () => {
    render(<TextInputModal {...defaultProps} inputType="number" value="42" />);

    const input = screen.getByRole('spinbutton');
    expect(input).toHaveValue(42);
  });
});

// ============================================================
// Suggestions feature
// ============================================================
const mockSuggestions = [
  { id: 'pt-1', label: 'Steel Bolt', sublabel: 'BLT-001' },
  { id: 'pt-2', label: 'Aluminum Nut', sublabel: 'NUT-002' },
  { id: 'pt-3', label: 'Copper Washer' },
];

describe('TextInputModal — suggestions', () => {
  it('renders suggestion list when suggestions prop is provided', () => {
    render(
      <TextInputModal
        {...defaultProps}
        value=""
        suggestions={mockSuggestions}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText('Steel Bolt')).toBeInTheDocument();
    expect(screen.getByText('Aluminum Nut')).toBeInTheDocument();
    expect(screen.getByText('Copper Washer')).toBeInTheDocument();
  });

  it('shows sublabel when provided', () => {
    render(
      <TextInputModal
        {...defaultProps}
        value=""
        suggestions={mockSuggestions}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText('BLT-001')).toBeInTheDocument();
    expect(screen.getByText('NUT-002')).toBeInTheDocument();
  });

  it('filters suggestions case-insensitively by label and sublabel', async () => {
    const user = userEvent.setup();
    render(
      <TextInputModal
        {...defaultProps}
        value=""
        suggestions={mockSuggestions}
        onSelect={vi.fn()}
      />
    );

    const input = screen.getByRole('textbox');
    await user.type(input, 'alu');

    // Only "Aluminum Nut" should match
    expect(screen.getByText('Aluminum Nut')).toBeInTheDocument();
    expect(screen.queryByText('Steel Bolt')).not.toBeInTheDocument();
    expect(screen.queryByText('Copper Washer')).not.toBeInTheDocument();
  });

  it('filters suggestions by sublabel match', async () => {
    const user = userEvent.setup();
    render(
      <TextInputModal
        {...defaultProps}
        value=""
        suggestions={mockSuggestions}
        onSelect={vi.fn()}
      />
    );

    const input = screen.getByRole('textbox');
    await user.type(input, 'BLT');

    expect(screen.getByText('Steel Bolt')).toBeInTheDocument();
    expect(screen.queryByText('Aluminum Nut')).not.toBeInTheDocument();
  });

  it('fires onSelect(id) when a suggestion is clicked, not onConfirm', async () => {
    const onSelect = vi.fn();
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <TextInputModal
        {...defaultProps}
        value=""
        onConfirm={onConfirm}
        suggestions={mockSuggestions}
        onSelect={onSelect}
      />
    );

    await user.click(screen.getByText('Aluminum Nut'));

    expect(onSelect).toHaveBeenCalledWith('pt-2');
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('fires onConfirm on Enter key (free-text), independent of suggestions', async () => {
    const onSelect = vi.fn();
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <TextInputModal
        {...defaultProps}
        value=""
        onConfirm={onConfirm}
        suggestions={mockSuggestions}
        onSelect={onSelect}
      />
    );

    const input = screen.getByRole('textbox');
    await user.type(input, 'Brand New Part{Enter}');

    expect(onConfirm).toHaveBeenCalledWith('Brand New Part');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('does not render suggestion list when no suggestions provided (backward compatible)', () => {
    render(<TextInputModal {...defaultProps} />);

    expect(screen.queryByTestId('suggestion-list')).not.toBeInTheDocument();
  });

  it('shows "no results" message when filter matches nothing', async () => {
    const user = userEvent.setup();
    render(
      <TextInputModal
        {...defaultProps}
        value=""
        suggestions={mockSuggestions}
        onSelect={vi.fn()}
      />
    );

    const input = screen.getByRole('textbox');
    await user.type(input, 'xyznonexistent');

    expect(screen.getByText('No results')).toBeInTheDocument();
  });
});
