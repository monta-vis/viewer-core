import { useCallback, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

import { Drawer } from '@/components/ui';
import { useVideo } from '@/features/video-player';

const SPEED_PRESETS = [0.5, 1, 1.5, 2] as const;
const round1 = (v: number) => Math.round(v * 10) / 10;

interface SpeedDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Ref for the drawer panel element (for swipe gesture DOM manipulation) */
  panelRef?: React.Ref<HTMLDivElement>;
  /** Ref for the backdrop element (for swipe gesture DOM manipulation) */
  backdropRef?: React.Ref<HTMLDivElement>;
}

/**
 * SpeedDrawer - Bottom-edge drawer with continuous speed slider
 *
 * Controls global playback speed (0.3x–2.5x) via VideoContext.
 * Opened by swiping up from the bottom edge of the screen.
 */
export function SpeedDrawer({ isOpen, onClose, panelRef, backdropRef }: SpeedDrawerProps) {
  const { t } = useTranslation();
  const { playbackSpeed, setPlaybackSpeed } = useVideo();
  const [rawSlider, setRawSlider] = useState<number | null>(null);
  const isDragging = useRef(false);

  const sliderValue = rawSlider ?? playbackSpeed;
  const displayValue = round1(sliderValue);

  const handleSpeedChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = parseFloat(e.target.value);
      isDragging.current = true;
      setRawSlider(raw);
      setPlaybackSpeed(round1(raw));
    },
    [setPlaybackSpeed]
  );

  const handleSliderEnd = useCallback(() => {
    isDragging.current = false;
    setRawSlider(null);
  }, []);

  return (
    <Drawer isOpen={isOpen} onClose={onClose} anchor="bottom" panelRef={panelRef} backdropRef={backdropRef}>
      <div className="px-6 py-4">
        {/* Speed label */}
        <div className="text-center mb-3">
          <span className="text-2xl font-bold text-[var(--color-text-base)]">
            {displayValue.toFixed(1)}x
          </span>
        </div>

        {/* Slider with min/max labels */}
        <div className="flex items-center gap-3">
          <span className="text-lg font-medium text-[var(--color-text-muted)] shrink-0">0.3x</span>
          <input
            type="range"
            min={0.3}
            max={2.5}
            step="any"
            value={sliderValue}
            onChange={handleSpeedChange}
            onMouseUp={handleSliderEnd}
            onTouchEnd={handleSliderEnd}
            className="flex-1 h-2 rounded-full appearance-none cursor-pointer accent-[var(--color-secondary)] bg-[var(--color-border-base)]"
            aria-label={t('instructionView.playbackSpeed', 'Playback speed')}
          />
          <span className="text-lg font-medium text-[var(--color-text-muted)] shrink-0">2.5x</span>
        </div>

        {/* Speed preset buttons */}
        <div className="flex justify-center gap-3 mt-3">
          {SPEED_PRESETS.map((preset) => {
            const isActive = Math.abs(playbackSpeed - preset) < 0.03;

            return (
              <button
                key={preset}
                type="button"
                onClick={() => setPlaybackSpeed(preset)}
                aria-label={t('instructionView.setSpeedTo', { speed: preset, defaultValue: `Set speed to ${preset}x` })}
                className={clsx(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[var(--color-secondary)] text-white'
                    : 'bg-[var(--item-bg)] text-[var(--color-text-muted)]'
                )}
              >
                {preset}x
              </button>
            );
          })}
        </div>
      </div>
    </Drawer>
  );
}
