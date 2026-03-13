import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

import type { AggregatedPartTool } from '../hooks/useFilteredPartsTools';
import type { ResolvedImage } from '@/lib/mediaResolver';
import { PartToolDetailContent } from './PartToolDetailContent';

interface PartToolDetailModalProps {
  /** The part/tool to display */
  item: AggregatedPartTool | null;
  /** Callback to close the modal */
  onClose: () => void;
  /** Resolved preview image (url or frameCapture) */
  image?: ResolvedImage | null;
}

/**
 * PartToolDetailModal - Read-only detail view for parts and tools
 *
 * Industrial-refined aesthetic with:
 * - Large image showcase with subtle vignette
 * - Clean typography with mono accents for technical data
 * - Clean detail fields for technical data
 * - Smooth entrance animation
 */
export function PartToolDetailModal({ item, onClose, image }: PartToolDetailModalProps) {
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
        <div className="relative h-full sm:h-auto flex flex-col bg-[var(--color-bg-surface)] rounded-2xl overflow-hidden shadow-2xl border border-[var(--color-border-muted)]">
          {/* Close button overlay */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white/90 hover:bg-black/60 hover:text-white transition-all"
            aria-label={t('common.close', 'Close')}
          >
            <X className="w-5 h-5" />
          </button>

          <PartToolDetailContent
            item={item}
            image={image}
          />
        </div>
      </div>
    </>
  );
}
