import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AutocompleteEditInput, type AutocompleteSuggestion } from './AutocompleteEditInput';

afterEach(() => {
  cleanup();
});

const suggestions: AutocompleteSuggestion[] = [
  { id: 's1', label: 'Wrench', sublabel: 'PN-01 · Steel' },
  { id: 's2', label: 'Bolt', sublabel: 'PN-02' },
  { id: 's3', label: 'Hammer' },
];

describe('AutocompleteEditInput', () => {
  it('renders as standard EditInput when no suggestions match', () => {
    render(
      <AutocompleteEditInput
        suggestions={suggestions}
        onSelect={vi.fn()}
        value="zzz"
        onChange={vi.fn()}
      />,
    );
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows dropdown when typing matches a suggestion', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <AutocompleteEditInput
        suggestions={suggestions}
        onSelect={vi.fn()}
        value=""
        onChange={onChange}
      />,
    );

    const input = screen.getByRole('textbox');
    await user.click(input);

    // Rerender with matching value
    rerender(
      <AutocompleteEditInput
        suggestions={suggestions}
        onSelect={vi.fn()}
        value="wre"
        onChange={onChange}
      />,
    );

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Wrench')).toBeInTheDocument();
  });

  it('filters suggestions by sublabel too', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <AutocompleteEditInput
        suggestions={suggestions}
        onSelect={vi.fn()}
        value=""
        onChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('textbox'));

    rerender(
      <AutocompleteEditInput
        suggestions={suggestions}
        onSelect={vi.fn()}
        value="PN-01"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Wrench')).toBeInTheDocument();
    expect(screen.queryByText('Bolt')).not.toBeInTheDocument();
  });

  it('hides dropdown on blur', async () => {
    const user = userEvent.setup();
    render(
      <AutocompleteEditInput
        suggestions={suggestions}
        onSelect={vi.fn()}
        value="Bolt"
        onChange={vi.fn()}
      />,
    );

    const input = screen.getByRole('textbox');
    await user.click(input);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    // Blur by tabbing away
    await user.tab();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('selecting suggestion calls onSelect with correct id', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <AutocompleteEditInput
        suggestions={suggestions}
        onSelect={onSelect}
        value="Bolt"
        onChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('textbox'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.click(screen.getByText('Bolt'));
    expect(onSelect).toHaveBeenCalledWith('s2');
  });

  it('keyboard navigation: ArrowDown/Up + Enter to select', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <AutocompleteEditInput
        suggestions={suggestions}
        onSelect={onSelect}
        value="b"
        onChange={vi.fn()}
      />,
    );

    const input = screen.getByRole('textbox');
    await user.click(input);
    // "b" matches "Bolt"
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith('s2');
  });

  it('Escape closes dropdown without selecting', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <AutocompleteEditInput
        suggestions={suggestions}
        onSelect={onSelect}
        value="Bolt"
        onChange={vi.fn()}
      />,
    );

    const input = screen.getByRole('textbox');
    await user.click(input);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('respects minChars threshold', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <AutocompleteEditInput
        suggestions={suggestions}
        onSelect={vi.fn()}
        value=""
        onChange={vi.fn()}
        minChars={3}
      />,
    );

    await user.click(screen.getByRole('textbox'));

    // 2 chars — below threshold
    rerender(
      <AutocompleteEditInput
        suggestions={suggestions}
        onSelect={vi.fn()}
        value="Bo"
        onChange={vi.fn()}
        minChars={3}
      />,
    );
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    // 3 chars — meets threshold
    rerender(
      <AutocompleteEditInput
        suggestions={suggestions}
        onSelect={vi.fn()}
        value="Bol"
        onChange={vi.fn()}
        minChars={3}
      />,
    );
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('passes through onChange and onBlur to underlying input', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onBlur = vi.fn();
    render(
      <AutocompleteEditInput
        suggestions={[]}
        onSelect={vi.fn()}
        value=""
        onChange={onChange}
        onBlur={onBlur}
      />,
    );

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.type(input, 'x');
    expect(onChange).toHaveBeenCalled();

    await user.tab();
    expect(onBlur).toHaveBeenCalled();
  });

  it('passes through size and error props to EditInput', () => {
    render(
      <AutocompleteEditInput
        suggestions={[]}
        onSelect={vi.fn()}
        value=""
        onChange={vi.fn()}
        size="sm"
        error
      />,
    );
    const input = screen.getByRole('textbox');
    expect(input.className).toContain('border-red');
  });

  it('shows sublabel in dropdown when provided', async () => {
    const user = userEvent.setup();
    render(
      <AutocompleteEditInput
        suggestions={suggestions}
        onSelect={vi.fn()}
        value="Wrench"
        onChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('textbox'));
    expect(screen.getByText('PN-01 · Steel')).toBeInTheDocument();
  });
});
