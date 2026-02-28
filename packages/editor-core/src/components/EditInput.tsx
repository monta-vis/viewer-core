import { forwardRef } from 'react';
import clsx from 'clsx';

const MD_CLASS =
  'w-full px-2 py-1.5 rounded-lg text-sm border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-base)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]';

const SM_CLASS =
  'w-full bg-transparent border-b border-transparent text-[0.65rem] text-[var(--color-text-base)] focus:outline-none focus:border-[var(--color-secondary)] transition-colors';

type EditInputSize = 'sm' | 'md';

interface EditInputOwnProps {
  size?: EditInputSize;
  error?: boolean;
}

export type EditInputProps = EditInputOwnProps & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>;
export type EditTextareaProps = EditInputOwnProps & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>;

export const EditInput = forwardRef<HTMLInputElement, EditInputProps>(
  ({ size = 'md', error = false, className, ...props }, ref) => (
    <input
      ref={ref}
      className={clsx(
        size === 'sm' ? SM_CLASS : MD_CLASS,
        error && 'border-red-500',
        className,
      )}
      {...props}
    />
  ),
);

EditInput.displayName = 'EditInput';

export const EditTextarea = forwardRef<HTMLTextAreaElement, EditTextareaProps>(
  ({ size = 'md', error = false, className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={clsx(
        size === 'sm' ? SM_CLASS : MD_CLASS,
        error && 'border-red-500',
        className,
      )}
      {...props}
    />
  ),
);

EditTextarea.displayName = 'EditTextarea';
