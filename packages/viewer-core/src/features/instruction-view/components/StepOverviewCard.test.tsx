import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { StepOverviewCard } from './StepOverviewCard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string, opts?: Record<string, unknown>) => {
      if (opts?.count !== undefined) return `${opts.count} ${fallback?.replace('{{count}} ', '') ?? _key}`;
      return fallback ?? _key;
    },
  }),
}));

vi.mock('@/components/ui', () => ({
  Card: ({ children, className, onClick, ...props }: Record<string, unknown> & { children: ReactNode; className?: string; onClick?: () => void }) => (
    <div data-testid="card" className={className as string} onClick={onClick} {...props}>{children}</div>
  ),
  TextInputModal: () => null,
}));

vi.mock('./VideoFrameCapture', () => ({
  VideoFrameCapture: () => <div data-testid="video-frame-capture" />,
}));

vi.mock('@/components/ui/CollapsiblePanel', () => ({
  CollapsiblePanel: ({ isOpen, children }: { isOpen: boolean; children: ReactNode }) => (
    <div data-testid="collapsible-panel" data-open={isOpen}>
      {isOpen ? children : null}
    </div>
  ),
}));

afterEach(() => cleanup());

describe('StepOverviewCard', () => {
  const baseProps = {
    stepNumber: 3,
    title: 'Attach panel',
    description: 'Some description',
    substepCount: 5,
    onClick: vi.fn(),
  };

  it('renders substep count text', () => {
    render(<StepOverviewCard {...baseProps} />);
    expect(screen.getByText('5 Substeps')).toBeTruthy();
  });

  it('renders expand chevron button with aria-label when onExpandToggle provided', () => {
    render(<StepOverviewCard {...baseProps} onExpandToggle={vi.fn()} />);
    const chevronBtn = screen.getByRole('button', { name: /expand substeps/i });
    expect(chevronBtn).toBeTruthy();
  });

  it('clicking chevron calls onExpandToggle, not onClick', async () => {
    const onExpandToggle = vi.fn();
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(
      <StepOverviewCard
        {...baseProps}
        onClick={onClick}
        expanded={false}
        onExpandToggle={onExpandToggle}
      />,
    );

    const chevronBtn = screen.getByRole('button', { name: /expand substeps/i });
    await user.click(chevronBtn);

    expect(onExpandToggle).toHaveBeenCalledOnce();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders children when expanded=true', () => {
    render(
      <StepOverviewCard {...baseProps} expanded={true} onExpandToggle={vi.fn()}>
        <div data-testid="substep-preview">Preview content</div>
      </StepOverviewCard>,
    );

    expect(screen.getByTestId('substep-preview')).toBeTruthy();
  });

  it('does not render children when expanded=false', () => {
    render(
      <StepOverviewCard {...baseProps} expanded={false} onExpandToggle={vi.fn()}>
        <div data-testid="substep-preview">Preview content</div>
      </StepOverviewCard>,
    );

    expect(screen.queryByTestId('substep-preview')).toBeNull();
  });

  it('chevron rotates based on expanded state', () => {
    const { rerender } = render(
      <StepOverviewCard {...baseProps} expanded={false} onExpandToggle={vi.fn()} />,
    );

    const chevronBtn = screen.getByRole('button', { name: /expand substeps/i });
    const svg = chevronBtn.querySelector('svg');
    expect(svg?.className.baseVal || svg?.getAttribute('class') || '').toContain('-rotate-90');

    rerender(
      <StepOverviewCard {...baseProps} expanded={true} onExpandToggle={vi.fn()} />,
    );
    const svg2 = chevronBtn.querySelector('svg');
    expect(svg2?.className.baseVal || svg2?.getAttribute('class') || '').not.toContain('-rotate-90');
  });
});
