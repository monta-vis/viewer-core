import { useTranslation } from 'react-i18next';
import { Package, Wrench } from 'lucide-react';
import { clsx } from 'clsx';

import { Card } from '@/components/ui';

interface PartsToolsOverviewCardProps {
  /** Total number of unique parts */
  totalParts: number;
  /** Total number of unique tools */
  totalTools: number;
  /** Called when card is clicked */
  onClick?: () => void;
}

/**
 * PartsToolsOverviewCard - "Step 0" card for parts/tools overview
 *
 * Shows combined icon and count preview in the StepOverview grid.
 */
export function PartsToolsOverviewCard({
  totalParts,
  totalTools,
  onClick,
}: PartsToolsOverviewCardProps) {
  const { t } = useTranslation();

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      interactive
      variant="glass"
      bordered={false}
      padding="none"
      className="overflow-hidden group"
    >
      {/* Icon area - square format with gradient background */}
      <div className="relative aspect-square overflow-hidden rounded-t-xl bg-gradient-to-br from-[var(--color-secondary)]/20 via-[var(--color-bg-surface)] to-[hsl(var(--hue-orange),51%,56%)]/20">
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 left-4 w-8 h-8 border-2 border-current rounded-lg rotate-12" />
          <div className="absolute top-8 right-8 w-6 h-6 border-2 border-current rounded-full" />
          <div className="absolute bottom-12 left-8 w-4 h-4 border-2 border-current rounded" />
          <div className="absolute bottom-8 right-12 w-5 h-5 border-2 border-current rotate-45" />
        </div>

        {/* Main icons */}
        <div className="w-full h-full flex items-center justify-center gap-4">
          <div className="flex flex-col items-center gap-1">
            <Package className="w-10 h-10 text-[var(--color-element-part)] opacity-80" />
            <span className="text-xs font-medium text-[var(--color-text-muted)]">
              {totalParts}
            </span>
          </div>
          <div className="w-px h-12 bg-[var(--color-border)]" />
          <div className="flex flex-col items-center gap-1">
            <Wrench className="w-10 h-10 text-[var(--color-element-tool)] opacity-80" />
            <span className="text-xs font-medium text-[var(--color-text-muted)]">
              {totalTools}
            </span>
          </div>
        </div>

        {/* Badge - glass morphism style */}
        <div className="absolute bottom-2 left-2">
          <span
            className={clsx(
              'px-2.5 py-1 rounded-full flex items-center justify-center gap-1',
              'text-xs font-semibold',
              'text-white',
              // Glass morphism
              'bg-white/10 backdrop-blur-md',
              'border border-white/20',
              'shadow-[0_4px_12px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.1)]',
              'transition-all duration-150',
              'group-hover:bg-white/15 group-hover:border-white/30'
            )}
          >
            <span>{t('instructionView.overview', 'Overview')}</span>
          </span>
        </div>
      </div>

      {/* Description area */}
      <div className="px-3 py-3">
        <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 leading-relaxed">
          {t('instructionView.partsToolsDescription', 'All parts and tools needed for this instruction')}
        </p>
      </div>
    </Card>
  );
}
