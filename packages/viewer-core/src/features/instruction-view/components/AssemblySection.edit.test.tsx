import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { ReactNode } from 'react';

// ---------- Mocks ----------

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock('@/hooks', () => ({
  usePreferredResolution: () => ({ resolvedResolution: '1080p' }),
}));

vi.mock('@/components/ui', () => ({
  Card: ({ children, className, ...props }: Record<string, unknown> & { children: ReactNode; className?: string }) => (
    <div data-testid="card" className={className as string} {...props}>{children}</div>
  ),
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  IconButton: ({ icon, 'aria-label': label, onClick, ...rest }: Record<string, unknown>) => (
    <button aria-label={label as string} onClick={onClick as () => void} {...rest}>{icon as ReactNode}</button>
  ),
  Button: ({ children, onClick, ...rest }: Record<string, unknown> & { children: ReactNode }) => (
    <button onClick={onClick as () => void} {...rest}>{children}</button>
  ),
  DialogShell: ({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) =>
    open ? <div data-testid="dialog-shell" role="dialog"><button aria-label="close-dialog" onClick={onClose} />{children}</div> : null,
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
  StepOverviewCard: ({ stepNumber, onClick, draggable, stepId }: { stepNumber: number; onClick: () => void; draggable?: boolean; stepId?: string }) => (
    <div
      data-testid={`step-card-${stepNumber}`}
      data-step-id={stepId}
      draggable={draggable}
      onClick={onClick}
    >
      Step {stepNumber}
    </div>
  ),
}));

import { AssemblySection, UnassignedSection } from './AssemblySection';
import type { Assembly } from '@/features/instruction';

const baseAssembly: Assembly = {
  id: 'asm-1',
  versionId: 'v1',
  instructionId: 'i1',
  title: 'Main Assembly',
  description: null,
  order: 1,
  videoFrameAreaId: null,
  stepIds: ['s1'],
};

const baseSteps = [
  {
    id: 's1',
    order: 1,
    title: 'Step 1',
    description: null,
    substepCount: 2,
    previewAreaId: null,
    previewLocalPath: null,
    frameCaptureData: null,
  },
];

const allSteps = [
  {
    id: 's1',
    order: 1,
    title: 'Step 1',
    description: null,
    substepCount: 2,
    assemblyId: 'asm-1',
    previewAreaId: null,
    previewLocalPath: null,
    frameCaptureData: null,
  },
  {
    id: 's2',
    order: 2,
    title: 'Step 2',
    description: null,
    substepCount: 1,
    assemblyId: null,
    previewAreaId: null,
    previewLocalPath: null,
    frameCaptureData: null,
  },
  {
    id: 's3',
    order: 3,
    title: 'Step 3',
    description: null,
    substepCount: 3,
    assemblyId: 'asm-2',
    previewAreaId: null,
    previewLocalPath: null,
    frameCaptureData: null,
  },
];

// availableAssemblies removed — no longer used (dropdowns replaced by DnD)

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AssemblySection edit mode', () => {
  it('editMode=false → no delete button, no editable title, no move select', () => {
    render(
      <AssemblySection
        assembly={baseAssembly}
        steps={baseSteps}
        onStepSelect={vi.fn()}
      />
    );

    expect(screen.queryByLabelText(/delete assembly/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/move to assembly/i)).not.toBeInTheDocument();
  });

  it('editMode=true → delete button visible with aria-label', () => {
    render(
      <AssemblySection
        assembly={baseAssembly}
        steps={baseSteps}
        onStepSelect={vi.fn()}
        editMode

        onDeleteAssembly={vi.fn()}
        onRenameAssembly={vi.fn()}
        onMoveStepToAssembly={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/delete assembly/i)).toBeInTheDocument();
  });

  it('editMode=true → click title → input appears, Enter saves', () => {
    const onRename = vi.fn();
    render(
      <AssemblySection
        assembly={baseAssembly}
        steps={baseSteps}
        onStepSelect={vi.fn()}
        editMode

        onDeleteAssembly={vi.fn()}
        onRenameAssembly={onRename}
        onMoveStepToAssembly={vi.fn()}
      />
    );

    // Click the title to start editing
    fireEvent.click(screen.getByTestId('assembly-title'));

    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();

    // Type new name and press Enter
    fireEvent.change(input, { target: { value: 'Renamed' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onRename).toHaveBeenCalledWith('asm-1', 'Renamed');
  });

  it('editMode=true → Escape cancels title editing without saving', () => {
    const onRename = vi.fn();
    render(
      <AssemblySection
        assembly={baseAssembly}
        steps={baseSteps}
        onStepSelect={vi.fn()}
        editMode

        onDeleteAssembly={vi.fn()}
        onRenameAssembly={onRename}
        onMoveStepToAssembly={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('assembly-title'));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Renamed' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    // Should not have called onRename
    expect(onRename).not.toHaveBeenCalled();
    // Input should be gone
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('delete button opens confirmation dialog and confirming calls onDeleteAssembly', () => {
    const onDelete = vi.fn();

    render(
      <AssemblySection
        assembly={baseAssembly}
        steps={baseSteps}
        onStepSelect={vi.fn()}
        editMode

        onDeleteAssembly={onDelete}
        onRenameAssembly={vi.fn()}
        onMoveStepToAssembly={vi.fn()}
      />
    );

    fireEvent.click(screen.getByLabelText(/delete assembly/i));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByTestId('confirm-delete-dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('confirm-delete-confirm'));
    expect(onDelete).toHaveBeenCalledWith('asm-1');
  });

  it('editMode=true → StepOverviewCard has draggable attribute', () => {
    render(
      <AssemblySection
        assembly={baseAssembly}
        steps={baseSteps}
        onStepSelect={vi.fn()}
        editMode
        onDeleteAssembly={vi.fn()}
        onRenameAssembly={vi.fn()}
        onMoveStepToAssembly={vi.fn()}
      />
    );

    const card = screen.getByTestId('step-card-1');
    expect(card).toHaveAttribute('draggable', 'true');
  });

  it('editMode=true → select dropdown no longer renders', () => {
    render(
      <AssemblySection
        assembly={baseAssembly}
        steps={baseSteps}
        onStepSelect={vi.fn()}
        editMode
        onDeleteAssembly={vi.fn()}
        onRenameAssembly={vi.fn()}
        onMoveStepToAssembly={vi.fn()}
      />
    );

    expect(screen.queryByLabelText(/move to assembly/i)).not.toBeInTheDocument();
  });

  it('drop on AssemblySection calls onMoveStepToAssembly(stepId, assemblyId)', () => {
    const onMove = vi.fn();
    const { container } = render(
      <AssemblySection
        assembly={baseAssembly}
        steps={baseSteps}
        onStepSelect={vi.fn()}
        editMode
        onDeleteAssembly={vi.fn()}
        onRenameAssembly={vi.fn()}
        onMoveStepToAssembly={onMove}
      />
    );

    // The outer Card is the drop target
    const dropZone = container.firstElementChild!;
    const dataTransfer = {
      getData: (key: string) => key === 'application/x-step-id' ? 'step-x' : '',
      types: ['application/x-step-id'],
    };

    fireEvent.drop(dropZone, { dataTransfer });
    expect(onMove).toHaveBeenCalledWith('step-x', 'asm-1');
  });

  it('drag-over shows visual ring indicator', () => {
    const { container } = render(
      <AssemblySection
        assembly={baseAssembly}
        steps={baseSteps}
        onStepSelect={vi.fn()}
        editMode
        onDeleteAssembly={vi.fn()}
        onRenameAssembly={vi.fn()}
        onMoveStepToAssembly={vi.fn()}
      />
    );

    const dropZone = container.firstElementChild!;
    const dataTransfer = { types: ['application/x-step-id'] };

    fireEvent.dragOver(dropZone, { dataTransfer });
    expect(dropZone.className).toContain('ring-2');
  });

  it('allowEmpty=true → renders even with 0 steps', () => {
    render(
      <AssemblySection
        assembly={baseAssembly}
        steps={[]}
        onStepSelect={vi.fn()}
        editMode
        allowEmpty
        availableAssemblies={[]}
        onDeleteAssembly={vi.fn()}
        onRenameAssembly={vi.fn()}
        onMoveStepToAssembly={vi.fn()}
      />
    );

    expect(screen.getByText('Main Assembly')).toBeInTheDocument();
    expect(screen.getByText(/no steps/i)).toBeInTheDocument();
  });

  it('editMode=true → "+" assign button visible with aria-label', () => {
    render(
      <AssemblySection
        assembly={baseAssembly}
        steps={baseSteps}
        onStepSelect={vi.fn()}
        editMode
        allSteps={allSteps}
        onDeleteAssembly={vi.fn()}
        onRenameAssembly={vi.fn()}
        onMoveStepToAssembly={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/assign steps/i)).toBeInTheDocument();
  });

  it('editMode=false → no assign button', () => {
    render(
      <AssemblySection
        assembly={baseAssembly}
        steps={baseSteps}
        onStepSelect={vi.fn()}
        allSteps={allSteps}
      />
    );

    expect(screen.queryByLabelText(/assign steps/i)).not.toBeInTheDocument();
  });

  it('clicking "+" opens the step assignment dialog', () => {
    render(
      <AssemblySection
        assembly={baseAssembly}
        steps={baseSteps}
        onStepSelect={vi.fn()}
        editMode
        allSteps={allSteps}
        onDeleteAssembly={vi.fn()}
        onRenameAssembly={vi.fn()}
        onMoveStepToAssembly={vi.fn()}
      />
    );

    // Dialog should not be open initially
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Click the assign button
    fireEvent.click(screen.getByLabelText(/assign steps/i));

    // Dialog should now be open
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('dialog shows all steps as checkable items', () => {
    render(
      <AssemblySection
        assembly={baseAssembly}
        steps={baseSteps}
        onStepSelect={vi.fn()}
        editMode
        allSteps={allSteps}
        onDeleteAssembly={vi.fn()}
        onRenameAssembly={vi.fn()}
        onMoveStepToAssembly={vi.fn()}
      />
    );

    fireEvent.click(screen.getByLabelText(/assign steps/i));

    // All 3 steps should be listed as checkboxes
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(3);

    // Step labels should be visible in the dialog
    // (Step 1 also appears in the StepOverviewCard mock, so use getAllByText)
    expect(screen.getAllByText(/Step 1/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Step 2/)).toBeInTheDocument();
    expect(screen.getByText(/Step 3/)).toBeInTheDocument();
  });

  it('steps in current assembly are pre-checked', () => {
    render(
      <AssemblySection
        assembly={baseAssembly}
        steps={baseSteps}
        onStepSelect={vi.fn()}
        editMode
        allSteps={allSteps}
        onDeleteAssembly={vi.fn()}
        onRenameAssembly={vi.fn()}
        onMoveStepToAssembly={vi.fn()}
      />
    );

    fireEvent.click(screen.getByLabelText(/assign steps/i));

    const checkboxes = screen.getAllByRole('checkbox');
    // s1 has assemblyId='asm-1' → checked
    expect(checkboxes[0]).toBeChecked();
    // s2 has assemblyId=null → unchecked
    expect(checkboxes[1]).not.toBeChecked();
    // s3 has assemblyId='asm-2' → unchecked
    expect(checkboxes[2]).not.toBeChecked();
  });

  it('toggle step + confirm → calls onMoveStepToAssembly', () => {
    const onMove = vi.fn();
    render(
      <AssemblySection
        assembly={baseAssembly}
        steps={baseSteps}
        onStepSelect={vi.fn()}
        editMode
        allSteps={allSteps}
        onDeleteAssembly={vi.fn()}
        onRenameAssembly={vi.fn()}
        onMoveStepToAssembly={onMove}
      />
    );

    fireEvent.click(screen.getByLabelText(/assign steps/i));

    const checkboxes = screen.getAllByRole('checkbox');

    // Uncheck s1 (was in this assembly)
    fireEvent.click(checkboxes[0]);
    // Check s2 (was unassigned)
    fireEvent.click(checkboxes[1]);

    // Click confirm
    fireEvent.click(screen.getByText('Confirm'));

    // s1 was unchecked → removed from assembly
    expect(onMove).toHaveBeenCalledWith('s1', null);
    // s2 was checked → assigned to this assembly
    expect(onMove).toHaveBeenCalledWith('s2', 'asm-1');
    // s3 was untouched → no call
    expect(onMove).not.toHaveBeenCalledWith('s3', expect.anything());
  });

  it('cancel closes dialog without calling callbacks', () => {
    const onMove = vi.fn();
    render(
      <AssemblySection
        assembly={baseAssembly}
        steps={baseSteps}
        onStepSelect={vi.fn()}
        editMode
        allSteps={allSteps}
        onDeleteAssembly={vi.fn()}
        onRenameAssembly={vi.fn()}
        onMoveStepToAssembly={onMove}
      />
    );

    fireEvent.click(screen.getByLabelText(/assign steps/i));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Toggle a checkbox then cancel
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);

    fireEvent.click(screen.getByText('Cancel'));

    // Dialog closed
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // No move callbacks
    expect(onMove).not.toHaveBeenCalled();
  });
});

describe('UnassignedSection edit mode', () => {
  it('editMode=true → StepOverviewCard has draggable attribute', () => {
    render(
      <UnassignedSection
        steps={baseSteps}
        onStepSelect={vi.fn()}
        editMode
        onMoveStepToAssembly={vi.fn()}
      />
    );

    const card = screen.getByTestId('step-card-1');
    expect(card).toHaveAttribute('draggable', 'true');
  });

  it('drop on UnassignedSection calls onMoveStepToAssembly(stepId, null)', () => {
    const onMove = vi.fn();
    const { container } = render(
      <UnassignedSection
        steps={baseSteps}
        onStepSelect={vi.fn()}
        editMode
        onMoveStepToAssembly={onMove}
      />
    );

    const dropZone = container.firstElementChild!;
    const dataTransfer = {
      getData: (key: string) => key === 'application/x-step-id' ? 'step-x' : '',
      types: ['application/x-step-id'],
    };

    fireEvent.drop(dropZone, { dataTransfer });
    expect(onMove).toHaveBeenCalledWith('step-x', null);
  });

  it('editMode=false → cards are not draggable', () => {
    render(
      <UnassignedSection
        steps={baseSteps}
        onStepSelect={vi.fn()}
      />
    );

    const card = screen.getByTestId('step-card-1');
    expect(card).not.toHaveAttribute('draggable', 'true');
  });
});
