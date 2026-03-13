import type { ReactNode } from 'react';
import { FileText } from 'lucide-react';

import { Card } from '@/components/ui';
import { ResolvedImageView } from './ResolvedImageView';
import type { ResolvedImage } from '@/lib/mediaResolver';

export interface InstructionHeroBannerProps {
  /** Resolved cover image (url or frameCapture) */
  image?: ResolvedImage | null;
  /** Instruction name */
  instructionName: string;
  /** Article number (optional) */
  articleNumber?: string | null;
  /** Render prop for cover image upload button (edit mode) */
  renderUpload?: () => ReactNode;
}

/**
 * InstructionHeroBanner — compact header card showing instruction identity
 * at the top of the StepOverview drawer.
 */
export function InstructionHeroBanner({
  image,
  instructionName,
  articleNumber,
  renderUpload,
}: InstructionHeroBannerProps) {
  return (
    <Card variant="glass" bordered={false} padding="none" className="overflow-hidden mb-4">
      <div className="flex flex-row items-center h-[6rem]">
        {/* Square thumbnail */}
        <div className="relative w-[6rem] h-[6rem] flex-shrink-0 bg-black overflow-hidden rounded-l-xl">
          {image ? (
            <ResolvedImageView
              image={image}
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
