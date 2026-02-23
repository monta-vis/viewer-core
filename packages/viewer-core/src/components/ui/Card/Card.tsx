import { type HTMLAttributes, forwardRef, type ReactNode } from 'react'
import { clsx } from 'clsx'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** Makes the card clickable with hover/press effects */
  interactive?: boolean
  /** Shows selected state */
  selected?: boolean
  /** Inner padding */
  padding?: 'none' | 'sm' | 'md' | 'lg'
  /** Visual variant */
  variant?: 'default' | 'elevated' | 'ghost' | 'glass'
  /** Show border */
  bordered?: boolean
}

const paddingStyles = {
  none: '',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6',
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      interactive = false,
      selected = false,
      padding = 'md',
      variant = 'default',
      bordered = true,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        aria-selected={selected}
        className={clsx(
          'rounded-2xl',
          paddingStyles[padding],

          // Border
          bordered && 'border border-[var(--color-border-base)]',

          // Variant styles
          variant === 'default' && 'bg-[var(--color-bg-surface)]',
          variant === 'elevated' && [
            'bg-[var(--color-bg-elevated)]',
            'shadow-lg',
          ],
          variant === 'ghost' && 'bg-transparent',
          variant === 'glass' && [
            'bg-white/[0.06]',
            'backdrop-blur-xl',
            'shadow-[0_8px_32px_rgba(0,0,0,0.12)]',
          ],

          // Interactive state-of-the-art effects
          interactive && [
            'cursor-pointer',
            'transition-all duration-150 ease-out',
            // Hover: lift up with shadow
            'hover:shadow-xl',
            'hover:-translate-y-0.5',
            variant !== 'glass' && 'hover:bg-[var(--item-bg-hover)]',
            variant === 'glass' && 'hover:bg-white/[0.10]',
            bordered && variant !== 'glass' && 'hover:border-[var(--color-border-strong)]',
            // Active/Press: push down effect
            'active:translate-y-0',
            'active:shadow-md',
            'active:scale-[0.98]',
            variant !== 'glass' && 'active:bg-[var(--item-bg-active)]',
            variant === 'glass' && 'active:bg-white/[0.14]',
            // Focus
            'focus:outline-none focus-visible:outline-none',
          ],

          // Selected state
          selected && variant !== 'glass' && [
            'bg-[var(--item-bg-selected)]',
            'border-[var(--item-accent-bg)]',
            'ring-2 ring-[var(--item-accent-bg)]',
          ],
          selected && variant === 'glass' && [
            'bg-white/[0.12]',
            'ring-2 ring-[var(--color-secondary)]/40',
          ],
          selected && interactive && variant !== 'glass' && [
            'hover:bg-[var(--item-bg-selected-hover)]',
          ],
          selected && interactive && variant === 'glass' && [
            'hover:bg-white/[0.16]',
          ],

          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function CardHeader({ children, className, ...props }: CardHeaderProps) {
  return (
    <div
      className={clsx('flex items-center justify-between mb-3', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode
}

export function CardTitle({ children, className, ...props }: CardTitleProps) {
  return (
    <h3
      className={clsx('text-base font-semibold text-[var(--color-text-base)]', className)}
      {...props}
    >
      {children}
    </h3>
  )
}

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function CardContent({ children, className, ...props }: CardContentProps) {
  return (
    <div className={clsx('text-sm text-[var(--color-text-muted)]', className)} {...props}>
      {children}
    </div>
  )
}
