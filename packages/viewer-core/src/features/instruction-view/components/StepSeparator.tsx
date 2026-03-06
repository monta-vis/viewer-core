import { useTranslation } from 'react-i18next';

interface StepSeparatorProps {
  stepNumber: number;
  title?: string | null;
}

/** Visual divider between steps with a centered badge showing "Step N". */
export function StepSeparator({ stepNumber, title }: StepSeparatorProps) {
  const { t } = useTranslation();

  return (
    <div role="separator" className="flex flex-col items-center gap-1 py-4">
      <div className="flex items-center gap-3 w-full">
        <div className="flex-1 h-px bg-[var(--color-border-base)]" />
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-bg-elevated)] text-sm font-medium text-[var(--color-text-muted)] shadow-sm">
          <span>{t('instructionView.step', 'Step')}</span>
          <span className="font-bold text-[var(--color-text-base)]">{stepNumber}</span>
        </span>
        <div className="flex-1 h-px bg-[var(--color-border-base)]" />
      </div>
      {title && (
        <span className="text-sm font-medium text-[var(--color-text-muted)]">{title}</span>
      )}
    </div>
  );
}
