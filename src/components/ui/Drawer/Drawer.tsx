import type { ReactNode, Ref } from 'react';
import { clsx } from 'clsx';

export type DrawerAnchor = 'top' | 'bottom' | 'left' | 'right';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  anchor?: DrawerAnchor;
  /** When true, panel is positioned relative to its parent (popover-style) instead of edge-anchored */
  inline?: boolean;
  className?: string;
  /** Ref forwarded to the panel element */
  panelRef?: Ref<HTMLDivElement>;
  /** Ref forwarded to the backdrop element */
  backdropRef?: Ref<HTMLDivElement>;
}

type AnchorStyleSet = Record<DrawerAnchor, { open: string; closed: string; base: string }>;

const anchorStyles: AnchorStyleSet = {
  top: {
    base: 'top-0 left-0 right-0 rounded-b-2xl border-b border-[var(--color-border-muted)]',
    open: 'translate-y-0',
    closed: '-translate-y-full',
  },
  bottom: {
    base: 'bottom-0 left-0 right-0 rounded-t-2xl border-t border-[var(--color-border-muted)]',
    open: 'translate-y-0',
    closed: 'translate-y-full',
  },
  left: {
    base: 'top-0 left-0 h-full border-r border-[var(--color-border-muted)]',
    open: 'translate-x-0',
    closed: '-translate-x-full',
  },
  right: {
    base: 'top-0 right-0 h-full border-l border-[var(--color-border-muted)]',
    open: 'translate-x-0',
    closed: 'translate-x-full',
  },
};

const inlineAnchorStyles: AnchorStyleSet = {
  top: {
    base: 'bottom-full left-1/2 -translate-x-1/2 mb-1',
    open: '',
    closed: '-translate-y-4 opacity-0 pointer-events-none',
  },
  bottom: {
    base: 'top-full left-1/2 -translate-x-1/2 mt-1',
    open: '',
    closed: 'translate-y-4 opacity-0 pointer-events-none',
  },
  left: {
    base: 'right-full top-1/2 -translate-y-1/2 mr-1',
    open: '',
    closed: '-translate-x-4 opacity-0 pointer-events-none',
  },
  right: {
    base: 'left-full top-1/2 -translate-y-1/2 ml-1',
    open: '',
    closed: 'translate-x-4 opacity-0 pointer-events-none',
  },
};

export function Drawer({ isOpen, onClose, children, anchor = 'bottom', inline = false, className, panelRef, backdropRef }: DrawerProps): ReactNode {
  const styles = inline ? inlineAnchorStyles[anchor] : anchorStyles[anchor];

  return (
    <>
      {/* Backdrop */}
      <div
        ref={backdropRef}
        data-testid="drawer-backdrop"
        className={clsx(
          'fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 will-change-[opacity]',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        data-testid="drawer-panel"
        className={clsx(
          inline ? 'absolute' : 'fixed',
          'z-50 bg-[var(--color-bg-surface)]',
          inline
            ? 'rounded-lg border border-[var(--color-border-muted)] shadow-xl transition-all duration-200 ease-out'
            : 'shadow-[0_-4px_30px_-10px_rgba(0,0,0,0.3)] transition-transform duration-300 ease-out will-change-transform',
          styles.base,
          isOpen ? styles.open : styles.closed,
          className
        )}
      >
        {children}
      </div>
    </>
  );
}
