/**
 * Spinner - Unified loading indicator for Montavis Creator
 *
 * Industrial-minimal design: clean arc spinner with subtle track.
 * Fits the manufacturing/assembly context of the app.
 */
import { type HTMLAttributes } from 'react';
import clsx from 'clsx';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  /** Size variant */
  size?: SpinnerSize;
  /** Accessible label for screen readers */
  label?: string;
  /** Use light variant (for dark overlays) */
  light?: boolean;
}

/** Size configuration in rem */
const sizes: Record<SpinnerSize, { size: string; border: string }> = {
  xs: { size: '0.875rem', border: '2px' },  // 14px - inline/buttons
  sm: { size: '1.25rem', border: '2px' },   // 20px - small contexts
  md: { size: '1.5rem', border: '2.5px' },  // 24px - default
  lg: { size: '2rem', border: '3px' },      // 32px - cards/dialogs
  xl: { size: '2.5rem', border: '3px' },    // 40px - full page
};

/**
 * Spinner component with Montavis brand styling
 *
 * @example
 * // Default medium spinner
 * <Spinner />
 *
 * @example
 * // Small spinner with label
 * <Spinner size="sm" label="Loading data..." />
 *
 * @example
 * // Large light spinner (for dark overlays)
 * <Spinner size="lg" light />
 */
export function Spinner({
  size = 'md',
  label,
  light = false,
  className,
  ...props
}: SpinnerProps) {
  const { size: dimension, border } = sizes[size];

  const accessibleLabel = label || 'Loading';

  return (
    <div
      role="status"
      aria-label={accessibleLabel}
      className={clsx('inline-flex items-center justify-center', className)}
      {...props}
    >
      <div
        className={clsx(
          'rounded-full',
          light ? 'border-white/20' : 'border-[var(--color-border)]',
          light ? 'border-t-white' : 'border-t-[var(--color-primary)]'
        )}
        style={{
          width: dimension,
          height: dimension,
          borderWidth: border,
          borderStyle: 'solid',
          animation: 'montavis-spin 0.75s linear infinite',
        }}
      />
      <span className="sr-only">{accessibleLabel}</span>
    </div>
  );
}

// Export size type for external use
export type { SpinnerProps };
