import type { ReactNode } from 'react';
import { FileText } from 'lucide-react';

import { Card } from '@/components/ui';
import { VideoFrameCapture } from './VideoFrameCapture';
import type { FrameCaptureData } from '../utils/resolveRawFrameCapture';

export interface InstructionHeroBannerProps {
  /** Pre-rendered image URL for the instruction cover */
  imageUrl?: string | null;
  /** Raw frame capture data for Editor preview */
  frameCaptureData?: FrameCaptureData | null;
  /** Instruction name */
  instructionName: string;
  /** Article number (optional) */
  articleNumber?: string | null;
  /** Use raw video frame capture instead of pre-rendered image */
  useRawVideo?: boolean;
  /** Render prop for cover image upload button (edit mode) */
  renderUpload?: () => ReactNode;
}

/**
 * InstructionHeroBanner — compact header card showing instruction identity
 * at the top of the StepOverview drawer.
 */
export function InstructionHeroBanner({
  imageUrl,
  frameCaptureData,
  instructionName,
  articleNumber,
  useRawVideo = false,
  renderUpload,
}: InstructionHeroBannerProps) {
  return (
    <Card variant="glass" bordered={false} padding="none" className="overflow-hidden mb-4">
      <div className="flex flex-row items-center h-[6rem]">
        {/* Square thumbnail */}
        <div className="relative w-[6rem] h-[6rem] flex-shrink-0 bg-black overflow-hidden rounded-l-xl">
          {useRawVideo && frameCaptureData ? (
            <VideoFrameCapture
              videoId={frameCaptureData.videoId}
              fps={frameCaptureData.fps}
              frameNumber={frameCaptureData.frameNumber}
              cropArea={frameCaptureData.cropArea}
              videoSrc={frameCaptureData.videoSrc}
              alt={instructionName}
              className="w-full h-full object-cover"
            />
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt={instructionName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--color-text-subtle)]">
              <FileText className="w-8 h-8 opacity-40" />
            </div>
          )}
          {renderUpload?.()}
        </div>

        {/* Info */}
        <div className="flex-1 px-4 min-w-0">
          <p className="text-sm font-semibold text-[var(--color-text-base)] truncate">
            {instructionName}
          </p>
          {articleNumber && (
            <p className="text-xs text-[var(--color-text-muted)] font-mono truncate mt-0.5">
              {articleNumber}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
