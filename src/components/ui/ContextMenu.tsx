import { useRef } from 'react';
import { clsx } from 'clsx';
import { useMenuClose } from '@/hooks';

interface ContextMenuProps {
  position: { x: number; y: number };
  onClose: () => void;
  children: React.ReactNode;
  /** Minimum width class (default: min-w-[14rem]) */
  minWidth?: string;
}

/**
 * Shared context menu shell with click-outside + Escape handling.
 * Renders a positioned menu container. Pass menu items as children.
 */
export function ContextMenu({
  position,
  onClose,
  children,
  minWidth = 'min-w-[14rem]',
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  useMenuClose(menuRef, onClose);

  return (
    <div
      ref={menuRef}
      className={clsx(
        'fixed z-50 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border-base)] shadow-lg py-1',
        minWidth,
      )}
      style={{ left: position.x, top: position.y }}
      role="menu"
    >
      {children}
    </div>
  );
}

interface ContextMenuItemProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

/**
 * Single item inside a ContextMenu.
 */
export function ContextMenuItem({
  onClick,
  children,
  className,
  disabled,
}: ContextMenuItemProps) {
  return (
    <button
      className={clsx(
        'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
        disabled
          ? 'opacity-40 cursor-default'
          : 'text-[var(--color-text-base)] hover:bg-[var(--item-bg-hover)]',
        className,
      )}
      onClick={onClick}
      disabled={disabled}
      role="menuitem"
    >
      {children}
    </button>
  );
}
