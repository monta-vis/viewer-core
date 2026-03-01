import type { ReactNode } from 'react';
import { clsx } from 'clsx';
import { Check } from 'lucide-react';

export interface OptionButtonProps {
  /** Whether this option is currently selected. */
  active: boolean;
  /** Click handler. */
  onClick: () => void;
  /** Button label content. */
  children: ReactNode;
  /** Show a check icon when active (default: false). */
  showCheck?: boolean;
  /** Optional leading icon. */
  icon?: ReactNode;
  /** Additional class names. */
  className?: string;
}

const activeClass =
  'border-[var(--color-secondary)] bg-[var(--color-secondary)]/10 text-[var(--color-text-base)]';
const inactiveClass =
  'border-[var(--color-border-base)] bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-base)]';

export function OptionButton({
  active,
  onClick,
  children,
  showCheck = false,
  icon,
  className,
}: OptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex items-center justify-between px-3 py-2 rounded-lg text-sm',
        'border transition-all duration-150',
        active ? activeClass : inactiveClass,
        className,
      )}
    >
      <span className="flex items-center gap-2">
        {icon}
        {children}
      </span>
      {showCheck && active && (
        <Check className="w-4 h-4 text-[var(--color-secondary)]" />
      )}
    </button>
  );
}
