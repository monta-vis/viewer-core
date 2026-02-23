import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Package, Wrench, Hash, Layers, FileText, Ruler, Box, Scale } from 'lucide-react';
import { clsx } from 'clsx';

import type { AggregatedPartTool } from '../hooks/useFilteredPartsTools';
import { resolvePartToolImageUrl } from '../utils/resolvePartToolImageUrl';
import type { FrameCaptureData } from '../utils/resolveRawFrameCapture';
import { VideoFrameCapture } from './VideoFrameCapture';

interface PartToolDetailModalProps {
  /** The part/tool to display */
  item: AggregatedPartTool | null;
  /** Callback to close the modal */
  onClose: () => void;
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
}

/**
 * PartToolDetailModal - Elegant detail view for parts and tools
 *
 * Industrial-refined aesthetic with:
 * - Large image showcase with subtle vignette
 * - Clean typography with mono accents for technical data
 * - Step badges showing where the part/tool is used
 * - Smooth entrance animation
 */
export function PartToolDetailModal({ item, onClose, folderName, partToolVideoFrameAreas, useBlurred, frameCaptureData, videoFrameAreas }: PartToolDetailModalProps) {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);
  const isOpen = item !== null;

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap and body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      modalRef.current?.focus();
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!item) return null;

  const isPart = item.partTool.type === 'Part';
  const Icon = isPart ? Package : Wrench;
  const accentColor = isPart ? 'var(--color-element-part)' : 'var(--color-element-tool)';
  const typeLabel = isPart
    ? t('instructionView.part', 'Part')
    : t('instructionView.tool', 'Tool');

  const previewImageUrl = resolvePartToolImageUrl(
    item.partTool.id,
    folderName,
    partToolVideoFrameAreas ?? {},
    useBlurred,
    videoFrameAreas,
    item.partTool,
  );

  return (
    <>
      {/* Backdrop with blur */}
      <div
        className={clsx(
          'fixed inset-0 z-50 transition-all duration-300',
          'bg-black/60 backdrop-blur-sm',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="parttool-detail-title"
        tabIndex={-1}
        className={clsx(
          'fixed inset-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2',
          'sm:w-full sm:max-w-md',
          'z-50 outline-none',
          'transition-all duration-300 ease-out',
          isOpen
            ? 'opacity-100 scale-100'
            : 'opacity-0 scale-95 pointer-events-none'
        )}
      >
        <div className="h-full sm:h-auto flex flex-col bg-[var(--color-bg-surface)] rounded-2xl overflow-hidden shadow-2xl border border-[var(--color-border-muted)]">

          {/* Image Section - Hero area */}
          <div className="relative bg-[var(--color-bg-base)] aspect-square sm:aspect-[4/3]">
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
            ) : previewImageUrl ? (
              <img
                src={previewImageUrl}
                alt={item.partTool.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Icon
                  className="w-24 h-24 opacity-20"
                  style={{ color: accentColor }}
                />
              </div>
            )}

            {/* Subtle vignette overlay (only when an image is shown) */}
            {(frameCaptureData || previewImageUrl) && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.15) 100%)'
                }}
              />
            )}

            {/* Close button - top right */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white/90 hover:bg-black/60 hover:text-white transition-all"
              aria-label={t('common.close', 'Close')}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Type badge - top left */}
            <div
              className="absolute top-3 left-3 px-3 py-1.5 rounded-full backdrop-blur-md flex items-center gap-2 text-white font-medium text-sm"
              style={{ backgroundColor: `color-mix(in srgb, ${accentColor} 85%, black)` }}
            >
              <Icon className="w-4 h-4" />
              <span>{typeLabel}</span>
            </div>

            {/* Quantity badge - bottom right, prominent */}
            <div className="absolute bottom-3 right-3 px-5 py-2 rounded-xl bg-white/95 backdrop-blur-md shadow-lg border border-black/5">
              <span
                className="text-2xl font-bold tabular-nums"
                style={{ color: accentColor }}
              >
                {item.totalAmount}×
              </span>
            </div>
          </div>

          {/* Content Section */}
          <div className="flex-1 sm:flex-none p-5 space-y-4 overflow-y-auto">

            {/* Name */}
            <h2
              id="parttool-detail-title"
              className="text-xl font-semibold text-[var(--color-text-base)] leading-tight"
            >
              {item.partTool.name}
            </h2>

            {/* Part Number */}
            {item.partTool.partNumber && (
              <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                <Hash className="w-4 h-4 flex-shrink-0" style={{ color: accentColor }} />
                <span className="font-mono text-sm tracking-wide">
                  {item.partTool.partNumber}
                </span>
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
                <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                  {item.partTool.description}
                </p>
              </div>
            )}

            {/* Used in Steps */}
            {item.usedInSteps.length > 0 && (
              <div className="pt-2 shadow-[0_-1px_2px_rgba(0,0,0,0.08)]">
                <div className="flex items-center gap-2 mb-2.5">
                  <Layers className="w-4 h-4 text-[var(--color-text-subtle)]" />
                  <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                    {t('instructionView.usedInSteps', 'Used in steps')}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {item.usedInSteps.map((stepNum) => (
                    <span
                      key={stepNum}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-semibold tabular-nums transition-colors"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
                        color: accentColor,
                        border: `1px solid color-mix(in srgb, ${accentColor} 25%, transparent)`
                      }}
                    >
                      {stepNum}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
