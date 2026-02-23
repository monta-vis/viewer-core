import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

interface SubstepDotsProps {
  /** All substep IDs in order */
  substepIds: string[];
  /** Amount per substep (substepId -> amount) */
  amountsPerSubstep: Map<string, number>;
  /** Currently highlighted substep */
  highlightedSubstepId?: string | null;
  /** Parts show numbers, tools show filled/empty */
  type: 'part' | 'tool';
}

const MAX_SLOTS = 4;

/**
 * Renders a fixed row of 4 dot slots for substeps.
 * - Always shows 4 slots for consistent layout
 * - Parts: Show quantity inside dot, empty border if 0
 * - Tools: Filled dot if needed, empty border if not
 * - Unused slots (beyond substep count) are invisible placeholders
 */
export function SubstepDots({
  substepIds,
  amountsPerSubstep,
  highlightedSubstepId,
  type,
}: SubstepDotsProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: MAX_SLOTS }).map((_, index) => {
        const substepId = substepIds[index];
        const isSlotUsed = index < substepIds.length;
        const amount = substepId ? (amountsPerSubstep.get(substepId) ?? 0) : 0;
        const isHighlighted = substepId === highlightedSubstepId;
        const hasAmount = amount > 0;

        // Invisible placeholder for unused slots
        if (!isSlotUsed) {
          return (
            <div
              key={`empty-${index}`}
              className="w-4 h-4"
              aria-hidden="true"
            />
          );
        }

        return (
          <div
            key={substepId}
            className={clsx(
              'w-4 h-4 rounded-full flex items-center justify-center text-[0.625rem] font-medium transition-all',
              // Highlight ring for active substep
              isHighlighted && 'ring-2 ring-[var(--color-primary)] ring-offset-1 ring-offset-[var(--color-bg-elevated)]',
              // Filled vs empty state
              hasAmount
                ? 'bg-[var(--color-secondary)] text-[var(--color-bg-base)]'
                : 'bg-[var(--color-bg-surface)] border-2 border-[var(--color-text-muted)]'
            )}
            title={t('instructionView.substepAmount', 'Substep {{index}}: {{amount}}', { index: index + 1, amount })}
          >
            {type === 'part' && hasAmount ? amount : null}
          </div>
        );
      })}
    </div>
  );
}
