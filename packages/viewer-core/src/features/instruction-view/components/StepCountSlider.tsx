import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { Pencil } from 'lucide-react';

import { Switch } from '@/components/ui';

interface StepCountSliderProps {
  /** Current step count value */
  value: number;
  /** Whether "All" mode is active */
  isAll: boolean;
  /** Current step number (1-indexed) — start of the visible range */
  currentStepNumber: number;
  /** Total number of steps */
  totalSteps: number;
  /** Called when slider value changes */
  onChange: (value: number) => void;
  /** Called when "All" switch is toggled */
  onAllChange: (checked: boolean) => void;
  /** Called when the number label is clicked (opens modal) */
  onNumberClick: () => void;
}

/** Fixed max for the slider range — keeps the control compact */
const SLIDER_MAX = 6;

/**
 * StepCountSlider - Inline slider for adjusting step count filter
 *
 * Three rows: label, range slider, number pill + All switch.
 * Slider always spans 1..6; clamped to totalSteps when fewer.
 * Designed to sit inline with PartToolCards in the flex-wrap grid.
 */
export function StepCountSlider({
  value,
  isAll,
  currentStepNumber,
  totalSteps,
  onChange,
  onAllChange,
  onNumberClick,
}: StepCountSliderProps) {
  const { t } = useTranslation();

  const sliderMax = Math.min(SLIDER_MAX, totalSteps);
  const clampedValue = Math.min(value, sliderMax);
  const isDisabled = isAll || totalSteps <= 1;
  const progress = sliderMax > 1
    ? ((clampedValue - 1) / (sliderMax - 1)) * 100
    : 100;

  // Show the actual step range: "1" when single step, "1-3" for a range, "All" when toggled
  const endStep = isAll ? totalSteps : Math.min(currentStepNumber + value - 1, totalSteps);
  const startStep = isAll ? 1 : currentStepNumber;
  const countDisplay = isAll
    ? t('instructionView.all', 'All')
    : startStep === endStep
      ? String(startStep)
      : `${startStep}-${endStep}`;

  return (
    <div className="flex flex-col justify-between h-22 w-[9.5rem] px-2 py-1.5">
      {/* Row 1: Label */}
      <span className="text-xs text-[var(--color-text-muted)]">
        {t('instructionView.showNextSteps', 'Show next steps')}
      </span>

      {/* Row 2: Slider */}
      <input
        type="range"
        min={1}
        max={sliderMax}
        value={clampedValue}
        disabled={isDisabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={t('instructionView.showNextSteps', 'Show next steps')}
        data-testid="step-count-slider"
        className={clsx(
          'w-full h-1.5 rounded-full appearance-none',
          isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          // Webkit thumb
          '[&::-webkit-slider-thumb]:appearance-none',
          '[&::-webkit-slider-thumb]:w-4',
          '[&::-webkit-slider-thumb]:h-4',
          '[&::-webkit-slider-thumb]:rounded-full',
          '[&::-webkit-slider-thumb]:bg-[var(--color-secondary)]',
          '[&::-webkit-slider-thumb]:shadow-md',
          '[&::-webkit-slider-thumb]:cursor-pointer',
          '[&::-webkit-slider-thumb]:transition-transform',
          '[&::-webkit-slider-thumb]:hover:scale-110',
          // Firefox thumb
          '[&::-moz-range-thumb]:w-4',
          '[&::-moz-range-thumb]:h-4',
          '[&::-moz-range-thumb]:rounded-full',
          '[&::-moz-range-thumb]:bg-[var(--color-secondary)]',
          '[&::-moz-range-thumb]:border-none',
          '[&::-moz-range-thumb]:shadow-md',
          '[&::-moz-range-thumb]:cursor-pointer',
          // Disabled thumb
          isDisabled && '[&::-webkit-slider-thumb]:cursor-not-allowed',
          isDisabled && '[&::-moz-range-thumb]:cursor-not-allowed',
        )}
        style={{
          background: isDisabled
            ? 'var(--color-border-muted)'
            : `linear-gradient(to right, var(--color-secondary) 0%, var(--color-secondary) ${progress}%, var(--color-border-muted) ${progress}%, var(--color-border-muted) 100%)`,
        }}
      />

      {/* Row 3: Number pill + All switch */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onNumberClick}
          className="group inline-flex items-center gap-1.5 rounded-full bg-[var(--color-bg-base)] border border-[var(--color-border-muted)] hover:border-[var(--color-border-base)] hover:bg-[var(--color-bg-elevated)] transition-all cursor-pointer px-3 py-0.5"
          aria-label={`${countDisplay}, ${t('instructionView.clickToEdit', 'click to edit')}`}
        >
          <span className="text-sm font-semibold text-[var(--color-text-base)] tabular-nums">
            {countDisplay}
          </span>
          <Pencil className="w-3 h-3 text-[var(--color-text-subtle)] group-hover:text-[var(--color-secondary)] transition-colors" />
        </button>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[var(--color-text-muted)]">
            {t('instructionView.all', 'All')}
          </span>
          <Switch
            checked={isAll}
            onChange={onAllChange}
            size="sm"
            aria-label={t('instructionView.all', 'All')}
          />
        </div>
      </div>
    </div>
  );
}
