import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';

interface StepRangeSliderProps {
  /** Minimum value (usually 1) */
  min: number;
  /** Maximum value (total steps) */
  max: number;
  /** Current value */
  value: number;
  /** Called when value changes */
  onChange: (value: number) => void;
  /** Optional label override */
  label?: string;
}

/**
 * StepRangeSlider - Slider to filter parts/tools by step range
 *
 * Shows "Steps 1 to X" and allows filtering cumulative amounts.
 */
export function StepRangeSlider({
  min,
  max,
  value,
  onChange,
  label,
}: StepRangeSliderProps) {
  const { t } = useTranslation();

  // Calculate progress percentage for styling
  const progress = max > min ? ((value - min) / (max - min)) * 100 : 100;

  return (
    <div className="flex flex-col gap-2">
      {/* Label */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--color-text-muted)]">
          {label ?? t('instructionView.showPartsToolsForSteps', 'Show parts/tools for steps')}
        </span>
        <span className="font-medium text-[var(--color-text-base)]">
          {value === max
            ? t('instructionView.allSteps', 'All steps')
            : t('instructionView.stepsRange', '1 - {{count}}', { count: value })}
        </span>
      </div>

      {/* Slider */}
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={clsx(
            'w-full h-2 rounded-full appearance-none cursor-pointer',
            'bg-[var(--color-bg-surface)]',
            // Webkit (Chrome, Safari, Edge)
            '[&::-webkit-slider-thumb]:appearance-none',
            '[&::-webkit-slider-thumb]:w-5',
            '[&::-webkit-slider-thumb]:h-5',
            '[&::-webkit-slider-thumb]:rounded-full',
            '[&::-webkit-slider-thumb]:bg-[var(--color-secondary)]',
            '[&::-webkit-slider-thumb]:shadow-md',
            '[&::-webkit-slider-thumb]:cursor-pointer',
            '[&::-webkit-slider-thumb]:transition-transform',
            '[&::-webkit-slider-thumb]:hover:scale-110',
            // Firefox
            '[&::-moz-range-thumb]:w-5',
            '[&::-moz-range-thumb]:h-5',
            '[&::-moz-range-thumb]:rounded-full',
            '[&::-moz-range-thumb]:bg-[var(--color-secondary)]',
            '[&::-moz-range-thumb]:border-none',
            '[&::-moz-range-thumb]:shadow-md',
            '[&::-moz-range-thumb]:cursor-pointer'
          )}
          style={{
            background: `linear-gradient(to right, var(--color-secondary) 0%, var(--color-secondary) ${progress}%, var(--color-bg-surface) ${progress}%, var(--color-bg-surface) 100%)`,
          }}
        />

        {/* Step markers */}
        {max <= 10 && (
          <div className="absolute top-4 left-0 right-0 flex justify-between px-2.5 pointer-events-none">
            {Array.from({ length: max - min + 1 }, (_, i) => (
              <div
                key={i + min}
                className={clsx(
                  'w-1 h-1 rounded-full',
                  i + min <= value
                    ? 'bg-[var(--color-secondary)]'
                    : 'bg-[var(--color-border)]'
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
