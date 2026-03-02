import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import ReactCrop, { type Crop, type PercentCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button, DialogShell } from '@monta-vis/viewer-core';
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

  return (
    <DialogShell
      open={open}
      onClose={onCancel}
      maxWidth="max-w-[40rem]"
      className="p-6"
    >
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
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <Button variant="primary" size="sm" onClick={handleConfirm}>
          {t('common.confirm', 'Confirm')}
        </Button>
      </div>
    </DialogShell>
  );
}
