import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui';
import { VideoFrameCapture } from './VideoFrameCapture';
import type { FrameCaptureData } from '../utils/resolveRawFrameCapture';

interface StepOverviewCardProps {
  /** Step number (1-based) */
  stepNumber: number;
  /** Step title */
  title: string | null;
  /** Step description - what needs to be done */
  description: string | null;
  /** Number of substeps in this step */
  substepCount: number;
  /** Pre-rendered image URL (for exported VideoFrameArea mode) */
  previewImageUrl?: string | null;
  /** Use raw video frame capture instead of pre-rendered image. Default: false */
  useRawVideo?: boolean;
  /** Raw frame capture data with resolved videoSrc (for Editor preview) */
  frameCaptureData?: FrameCaptureData | null;
  /** Called when card is clicked */
  onClick?: () => void;
}

/**
 * StepOverviewCard - Horizontal card showing a step preview in the overview grid
 *
 * Displays a square thumbnail on the left with step number, description, and substep count on the right.
 */
export function StepOverviewCard({
  stepNumber,
  title,
  description,
  substepCount,
  previewImageUrl,
  useRawVideo = false,
  frameCaptureData,
  onClick,
}: StepOverviewCardProps) {
  const { t } = useTranslation();

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      interactive
      variant="glass"
      bordered={false}
      padding="none"
      className="overflow-hidden group"
    >
      <div className="flex flex-row">
        {/* Thumbnail — 1:1 square, left side */}
        <div className="relative w-[40%] flex-shrink-0 aspect-square bg-black overflow-hidden rounded-l-xl">
          {useRawVideo && frameCaptureData ? (
            <VideoFrameCapture
              videoId={frameCaptureData.videoId}
              fps={frameCaptureData.fps}
              frameNumber={frameCaptureData.frameNumber}
              cropArea={frameCaptureData.cropArea}
              videoSrc={frameCaptureData.videoSrc}
              alt={title || `${t('instructionView.step', 'Step')} ${stepNumber}`}
              className="w-full h-full object-contain"
            />
          ) : previewImageUrl ? (
            <img
              src={previewImageUrl}
              alt={title || `${t('instructionView.step', 'Step')} ${stepNumber}`}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--color-text-subtle)]">
              <svg
                className="w-10 h-10 opacity-40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Info — right side */}
        <div className="flex-1 p-4 flex flex-col justify-center min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[var(--color-secondary)]">
              {stepNumber}
            </span>
            {title && (
              <span className="text-base font-semibold text-[var(--color-text)] truncate">
                {title}
              </span>
            )}
          </div>

          {description && (
            <p className="text-sm text-[var(--color-text-muted)] line-clamp-2 leading-relaxed mt-1">
              {description}
            </p>
          )}

          <p className="text-xs text-[var(--color-text-subtle)] mt-2">
            {t('instructionView.substepCount', '{{count}} Substeps', { count: substepCount })}
          </p>
        </div>
      </div>
    </Card>
  );
}
