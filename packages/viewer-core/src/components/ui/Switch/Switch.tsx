import { clsx } from 'clsx';

export interface SwitchProps {
  /** Whether the switch is on */
  checked: boolean;
  /** Called when the switch is toggled */
  onChange: (checked: boolean) => void;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Disabled state */
  disabled?: boolean;
  /** Accessible label */
  'aria-label'?: string;
  /** ID for form association */
  id?: string;
}

/**
 * Switch - A toggle switch component
 */
export function Switch({
  checked,
  onChange,
  size = 'md',
  disabled = false,
  'aria-label': ariaLabel,
  id,
}: SwitchProps) {
  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!disabled) {
        onChange(!checked);
      }
    }
  };

  const sizes = {
    sm: {
      track: 'w-8 h-4',
      thumb: 'w-3 h-3',
      translate: 'translate-x-4',
    },
    md: {
      track: 'w-10 h-5',
      thumb: 'w-4 h-4',
      translate: 'translate-x-5',
    },
  };

  const s = sizes[size];

  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={clsx(
        'relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-secondary)] focus-visible:ring-offset-2',
        s.track,
        checked
          ? 'bg-[var(--color-secondary)]'
          : 'bg-[var(--color-bg-elevated)] border border-[var(--color-border-base)]',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        className={clsx(
          'pointer-events-none inline-block rounded-full bg-white shadow-sm transition-transform duration-200',
          s.thumb,
          'absolute top-1/2 -translate-y-1/2',
          checked ? s.translate : 'translate-x-0.5'
        )}
      />
    </button>
  );
}
