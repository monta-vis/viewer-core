import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from 'react'
import { clsx } from 'clsx'

export type IconButtonVariant = 'default' | 'primary' | 'ghost' | 'danger'
export type IconButtonSize = 'sm' | 'md' | 'lg'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  'aria-label': string
  variant?: IconButtonVariant
  size?: IconButtonSize
  selected?: boolean
}

const variantStyles: Record<IconButtonVariant, string> = {
  default: [
    'bg-[var(--item-bg)] text-[var(--color-text-base)]',
    'hover:bg-[var(--item-bg-hover)]',
    'active:bg-[var(--item-bg-active)]',
    'focus-visible:ring-[var(--color-border-strong)]',
  ].join(' '),
  primary: [
    'bg-[var(--item-accent-bg)] text-[var(--color-accent-text)]',
    'hover:bg-[var(--item-accent-bg-hover)]',
    'active:bg-[var(--item-accent-bg-active)]',
    'focus-visible:ring-[var(--color-secondary)]',
  ].join(' '),
  ghost: [
    'bg-transparent text-[var(--color-text-muted)]',
    'hover:bg-[var(--item-bg-hover)] hover:text-[var(--color-text-base)]',
    'active:bg-[var(--item-bg-active)]',
    'focus-visible:ring-[var(--color-border-strong)]',
  ].join(' '),
  danger: [
    'bg-transparent text-[var(--color-error)]',
    'hover:bg-[var(--color-error)]/10',
    'active:bg-[var(--color-error)]/20',
    'focus-visible:ring-[var(--color-error)]',
  ].join(' '),
}

// Size styles - WCAG 2.5.5 requires minimum 44x44px (2.75rem) touch targets
// sm/md now use 2.75rem (44px) minimum, lg uses 3rem (48px)
const sizeStyles: Record<IconButtonSize, string> = {
  sm: 'h-11 w-11 [&>svg]:h-4 [&>svg]:w-4',    // 2.75rem = 44px (WCAG minimum)
  md: 'h-11 w-11 [&>svg]:h-5 [&>svg]:w-5',    // 2.75rem = 44px (WCAG minimum)
  lg: 'h-12 w-12 [&>svg]:h-6 [&>svg]:w-6',    // 3rem = 48px
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      'aria-label': ariaLabel,
      variant = 'default',
      size = 'md',
      selected = false,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={ariaLabel}
        aria-pressed={selected}
        className={clsx(
          'inline-flex items-center justify-center',
          'rounded-md',
          'transition-all duration-150',
          'hover:shadow-sm',
          'active:scale-[0.97] active:shadow-none',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
          variantStyles[variant],
          sizeStyles[size],
          selected && variant === 'primary' && '!bg-[var(--item-accent-bg-selected)] hover:!bg-[var(--item-accent-bg-selected)]',
          selected && variant !== 'primary' && variant !== 'danger' && '!bg-[var(--item-bg-selected)] hover:!bg-[var(--item-bg-selected-hover)]',
          className
        )}
        disabled={disabled}
        {...props}
      >
        {icon}
      </button>
    )
  }
)

IconButton.displayName = 'IconButton'
