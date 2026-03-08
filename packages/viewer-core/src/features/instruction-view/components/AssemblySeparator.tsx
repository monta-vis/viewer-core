import { useTranslation } from 'react-i18next';
import { AssemblyIcon } from '@/lib/icons';
import { PartToolBadge } from './PartToolBadge';

interface AssemblySeparatorProps {
  title: string;
  stepCount: number;
  partCount?: number;
  toolCount?: number;
  onPartToolClick?: () => void;
}

/** Visual divider between assemblies with title, step count, and optional parts/tools pill. */
export function AssemblySeparator({ title, stepCount, partCount, toolCount, onPartToolClick }: AssemblySeparatorProps) {
  const { t } = useTranslation();

  const hasParts = (partCount ?? 0) > 0;
  const hasTools = (toolCount ?? 0) > 0;
  const showPill = (hasParts || hasTools) && onPartToolClick;

  return (
    <div
      role="separator"
      aria-label={`${t('instructionView.assembly', 'Assembly')}: ${title}`}
      className="py-6"
    >
      {/* Top line */}
      <div className="h-0.5 bg-[var(--color-secondary)]" />

      {/* Content row */}
      <div className="flex items-center justify-between px-2 py-3">
        <div className="flex items-center gap-2">
          <AssemblyIcon className="w-5 h-5 text-[var(--color-secondary)]" />
          <div className="flex flex-col">
            <span className="text-base font-semibold text-[var(--color-text-base)]">
              {title}
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">
              {t('instructionView.nSteps', '{{count}} Steps', { count: stepCount })}
            </span>
          </div>
        </div>

        {showPill && (
          <PartToolBadge
            partCount={partCount ?? 0}
            toolCount={toolCount ?? 0}
            onClick={onPartToolClick}
            showChevron
          />
        )}
      </div>

      {/* Bottom line */}
      <div className="h-0.5 bg-[var(--color-secondary)]" />
    </div>
  );
}
