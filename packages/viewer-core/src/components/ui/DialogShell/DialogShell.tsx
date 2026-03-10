import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

function useVisualViewport() {
  const [viewport, setViewport] = useState(() => ({
    height: window.visualViewport?.height ?? window.innerHeight,
    offsetTop: window.visualViewport?.offsetTop ?? 0,
  }));

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      setViewport({ height: vv.height, offsetTop: vv.offsetTop });
    };

    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return viewport;
}

export interface DialogShellProps {
  /** Whether the dialog is visible. */
  open: boolean;
  /** Called when the user clicks the backdrop or presses Escape. */
  onClose: () => void;
  /** Tailwind max-width class for the panel (default: `max-w-lg`). */
  maxWidth?: string;
  /** Apply backdrop-blur to the overlay. */
  blur?: boolean;
  /** When true, clicking the backdrop does not call onClose. */
  disableBackdropClick?: boolean;
  /** Additional class names applied to the panel element. */
  className?: string;
  children: ReactNode;
}

export function DialogShell({
  open,
  onClose,
  maxWidth = 'max-w-lg',
  blur = true,
  disableBackdropClick,
  className,
  children,
}: DialogShellProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [open, handleKeyDown]);

  const { height, offsetTop } = useVisualViewport();

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      data-testid="dialog-shell-backdrop"
      className={clsx(
        'fixed left-0 right-0 z-50 flex items-center justify-center bg-black/50',
        blur && 'backdrop-blur-sm',
      )}
      style={{ top: `${offsetTop}px`, height: `${height}px` }}
      onClick={disableBackdropClick ? undefined : onClose}
    >
      <div
        data-testid="dialog-shell-panel"
        className={clsx(
          'bg-[var(--color-bg-base)] border border-[var(--color-border-muted)] rounded-xl shadow-2xl w-full mx-4 p-6',
          maxWidth,
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
