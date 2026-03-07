/**
 * LogoSpinner - Branded loading spinner using the Montavis swirl logo
 *
 * Rotates the teal swirl mark for a distinctive branded loading state.
 * Uses the existing montavis-spin keyframes from theme.css.
 */
import { type HTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import type { SpinnerSize } from '../Spinner';

export interface LogoSpinnerProps extends HTMLAttributes<HTMLDivElement> {
  /** Size variant */
  size?: SpinnerSize;
  /** Accessible label for screen readers */
  label?: string;
}

const sizes: Record<SpinnerSize, string> = {
  xs: '0.875rem',
  sm: '1.25rem',
  md: '1.5rem',
  lg: '2rem',
  xl: '2.5rem',
};

export function LogoSpinner({
  size = 'md',
  label,
  className,
  ...props
}: LogoSpinnerProps) {
  const { t } = useTranslation();
  const dimension = sizes[size];
  const accessibleLabel = label || t('common.loading', 'Loading...');

  return (
    <div
      role="status"
      aria-label={accessibleLabel}
      className={clsx('inline-flex items-center justify-center', className)}
      {...props}
    >
      <svg
        viewBox="0 0 51.73 50.34"
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
        style={{
          width: dimension,
          height: dimension,
          color: 'var(--color-secondary)',
          animation: 'montavis-spin 1.2s linear infinite',
        }}
      >
        <path
          fillRule="evenodd"
          d="M44.93,33.49c-.36.31-.73.59-1.11.86l-.25-.12c1.45-6.99-.2-14.54-5.16-20.43-4.74-5.63-11.52-8.56-18.36-8.62l-.11-.29c.17-.15.35-.31.53-.45,8.05-6.73,20.06-5.69,26.82,2.34,6.76,8.02,5.71,19.98-2.35,26.71ZM14.23,34.4c8,9.5,22.21,10.74,31.75,2.77.65-.54,1.25-1.11,1.82-1.7l.35.19c-1.51,3.3-3.76,6.32-6.73,8.81-10.67,8.91-26.57,7.53-35.52-3.1C-3.05,30.74-1.66,14.9,9.01,5.98c2.62-2.19,5.55-3.76,8.62-4.72.42-.13.85-.25,1.28-.36l.16.34c-.35.23-.7.48-1.05.74-.34.26-.68.52-1.01.8-9.53,7.97-10.78,22.13-2.78,31.63ZM40.09,35.05c-6.35-.36-12.55-3.24-16.96-8.48-4.42-5.25-6.18-11.83-5.43-18.13l-.23-.06c-3.73,6.61-3.19,15.11,2,21.26,5.17,6.14,13.45,8.15,20.63,5.67v-.26Z"
        />
      </svg>
      <span className="sr-only">{accessibleLabel}</span>
    </div>
  );
}
