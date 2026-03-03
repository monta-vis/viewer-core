import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { DialogShell, Button } from '@/components/ui';

interface StepInfo {
  id: string;
  order: number;
  title: string | null;
  assemblyId: string | null;
}

interface StepAssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  assemblyId: string;
  assemblyTitle: string | null;
  allSteps: StepInfo[];
  onMoveStepToAssembly: (stepId: string, assemblyId: string | null) => void;
}

/**
 * StepAssignmentDialog — checklist dialog for batch-assigning steps to an assembly.
 *
 * Shows all steps as checkboxes. Steps already in this assembly are pre-checked.
 * On confirm, calls onMoveStepToAssembly for each toggled step.
 */
export function StepAssignmentDialog({
  open,
  onClose,
  assemblyId,
  assemblyTitle,
  allSteps,
  onMoveStepToAssembly,
}: StepAssignmentDialogProps) {
  const { t } = useTranslation();

  // Track which steps are checked (keyed by step id)
  const initialChecked = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const step of allSteps) {
      map.set(step.id, step.assemblyId === assemblyId);
    }
    return map;
  }, [allSteps, assemblyId]);

  const [checked, setChecked] = useState<Map<string, boolean>>(new Map(initialChecked));

  // Sync checked state when initialChecked changes (e.g. after confirm updates the store)
  useEffect(() => {
    setChecked(new Map(initialChecked));
  }, [initialChecked]);

  // Reset state when dialog opens
  const handleClose = () => {
    setChecked(new Map(initialChecked));
    onClose();
  };

  const handleToggle = (stepId: string) => {
    setChecked((prev) => {
      const next = new Map(prev);
      next.set(stepId, !prev.get(stepId));
      return next;
    });
  };

  const handleConfirm = () => {
    for (const step of allSteps) {
      const wasChecked = initialChecked.get(step.id) ?? false;
      const isChecked = checked.get(step.id) ?? false;

      if (wasChecked && !isChecked) {
        // Removed from this assembly
        onMoveStepToAssembly(step.id, null);
      } else if (!wasChecked && isChecked) {
        // Added to this assembly
        onMoveStepToAssembly(step.id, assemblyId);
      }
    }
    onClose();
  };

  return (
    <DialogShell open={open} onClose={handleClose} maxWidth="max-w-md">
      <div className="flex flex-col gap-4 p-4">
        {/* Header */}
        <h2 className="text-base font-semibold text-[var(--color-text-base)]">
          {t('editorCore.assignSteps', 'Assign steps')}
          {assemblyTitle && (
            <span className="text-[var(--color-text-muted)] font-normal"> — {assemblyTitle}</span>
          )}
        </h2>

        {/* Step checklist */}
        <div className="flex flex-col gap-1 max-h-[20rem] overflow-y-auto scrollbar-subtle">
          {allSteps.map((step) => (
            <label
              key={step.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.05] cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={checked.get(step.id) ?? false}
                onChange={() => handleToggle(step.id)}
                className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-primary)]"
              />
              <span className="text-sm text-[var(--color-text-base)]">
                {step.order}. {step.title || t('instructionView.step', 'Step')}
              </span>
            </label>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
          <Button variant="ghost" size="sm" onClick={handleClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button variant="primary" size="sm" onClick={handleConfirm}>
            {t('editorCore.confirmAssignment', 'Confirm')}
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}
