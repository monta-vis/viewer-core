import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'
import { Check } from 'lucide-react'

export type ColorSwatchSize = 'sm' | 'md' | 'lg'

export interface ColorSwatchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  /** The color to display (CSS color value) */
  color: string
  /** Whether this swatch is currently selected */
  selected?: boolean
  /** Size of the swatch */
  size?: ColorSwatchSize
  /** Accessible label for the color */
  'aria-label': string
}

const sizeStyles: Record<ColorSwatchSize, { swatch: string; check: string }> = {
  sm: { swatch: 'h-6 w-6', check: 'h-3 w-3' },
  md: { swatch: 'h-8 w-8', check: 'h-4 w-4' },
  lg: { swatch: 'h-10 w-10', check: 'h-5 w-5' },
}

export const ColorSwatch = forwardRef<HTMLButtonElement, ColorSwatchProps>(
  (
    {
      color,
      selected = false,
      size = 'md',
      'aria-label': ariaLabel,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const styles = sizeStyles[size]

    return (
      <button
        ref={ref}
        type="button"
        role="radio"
        aria-checked={selected}
        aria-label={ariaLabel}
        className={clsx(
          'relative rounded-full',
          'transition-all duration-150',
          'active:scale-[0.92]',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'focus-visible:ring-[var(--color-border-strong)]',
          'ring-offset-[var(--color-bg-secondary)]',
          'border border-[var(--color-border-base)]',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
          // Selected state: larger ring
          selected && 'ring-2 ring-[var(--color-text-primary)]',
          // Hover state when not selected
          !selected && !disabled && 'hover:ring-2 hover:ring-[var(--color-border-base)]',
          styles.swatch,
          className
        )}
        style={{ backgroundColor: color }}
        disabled={disabled}
        {...props}
      >
        {/* Checkmark for selected state */}
        {selected && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Check
              className={clsx(
                styles.check,
                // Use contrasting color based on luminance
                'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]'
              )}
              strokeWidth={3}
            />
          </span>
        )}
      </button>
    )
  }
)

ColorSwatch.displayName = 'ColorSwatch'
