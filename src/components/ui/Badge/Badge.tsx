import { type HTMLAttributes, forwardRef, type ReactNode } from 'react'
import { clsx } from 'clsx'

export type BadgeVariant = 'default' | 'primary' | 'accent' | 'error' | 'success' | 'warning'
export type BadgeSize = 'sm' | 'md'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode
  variant?: BadgeVariant
  size?: BadgeSize
  icon?: ReactNode
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-[var(--color-bg-surface)] text-[var(--color-text-base)]',
  primary: 'bg-[var(--color-secondary)]/20 text-[var(--color-secondary)]',
  accent: 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]',
  error: 'bg-[var(--color-error)]/20 text-[var(--color-error)]',
  success: 'bg-[var(--color-video-section)]/20 text-[var(--color-video-section)]',
  warning: 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]',
}

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'h-5 px-1.5 text-xs gap-1',
  md: 'h-6 px-2 text-sm gap-1.5',
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, variant = 'default', size = 'md', icon, className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={clsx(
          'inline-flex items-center font-medium',
          'rounded-full',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {icon && <span className="flex-shrink-0 [&>svg]:h-3 [&>svg]:w-3">{icon}</span>}
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

export interface NumberBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  value: number
  variant?: BadgeVariant
}

export const NumberBadge = forwardRef<HTMLSpanElement, NumberBadgeProps>(
  ({ value, variant = 'primary', className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={clsx(
          'inline-flex items-center justify-center',
          'min-w-6 h-6 px-1.5',
          'text-sm font-semibold',
          'rounded-full',
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {value}
      </span>
    )
  }
)

NumberBadge.displayName = 'NumberBadge'
