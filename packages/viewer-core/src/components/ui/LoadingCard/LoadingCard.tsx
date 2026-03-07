import { type HTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Card } from '../Card';
import { LogoSpinner } from '../LogoSpinner';

export interface LoadingCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Primary text shown below the progress bar (e.g. project name) */
  title: string;
  /** Secondary text shown below the title (e.g. "Loading instruction...") */
  subtitle?: string;
}

export function LoadingCard({ title, subtitle, className, ...props }: LoadingCardProps) {
  const { t } = useTranslation();

  return (
    <div className={clsx('animate-pulse', className)} {...props}>
      <Card variant="elevated" padding="lg" className="flex flex-col items-center gap-4 min-w-[18rem] max-w-[24rem]">
        <LogoSpinner size="xl" />

        {/* Indeterminate progress bar */}
        <div
          role="progressbar"
          aria-label={t('common.loading')}
          className="w-full h-1 rounded-full bg-[var(--color-border-base)] overflow-hidden"
        >
          <div
            className="h-full w-2/5 rounded-full bg-[var(--color-secondary)]"
            style={{ animation: 'loading-slide 1.5s ease-in-out infinite' }}
          />
        </div>

        <div className="text-center w-full">
          <p className="font-bold text-[var(--color-text-primary)] line-clamp-1">{title}</p>
          {subtitle && (
            <p className="text-sm text-[var(--color-text-muted)] italic mt-1">{subtitle}</p>
          )}
        </div>
      </Card>
    </div>
  );
}
