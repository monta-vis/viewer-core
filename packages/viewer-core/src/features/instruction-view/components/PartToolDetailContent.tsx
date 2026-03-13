import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Hash, FileText, Ruler, Box, Scale, Tag } from 'lucide-react';
import { PartIcon, ToolIcon } from '@/lib/icons';

import type { AggregatedPartTool } from '../hooks/useFilteredPartsTools';
import { resolvePartToolImageUrl } from '../utils/resolvePartToolImageUrl';
import type { FrameCaptureData } from '../utils/resolveRawFrameCapture';
import { VideoFrameCapture } from './VideoFrameCapture';

const EMPTY_JUNCTIONS: Record<string, { partToolId: string; videoFrameAreaId: string; isPreviewImage: boolean; order: number }> = {};

interface PartToolDetailContentProps {
  /** The aggregated part/tool to display */
  item: AggregatedPartTool;
  /** Project folder name for mvis-media:// area image URLs */
  folderName?: string;
  /** PartTool-VideoFrameArea junction records from the store */
  partToolVideoFrameAreas?: Record<string, { partToolId: string; videoFrameAreaId: string; isPreviewImage: boolean; order: number }>;
  /** Whether to use blurred media variants */
  useBlurred?: boolean;
  /** Raw frame capture data for Editor preview */
  frameCaptureData?: FrameCaptureData | null;
  /** VideoFrameArea records for localPath fallback (mweb context) */
  videoFrameAreas?: Record<string, { localPath?: string | null }>;
  /** Optional slot rendered after the content section (e.g. edit actions) */
  actionSlot?: ReactNode;
  /** Pre-resolved preview image URL; when provided, skips internal resolvePartToolImageUrl */
  previewImageUrl?: string | null;
  /** When true, render only the image hero section (no text fields). */
  compact?: boolean;
  /** When true, scale down badges and placeholder for smaller containers. */
  compactBadges?: boolean;
}

/**
 * PartToolDetailContent — Reusable image + detail content for a part/tool.
 *
 * Renders the hero image section (with frame capture, image, or placeholder icon)
 * and the detail fields (name, label, partNumber, unit/material/dimension, description).
 *
 * Does NOT include modal chrome (backdrop, close button, escape handling, scroll lock).
 * Used by PartToolDetailModal and can be embedded in sidebar layouts.
 */
