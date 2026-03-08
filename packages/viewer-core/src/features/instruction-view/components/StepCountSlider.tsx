import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { Pencil } from 'lucide-react';
import { AssemblyIcon } from '@/lib/icons';

import { Switch } from '@/components/ui';

interface StepCountSliderProps {
  /** Current step count value */
  value: number;
  /** Whether "All" mode is active */
  isAll: boolean;
  /** Whether assembly filter mode is active */
  isAssembly: boolean;
  /** Whether to show the assembly toggle (needs 2+ assemblies) */
  hasMultipleAssemblies: boolean;
  /** Current step number (1-indexed) — start of the visible range */
  currentStepNumber: number;
  /** Total number of steps */
  totalSteps: number;
  /** Called when slider value changes */
  onChange: (value: number) => void;
  /** Called when "All" switch is toggled */
  onAllChange: (checked: boolean) => void;
  /** Called when assembly switch is toggled */
  onAssemblyChange: (checked: boolean) => void;
  /** Called when the number label is clicked (opens modal) */
  onNumberClick: () => void;
}

/** Fixed max for the slider range — keeps the control compact */
const SLIDER_MAX = 6;

/**
 * StepCountSlider - Inline slider for adjusting step count filter
 *
 * CSS grid: 3 rows × 2 columns.
 *   Row 1: label (left, wraps naturally) | pill button (right)
 *   Row 2: slider (spans both columns)
 *   Row 3: assembly toggle (left)        | All toggle (right)
 */
export function StepCountSlider({
  value,
  isAll,
  isAssembly,
  hasMultipleAssemblies,
  currentStepNumber,
  totalSteps,
  onChange,
  onAllChange,
  onAssemblyChange,
  onNumberClick,
}: StepCountSliderProps) {
  const { t } = useTranslation();

  const sliderMax = Math.min(SLIDER_MAX, totalSteps);
  const clampedValue = Math.min(value, sliderMax);
  const isDisabled = totalSteps <= 1;
  const progress = sliderMax > 1
    ? ((clampedValue - 1) / (sliderMax - 1)) * 100
    : 100;

  // Show the actual step range: "1" when single step, "1-3" for a range, "All" when toggled
  const endStep = isAll ? totalSteps : Math.min(currentStepNumber + value - 1, totalSteps);
  const startStep = isAll ? 1 : currentStepNumber;
  let countDisplay: string;
  if (isAll) {
    countDisplay = t('instructionView.all', 'All');
  } else if (startStep === endStep) {
    countDisplay = String(startStep);
  } else {
    countDisplay = `${startStep}-${endStep}`;
  }

  return (
    <div
      className="flex flex-col h-22 w-[10rem] px-2 py-1 gap-0.5"
    >
      {/* Row 1: Label + hero number */}
      <div className="flex items-baseline justify-between">
        <span
          className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-medium"
          data-testid="step-count-row1"
        >
          {value === 1 && !isAll
            ? t('instructionView.step', 'Step')
            : t('instructionView.steps', 'Steps')}
        </span>

        {/* Hero step range — large, clickable, Montavis cyan */}
        <button
          type="button"
          onClick={onNumberClick}
          className="group flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
          aria-label={`${countDisplay}, ${t('instructionView.clickToEdit', 'click to edit')}`}
        >
          <span
            className="text-xl font-bold tabular-nums whitespace-nowrap tracking-tight text-[var(--color-secondary)] group-hover:text-[var(--color-secondary-hover)] transition-colors"
          >
            {countDisplay}
          </span>
          <Pencil className="w-2.5 h-2.5 text-[var(--color-text-subtle)] opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>

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
          'w-full h-1 rounded-full appearance-none self-center',
          isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          // Webkit thumb
          '[&::-webkit-slider-thumb]:appearance-none',
          '[&::-webkit-slider-thumb]:w-3.5',
          '[&::-webkit-slider-thumb]:h-3.5',
          '[&::-webkit-slider-thumb]:rounded-full',
          '[&::-webkit-slider-thumb]:bg-[var(--color-secondary)]',
          '[&::-webkit-slider-thumb]:shadow-md',
          '[&::-webkit-slider-thumb]:cursor-pointer',
          '[&::-webkit-slider-thumb]:transition-transform',
          '[&::-webkit-slider-thumb]:hover:scale-110',
          // Firefox thumb
          '[&::-moz-range-thumb]:w-3.5',
          '[&::-moz-range-thumb]:h-3.5',
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

      {/* Row 3: Toggles */}
      <div className="flex items-center justify-between mt-auto">
        {hasMultipleAssemblies ? (
          <div className="flex items-center gap-1.5">
            <AssemblyIcon className="w-3.5 h-3.5 text-[var(--color-text-muted)]" aria-hidden="true" />
            <Switch
              checked={isAssembly}
              onChange={onAssemblyChange}
              size="sm"
              aria-label={t('instructionView.filterByAssembly', 'Filter by assembly')}
            />
          </div>
        ) : (
          <div />
        )}

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
