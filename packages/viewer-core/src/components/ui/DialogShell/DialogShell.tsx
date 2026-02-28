import { useEffect, useCallback, type ReactNode } from 'react';
import clsx from 'clsx';

export interface DialogShellProps {
  /** Whether the dialog is visible. */
  open: boolean;
  /** Called when the user clicks the backdrop or presses Escape. */
  onClose: () => void;
  /** Tailwind max-width class for the panel (default: `max-w-lg`). */
  maxWidth?: string;
  /** Apply backdrop-blur to the overlay. */
  blur?: boolean;
  /** Additional class names applied to the panel element. */
  className?: string;
  children: ReactNode;
}

export function DialogShell({
  open,
  onClose,
  maxWidth = 'max-w-lg',
  blur = false,
  className,
  children,
}: DialogShellProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="dialog-shell-backdrop"
      className={clsx(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/50',
        blur && 'backdrop-blur-sm',
      )}
      onClick={onClose}
    >
      <div
        data-testid="dialog-shell-panel"
        className={clsx(
          'bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-xl shadow-2xl w-full mx-4 p-6',
          maxWidth,
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
