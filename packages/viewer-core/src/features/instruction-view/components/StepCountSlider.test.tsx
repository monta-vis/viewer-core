import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

import { StepCountSlider } from './StepCountSlider';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback,
  }),
}));

afterEach(() => {
  cleanup();
});

describe('StepCountSlider', () => {
  const defaultProps = {
    value: 3,
    isAll: false,
    isAssembly: false,
    hasMultipleAssemblies: false,
    currentStepNumber: 1,
    totalSteps: 10,
    onChange: vi.fn(),
    onAllChange: vi.fn(),
    onAssemblyChange: vi.fn(),
    onNumberClick: vi.fn(),
  };

  it('renders slider with fixed max capped at 6', () => {
    render(<StepCountSlider {...defaultProps} />);
    const slider = screen.getByTestId('step-count-slider');
    expect(slider).toHaveAttribute('min', '1');
    expect(slider).toHaveAttribute('max', '6');
    expect(slider).toHaveAttribute('value', '3');
  });

  it('clamps slider max to totalSteps when fewer than 6', () => {
    render(<StepCountSlider {...defaultProps} totalSteps={4} value={2} />);
    const slider = screen.getByTestId('step-count-slider');
    expect(slider).toHaveAttribute('max', '4');
  });

  it('calls onChange when slider is moved', () => {
    const onChange = vi.fn();
    render(<StepCountSlider {...defaultProps} onChange={onChange} />);
    const slider = screen.getByTestId('step-count-slider');
    fireEvent.change(slider, { target: { value: '5' } });
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('calls onNumberClick when number label is clicked', () => {
    const onNumberClick = vi.fn();
    render(<StepCountSlider {...defaultProps} onNumberClick={onNumberClick} />);
    const numberButton = screen.getByRole('button', { name: /click to edit/i });
    fireEvent.click(numberButton);
    expect(onNumberClick).toHaveBeenCalled();
  });

  it('toggles All switch and calls onAllChange', () => {
    const onAllChange = vi.fn();
    render(<StepCountSlider {...defaultProps} onAllChange={onAllChange} />);
    const toggle = screen.getByLabelText('All');
    fireEvent.click(toggle);
    expect(onAllChange).toHaveBeenCalledWith(true);
  });

  it('slider stays enabled when isAll is true', () => {
    render(<StepCountSlider {...defaultProps} isAll={true} />);
    const slider = screen.getByTestId('step-count-slider');
    expect(slider).not.toBeDisabled();
  });

  it('shows "All" text when isAll is true', () => {
    render(<StepCountSlider {...defaultProps} isAll={true} />);
    const numberButton = screen.getByRole('button', { name: /click to edit/i });
    expect(numberButton).toHaveTextContent('All');
  });

  it('shows step range like "1-3" in the number pill', () => {
    render(<StepCountSlider {...defaultProps} value={3} currentStepNumber={1} />);
    const numberButton = screen.getByRole('button', { name: /click to edit/i });
    expect(numberButton).toHaveTextContent('1-3');
  });

  it('shows single step number when value is 1', () => {
    render(<StepCountSlider {...defaultProps} value={1} currentStepNumber={4} />);
    const numberButton = screen.getByRole('button', { name: /click to edit/i });
    expect(numberButton).toHaveTextContent('4');
  });

  it('disables slider when totalSteps is 1', () => {
    render(<StepCountSlider {...defaultProps} totalSteps={1} value={1} />);
    const slider = screen.getByTestId('step-count-slider');
    expect(slider).toBeDisabled();
  });

  it('has aria-labels on interactive elements', () => {
    render(<StepCountSlider {...defaultProps} />);
    const slider = screen.getByTestId('step-count-slider');
    expect(slider).toHaveAttribute('aria-label');
    expect(screen.getByLabelText('All')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /click to edit/i })).toBeInTheDocument();
  });

  // === Assembly toggle tests ===

  it('shows assembly toggle only when hasMultipleAssemblies is true', () => {
    render(<StepCountSlider {...defaultProps} hasMultipleAssemblies={true} />);
    expect(screen.getByLabelText('Filter by assembly')).toBeInTheDocument();
  });

  it('hides assembly toggle when hasMultipleAssemblies is false', () => {
    render(<StepCountSlider {...defaultProps} hasMultipleAssemblies={false} />);
    expect(screen.queryByLabelText('Filter by assembly')).not.toBeInTheDocument();
  });

  it('slider stays enabled when isAssembly is true', () => {
    render(<StepCountSlider {...defaultProps} isAssembly={true} hasMultipleAssemblies={true} />);
    const slider = screen.getByTestId('step-count-slider');
    expect(slider).not.toBeDisabled();
  });

  it('calls onAssemblyChange when assembly toggle is clicked', () => {
    const onAssemblyChange = vi.fn();
    render(
      <StepCountSlider
        {...defaultProps}
        hasMultipleAssemblies={true}
        onAssemblyChange={onAssemblyChange}
      />,
    );
    const toggle = screen.getByLabelText('Filter by assembly');
    fireEvent.click(toggle);
    expect(onAssemblyChange).toHaveBeenCalledWith(true);
  });

  it('renders label and pill in the first grid row', () => {
    render(<StepCountSlider {...defaultProps} />);
    // Label should be present
    const label = screen.getByTestId('step-count-row1');
    expect(label).toBeInTheDocument();
    // Pill button should be present in the same grid
    const pill = screen.getByRole('button', { name: /click to edit/i });
    expect(pill).toBeInTheDocument();
  });
});