export function PartToolDetailContent({
  item,
  folderName,
  partToolVideoFrameAreas,
  useBlurred,
  frameCaptureData,
  videoFrameAreas,
  actionSlot,
  previewImageUrl: previewImageUrlProp,
  compact,
  compactBadges: compactBadgesProp,
}: PartToolDetailContentProps) {
  const { t } = useTranslation();

  const smallBadges = compact || compactBadgesProp;
  const isPart = item.partTool.type === 'Part';
  const Icon = isPart ? PartIcon : ToolIcon;
  const accentColor = isPart ? 'var(--color-element-part)' : 'var(--color-element-tool)';
  const typeLabel = isPart
    ? t('instructionView.part', 'Part')
    : t('instructionView.tool', 'Tool');

  const resolvedImageUrl = previewImageUrlProp !== undefined
    ? previewImageUrlProp
    : resolvePartToolImageUrl(
        item.partTool.id,
        folderName,
        partToolVideoFrameAreas ?? EMPTY_JUNCTIONS,
        useBlurred,
        videoFrameAreas,
      );

  return (
    <div data-testid="parttool-detail-content">
      {/* Image Section - Hero area */}
      <div className="relative bg-black overflow-hidden aspect-square">
        {frameCaptureData ? (
          <VideoFrameCapture
            videoId={frameCaptureData.videoId}
            fps={frameCaptureData.fps}
            frameNumber={frameCaptureData.frameNumber}
            cropArea={frameCaptureData.cropArea}
            videoSrc={frameCaptureData.videoSrc}
            alt={item.partTool.name}
            className="w-full h-full"
          />
        ) : resolvedImageUrl ? (
          <img
            src={resolvedImageUrl}
            alt={item.partTool.name}
            loading="lazy"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon
              className={smallBadges ? 'w-10 h-10 opacity-20' : 'w-24 h-24 opacity-20'}
              style={{ color: accentColor }}
            />
          </div>
        )}

        {/* Subtle vignette overlay (only when an image is shown) */}
        {(frameCaptureData || resolvedImageUrl) && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.15) 100%)'
            }}
          />
        )}

        {/* Type badge - top left */}
        <div
          data-testid="parttool-detail-type-badge"
          className={smallBadges
            ? 'absolute top-1.5 left-1.5 px-2 py-1 rounded-full backdrop-blur-md flex items-center gap-1 text-white font-medium text-xs'
            : 'absolute top-3 left-3 px-3 py-1.5 rounded-full backdrop-blur-md flex items-center gap-2 text-white font-medium text-sm'}
          style={{ backgroundColor: `color-mix(in srgb, ${accentColor} 85%, black)` }}
        >
          <Icon className={smallBadges ? 'w-3 h-3' : 'w-4 h-4'} />
          <span>{typeLabel}</span>
        </div>

        {/* Quantity badge - bottom right */}
        <div
          data-testid="parttool-detail-amount"
          className={smallBadges
            ? 'absolute bottom-1.5 right-1.5 px-3 py-1 rounded-lg bg-white/95 backdrop-blur-md shadow-lg border border-black/5'
            : 'absolute bottom-3 right-3 px-5 py-2 rounded-xl bg-white/95 backdrop-blur-md shadow-lg border border-black/5'}
        >
          <span
            className={smallBadges ? 'text-base font-bold tabular-nums' : 'text-2xl font-bold tabular-nums'}
            style={{ color: accentColor }}
          >
            {item.totalAmount}×
          </span>
        </div>
      </div>

      {/* Content Section — hidden in compact mode */}
      {!compact && (
        <div className="flex-1 sm:flex-none p-5 space-y-4 overflow-y-auto">

          {/* Name */}
          <h2
            data-testid="parttool-detail-name"
            id="parttool-detail-title"
            className="text-xl font-semibold text-[var(--color-text-base)] leading-tight"
          >
            {item.partTool.name}
          </h2>

          {/* Label */}
          {item.partTool.label && (
            <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
              <Tag className="w-4 h-4 flex-shrink-0" style={{ color: accentColor }} />
              <span className="font-semibold text-sm">{item.partTool.label}</span>
            </div>
          )}

          {/* Part Number */}
          {item.partTool.partNumber && (
            <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
              <Hash className="w-4 h-4 flex-shrink-0" style={{ color: accentColor }} />
              <span className="font-mono text-sm tracking-wide">{item.partTool.partNumber}</span>
            </div>
          )}

          {/* Unit / Material / Dimension */}
          {(item.partTool.unit || item.partTool.material || item.partTool.dimension) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--color-text-muted)]">
              {item.partTool.unit && (
                <div className="flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 flex-shrink-0 text-[var(--color-text-subtle)]" />
                  <span>{item.partTool.unit}</span>
                </div>
              )}
              {item.partTool.material && (
                <div className="flex items-center gap-1.5">
                  <Box className="w-3.5 h-3.5 flex-shrink-0 text-[var(--color-text-subtle)]" />
                  <span>{item.partTool.material}</span>
                </div>
              )}
              {item.partTool.dimension && (
                <div className="flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5 flex-shrink-0 text-[var(--color-text-subtle)]" />
                  <span>{item.partTool.dimension}</span>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {item.partTool.description && (
            <div className="flex gap-2">
              <FileText className="w-4 h-4 flex-shrink-0 mt-0.5 text-[var(--color-text-subtle)]" />
              <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{item.partTool.description}</p>
            </div>
          )}

          {/* Action slot */}
          {actionSlot && (
            <div data-testid="parttool-detail-action-slot">
              {actionSlot}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
