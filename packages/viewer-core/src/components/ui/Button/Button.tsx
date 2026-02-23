import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'
import { TutorialClickIcon } from '../TutorialClickIcon'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  selected?: boolean
  /** Show tutorial highlight (orange border + click icon) */
  tutorialHighlight?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-[var(--color-secondary)] text-[var(--color-accent-text)]',
    'hover:brightness-110',
    'active:brightness-125',
    'focus-visible:ring-[var(--color-secondary)]',
  ].join(' '),
  secondary: [
    'bg-[var(--item-bg)] text-[var(--color-text-base)]',
    'hover:bg-[var(--item-bg-hover)]',
    'active:bg-[var(--item-bg-active)]',
    'focus-visible:ring-[var(--color-border-strong)]',
  ].join(' '),
  ghost: [
    'bg-transparent text-[var(--color-text-base)]',
    'hover:bg-[var(--item-bg-hover)]',
    'active:bg-[var(--item-bg-active)]',
    'focus-visible:ring-[var(--color-border-strong)]',
  ].join(' '),
  danger: [
    'bg-[var(--color-error)] text-white',
    'hover:brightness-110',
    'active:brightness-120',
    'focus-visible:ring-[var(--color-error)]',
  ].join(' '),
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-base gap-2',
  lg: 'h-12 px-6 text-lg gap-2.5',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      selected = false,
      tutorialHighlight = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        aria-pressed={selected}
        className={clsx(
          'relative inline-flex items-center justify-center font-medium',
          'rounded-md',
          'transition-all duration-150',
          'hover:shadow-sm',
          'active:scale-[0.97] active:shadow-none',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
          variantStyles[variant],
          sizeStyles[size],
          selected && variant === 'primary' && '!bg-[var(--color-secondary)] !brightness-110 hover:!brightness-110',
          selected && variant !== 'primary' && variant !== 'danger' && '!bg-[var(--item-bg-selected)] hover:!bg-[var(--item-bg-selected-hover)]',
          tutorialHighlight && 'shadow-[inset_0_0_0_3px_var(--color-tutorial)]',
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
        {tutorialHighlight && <TutorialClickIcon iconPosition="bottom-right" />}
      </button>
    )
  }
)

Button.displayName = 'Button'
