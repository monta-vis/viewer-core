import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AssemblySection } from './AssemblySection';
import type { Assembly } from '@/features/instruction';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string, opts?: Record<string, unknown>) => {
      if (opts?.count !== undefined) return `${opts.count} ${fallback?.replace('{{count}} ', '') ?? _key}`;
      return fallback ?? _key;
    },
  }),
}));

vi.mock('@/lib/icons', () => ({
  AssemblyIcon: (props: Record<string, unknown>) => <svg data-testid="assembly-icon" {...props} />,
}));

vi.mock('@/components/ui', () => ({
  Card: ({ children, className, ...props }: Record<string, unknown> & { children: ReactNode; className?: string }) => (
    <div data-testid="card" className={className as string} {...props}>{children}</div>
  ),
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  IconButton: ({ icon, 'aria-label': label, onClick, ...rest }: Record<string, unknown>) => (
    <button aria-label={label as string} onClick={onClick as () => void} {...rest}>{icon as ReactNode}</button>
  ),
  DialogShell: ({ open, children }: { open: boolean; children: ReactNode }) => (
    open ? <div data-testid="dialog-shell">{children}</div> : null
  ),
  ConfirmDeleteDialog: ({ open, onConfirm, onClose }: { open: boolean; onConfirm: () => void; onClose: () => void }) => (
    open ? (
      <div data-testid="confirm-delete-dialog">
        <button data-testid="confirm-delete-confirm" onClick={() => { onConfirm(); onClose(); }}>Delete</button>
        <button data-testid="confirm-delete-cancel" onClick={onClose}>Cancel</button>
      </div>
    ) : null
  ),
}));

vi.mock('./StepOverviewCard', () => ({
  StepOverviewCard: ({ stepNumber, onClick }: { stepNumber: number; onClick: () => void }) => (
    <div data-testid={`step-card-${stepNumber}`} onClick={onClick}>Step {stepNumber}</div>
  ),
}));

vi.mock('./StepAssignmentDialog', () => ({
  StepAssignmentDialog: () => null,
}));

afterEach(() => cleanup());

const baseAssembly: Assembly = {
  id: 'asm-1',
  versionId: 'v1',
  instructionId: 'inst-1',
  title: 'Main Frame',
  description: null,
  order: 0,
  videoFrameAreaId: null,
  stepIds: ['s1'],
};

const baseSteps = [
  {
    id: 's1',
    order: 1,
    title: 'Step 1',
    description: null,
    substepCount: 3,
  },
];

describe('AssemblySection — assembly image', () => {
  it('renders image in view mode header when assemblyImageUrl is provided', () => {
    render(
      <AssemblySection
        assembly={baseAssembly}
        steps={baseSteps}
        onStepSelect={() => {}}
        assemblyImageUrl="https://example.com/assembly.png"
      />,
    );

    const img = screen.getByAltText('Main Frame');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('https://example.com/assembly.png');
  });

  it('renders image in edit mode header when assemblyImageUrl is provided', () => {
    render(
      <AssemblySection
        assembly={baseAssembly}
        steps={baseSteps}
        onStepSelect={() => {}}
        editMode
        assemblyImageUrl="https://example.com/assembly.png"
      />,
    );

    const img = screen.getByAltText('Main Frame');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('https://example.com/assembly.png');
  });

  it('renders AssemblyIcon when assemblyImageUrl is not provided', () => {
    const { container } = render(
      <AssemblySection
        assembly={baseAssembly}
        steps={baseSteps}
        onStepSelect={() => {}}
      />,
    );

    // AssemblyIcon renders an svg; no img should be present
    expect(container.querySelector('svg')).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('renders AssemblyIcon when assemblyImageUrl is null', () => {
    const { container } = render(
      <AssemblySection
        assembly={baseAssembly}
        steps={baseSteps}
        onStepSelect={() => {}}
        assemblyImageUrl={null}
      />,
    );

    expect(container.querySelector('svg')).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });
});
