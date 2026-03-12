import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';

import { Card, IconButton, ConfirmDeleteDialog } from '@/components/ui';
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
  /** Substep ID — used for delete callbacks */
  substepId?: string;
  /** Called when card is clicked */
  onClick?: () => void;
  /** Whether edit mode is active */
  editMode?: boolean;
  /** Called when the substep should be deleted */
  onDeleteSubstep?: (substepId: string) => void;
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
  substepId,
  onClick,
  editMode = false,
  onDeleteSubstep,
}: SubstepPreviewCardProps) {
  const { t } = useTranslation();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
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
      <div className="relative aspect-square bg-black overflow-hidden rounded-t-xl">
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

        {/* Delete button (edit mode only) */}
        {editMode && onDeleteSubstep && substepId && (
          <div className="absolute top-1 right-1 z-10" onClick={(e) => e.stopPropagation()}>
            <IconButton
              variant="danger"
              size="sm"
              icon={<Trash2 />}
              aria-label={t('editorCore.deleteSubstep', 'Delete substep')}
              onClick={() => setConfirmDeleteOpen(true)}
            />
          </div>
        )}
      </div>

      {/* Label */}
      <div className="px-2 py-1.5 text-center">
        <p className="text-xs text-[var(--color-text-base)] truncate">
          {label}
        </p>
      </div>

      {/* Confirm delete substep dialog */}
      <ConfirmDeleteDialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => { if (substepId) onDeleteSubstep?.(substepId); }}
        title={t('editorCore.deleteSubstepConfirmTitle', 'Delete substep?')}
        message={t('editorCore.deleteSubstepConfirmMessage', 'This action cannot be undone.')}
      />
    </Card>
  );
}
