import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { StepSeparator } from './StepSeparator';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

afterEach(() => cleanup());

describe('StepSeparator', () => {
  it('renders step number with i18n label', () => {
    render(<StepSeparator stepNumber={3} />);
    expect(screen.getByText('Step')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('renders title when provided', () => {
    render(<StepSeparator stepNumber={1} title="Assembly A" />);
    expect(screen.getByText('Assembly A')).toBeTruthy();
  });

  it('omits title when null', () => {
    const { container } = render(<StepSeparator stepNumber={2} title={null} />);
    const badge = container.querySelector('[role="separator"]');
    expect(badge).not.toBeNull();
    // Should not have a title element
    expect(screen.queryByText('Assembly A')).toBeNull();
  });

  it('has role="separator" for accessibility', () => {
    const { container } = render(<StepSeparator stepNumber={1} />);
    expect(container.querySelector('[role="separator"]')).not.toBeNull();
  });
});
