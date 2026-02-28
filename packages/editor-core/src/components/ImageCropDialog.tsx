import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import ReactCrop, { type Crop, type PercentCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import type { NormalizedCrop } from '../persistence/types';

export interface ImageCropDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Image source URL (mvis-media://, file://, or blob URL) */
  imageSrc: string;
  /** Called with normalized 0-1 coordinates when confirmed */
  onConfirm: (crop: NormalizedCrop) => void;
  /** Called when the dialog is cancelled/dismissed */
  onCancel: () => void;
  /** Optional aspect ratio constraint (e.g., 16/9) */
  aspect?: number;
}

const BTN_BASE = 'px-3 py-1.5 text-sm rounded-md cursor-pointer transition-colors';

export function ImageCropDialog({
  open,
  imageSrc,
  onConfirm,
  onCancel,
  aspect,
}: ImageCropDialogProps) {
  const { t } = useTranslation();

  // Crop state uses percentage values (react-image-crop convention)
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 80,
    height: 80,
    x: 10,
    y: 10,
  });

  const [completedCrop, setCompletedCrop] = useState<PercentCrop | null>(null);

  // Reset crop when dialog opens with new image
  useEffect(() => {
    if (open) {
      setCrop({ unit: '%', width: 80, height: 80, x: 10, y: 10 });
      setCompletedCrop(null);
    }
  }, [open, imageSrc]);

  // Handle Escape key
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [open, onCancel]);

  const handleConfirm = useCallback(() => {
    // Use completed crop if available, otherwise use current crop state
    const finalCrop = completedCrop ?? crop;

    // Convert from percentage (0-100) to normalized (0-1)
    const normalized: NormalizedCrop = {
      x: (finalCrop.x ?? 0) / 100,
      y: (finalCrop.y ?? 0) / 100,
      width: (finalCrop.width ?? 100) / 100,
      height: (finalCrop.height ?? 100) / 100,
    };

    onConfirm(normalized);
  }, [completedCrop, crop, onConfirm]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={t('instruction.cropImage', 'Crop Image')}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-[40rem] rounded-lg bg-[var(--color-bg-base)] p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-[var(--color-text-base)] mb-4">
          {t('instruction.cropImage', 'Crop Image')}
        </h2>

        {/* Crop area */}
        <div className="flex items-center justify-center bg-black/20 rounded-lg overflow-hidden max-h-[60vh]">
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(_, percentCrop) => setCompletedCrop(percentCrop)}
            aspect={aspect}
          >
            <img
              src={imageSrc}
              alt=""
              className="max-h-[55vh] max-w-full object-contain"
            />
          </ReactCrop>
        </div>

        {/* Actions */}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className={`${BTN_BASE} text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]`}
            onClick={onCancel}
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            className={`${BTN_BASE} bg-[var(--color-secondary)] text-white hover:opacity-90`}
            onClick={handleConfirm}
          >
            {t('common.confirm', 'Confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
