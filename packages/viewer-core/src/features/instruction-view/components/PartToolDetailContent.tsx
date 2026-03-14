import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Hash, FileText, Ruler, Box, Scale, Tag, Images } from 'lucide-react';
import { PartIcon, ToolIcon } from '@/lib/icons';

import type { AggregatedPartTool } from '../hooks/useFilteredPartsTools';
import type { ResolvedImage } from '@/lib/mediaResolver';
import { ResolvedImageView } from './ResolvedImageView';

interface PartToolDetailContentProps {
  /** The aggregated part/tool to display */
  item: AggregatedPartTool;
  /** Resolved preview image via MediaResolver */
  image?: ResolvedImage | null;
  /** Optional slot rendered after the content section (e.g. edit actions) */
  actionSlot?: ReactNode;
  /** Pre-resolved preview image URL */
  previewImageUrl?: string | null;
  /** When true, render only the image hero section (no text fields). */
  compact?: boolean;
  /** When true, scale down badges and placeholder for smaller containers. */
  compactBadges?: boolean;
  /** All resolved image URLs; enables thumbnail sidebar when length > 1 */
  imageUrls?: string[];
  /** Resolved images (raw mode); enables gallery with ResolvedImageView when length > 1 */
  images?: ResolvedImage[];
  /** Called when a thumbnail is clicked (in addition to internal selection) */
  onImageSelect?: (index: number) => void;
  /** When true, the thumbnail strip starts expanded instead of collapsed */
  initialExpanded?: boolean;
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
  image,
  actionSlot,
  previewImageUrl: previewImageUrlProp,
  compact,
  compactBadges: compactBadgesProp,
  imageUrls,
  images,
  onImageSelect,
  initialExpanded,
}: PartToolDetailContentProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(initialExpanded ?? false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset thumbnail state when switching between different partTools
  useEffect(() => {
    setSelectedIndex(0);
    setExpanded(false);
  }, [item.partTool.id]);

  const smallBadges = compact || compactBadgesProp;
  const isPart = item.partTool.type === 'Part';
  const Icon = isPart ? PartIcon : ToolIcon;
  const accentColor = isPart ? 'var(--color-element-part)' : 'var(--color-element-tool)';
  const typeLabel = isPart
    ? t('instructionView.part', 'Part')
    : t('instructionView.tool', 'Tool');

  const hasMultipleImages = (imageUrls && imageUrls.length > 1) || (images && images.length > 1);
  const hasResolvedGallery = images && images.length > 1;

  // Image priority cascade:
  // 1. Multi-image gallery (images[] or imageUrls[] with length > 1) — overrides everything
  // 2. Explicit previewImageUrl prop — legacy callers that supply a pre-resolved URL
  // 3. ResolvedImage (image prop or images[0]) — standard path via MediaResolver
  const singleResolvedImage = images && images.length === 1 ? images[0] : image;
  const useResolvedImage = singleResolvedImage && !hasMultipleImages && previewImageUrlProp === undefined;

  function getResolvedImageUrl(): string | null {
    if (hasMultipleImages && !hasResolvedGallery && imageUrls) return imageUrls[selectedIndex];
    if (previewImageUrlProp !== undefined) return previewImageUrlProp;
    return null;
  }
  const resolvedImageUrl = useResolvedImage ? null : (hasResolvedGallery ? null : getResolvedImageUrl());
  const hasImage = useResolvedImage ? !!singleResolvedImage : hasResolvedGallery || !!resolvedImageUrl;

  return (
    <div data-testid="parttool-detail-content">
      {/* Image Section - Hero area */}
      <div className="relative bg-black overflow-hidden aspect-square">
        {hasResolvedGallery ? (
          <ResolvedImageView
            image={images[selectedIndex]}
            alt={item.partTool.name}
            className="w-full h-full object-contain"
          />
        ) : useResolvedImage ? (
          <ResolvedImageView
            image={singleResolvedImage}
            alt={item.partTool.name}
            className="w-full h-full object-contain"
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
        {hasImage && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.15) 100%)'
            }}
          />
        )}

        {/* Thumbnail strip overlay (left side) */}
        {hasMultipleImages && (
          <div
            data-testid="parttool-image-strip"
            className={`absolute top-0 left-0 bottom-0 ${smallBadges ? 'w-10' : 'w-14'} bg-black/70 backdrop-blur-sm flex flex-col gap-1.5 p-1.5 overflow-y-auto transition-all duration-200 ease-out ${
              expanded
                ? 'translate-x-0 opacity-100'
                : '-translate-x-full opacity-0 pointer-events-none'
            }`}
          >
            {hasResolvedGallery
              ? images.map((img, index) => (
                <button
                  key={img.kind === 'url' ? img.url : `frame-${index}`}
                  type="button"
                  className={`aspect-square rounded overflow-hidden cursor-pointer ${
                    index === selectedIndex
                      ? 'ring-2'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  style={index === selectedIndex ? { '--tw-ring-color': accentColor } as React.CSSProperties : undefined}
                  onClick={() => {
                    setSelectedIndex(index);
                    onImageSelect?.(index);
                  }}
                >
                  <ResolvedImageView
                    image={img}
                    alt={`${item.partTool.name} ${index + 1}`}
                    className="w-full h-full object-contain"
                  />
                </button>
              ))
              : imageUrls?.map((url, index) => (
                <img
                  key={url}
                  src={url}
                  alt={`${item.partTool.name} ${index + 1}`}
                  className={`aspect-square rounded object-contain cursor-pointer ${
                    index === selectedIndex
                      ? 'ring-2'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  style={index === selectedIndex ? { '--tw-ring-color': accentColor } as React.CSSProperties : undefined}
                  onClick={() => {
                    setSelectedIndex(index);
                    onImageSelect?.(index);
                  }}
                />
              ))
            }
          </div>
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

        {/* Image toggle badge - bottom left */}
        {hasMultipleImages && (
          <button
            data-testid="parttool-image-toggle"
            className={smallBadges
              ? 'absolute bottom-1.5 left-1.5 px-2 py-1 rounded-lg bg-black/70 backdrop-blur-md text-white flex items-center gap-1 cursor-pointer text-xs'
              : 'absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-md text-white flex items-center gap-1.5 cursor-pointer text-sm'}
            aria-label={expanded
              ? t('instructionView.hideThumbnails', 'Hide thumbnails')
              : t('instructionView.showImages', 'Show {{count}} images', { count: (hasResolvedGallery ? images.length : imageUrls?.length) ?? 0 })}
            onClick={() => setExpanded((prev) => !prev)}
          >
            <Images className={smallBadges ? 'w-3 h-3' : 'w-4 h-4'} />
            <span className="font-medium">{hasResolvedGallery ? images.length : imageUrls?.length}</span>
          </button>
        )}

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
          {item.partTool.position && (
            <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
              <Tag className="w-4 h-4 flex-shrink-0" style={{ color: accentColor }} />
              <span className="font-semibold text-sm">{item.partTool.position}</span>
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
