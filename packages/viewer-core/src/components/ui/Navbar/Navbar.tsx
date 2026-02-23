import type { ReactNode } from 'react';
import { clsx } from 'clsx';

export interface NavbarProps {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  className?: string;
}

export function Navbar({ left, center, right, className }: NavbarProps) {
  return (
    <header
      className={clsx(
        'relative h-16 w-full',
        'bg-gradient-to-r from-[var(--color-bg-surface)] via-[var(--color-bg-base)] to-[var(--color-bg-surface)]',
        'flex items-center justify-between',
        'px-4 lg:px-6',
        'sticky top-0 z-50',
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-shrink-0 h-full">
        {left}
      </div>
      <div className="flex items-center flex-1 min-w-0 px-4">
        {center}
      </div>
      <div className="flex items-center gap-3 min-w-0 flex-shrink-0 h-full">
        {right}
      </div>
    </header>
  );
}
