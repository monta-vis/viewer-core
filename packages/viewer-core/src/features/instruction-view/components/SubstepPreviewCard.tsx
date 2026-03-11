import { Card } from '@/components/ui';
import { VideoFrameCapture } from './VideoFrameCapture';
import type { FrameCaptureData } from '../utils/resolveRawFrameCapture';

interface SubstepPreviewCardProps {
  /** Substep display order (1-based) */
  order: number;
  /** Substep title — falls back to order number */
  title: string | null;
  /** Pre-rendered thumbnail URL */
  imageUrl?: string | null;
  /** Raw frame capture data for Editor preview */
  frameCaptureData?: FrameCaptureData | null;
  /** Use raw video frame capture instead of pre-rendered image */
  useRawVideo?: boolean;
  /** Called when card is clicked */
  onClick?: () => void;
}

/**
 * SubstepPreviewCard - Compact read-only card for the expanded substep area.
 * Shows a small square thumbnail on top with substep order/title below.
 */
export function SubstepPreviewCard({
  order,
  title,
  imageUrl,
  frameCaptureData,
  useRawVideo = false,
  onClick,
}: SubstepPreviewCardProps) {
  const label = title || String(order);

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      interactive
      variant="glass"
      bordered={false}
      padding="none"
      className="overflow-hidden"
    >
      {/* Thumbnail */}
      <div className="aspect-square bg-black overflow-hidden rounded-t-xl">
        {useRawVideo && frameCaptureData ? (
          <VideoFrameCapture
            videoId={frameCaptureData.videoId}
            fps={frameCaptureData.fps}
            frameNumber={frameCaptureData.frameNumber}
            cropArea={frameCaptureData.cropArea}
            videoSrc={frameCaptureData.videoSrc}
            alt={label}
            className="w-full h-full object-contain"
          />
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={label}
            loading="lazy"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--color-text-subtle)]">
            <span className="text-2xl font-bold opacity-30">{order}</span>
          </div>
        )}
      </div>

      {/* Label */}
      <div className="px-2 py-1.5 text-center">
        <p className="text-xs text-[var(--color-text-base)] truncate">
          {label}
        </p>
      </div>
    </Card>
  );
}
