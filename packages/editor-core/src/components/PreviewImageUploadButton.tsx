import { memo, useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload } from 'lucide-react';

import { ImageCropDialog } from './ImageCropDialog';
import type { NormalizedCrop } from '../persistence/types';

export interface PreviewImageUploadButtonProps {
  /** Called with the selected file and crop area after the user confirms the crop. */
  onUpload: (file: File, crop: NormalizedCrop) => void;
  /** Button style variant. 'thumbnail' = absolute positioned overlay (default). 'inline' = inline icon button for headers. */
  variant?: 'thumbnail' | 'inline';
}

/**
 * PreviewImageUploadButton — self-contained upload icon + crop dialog.
 *
 * Positioned absolute bottom-right on a thumbnail container.
 * Reuses the file-input + ImageCropDialog pattern from SubstepEditPopover.
 */
export const PreviewImageUploadButton = memo(function PreviewImageUploadButton({ onUpload, variant = 'thumbnail' }: PreviewImageUploadButtonProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFileRef = useRef<File | null>(null);
  const [cropDialogSrc, setCropDialogSrc] = useState<string | null>(null);

  const handleButtonClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    pendingFileRef.current = file;
    setCropDialogSrc(URL.createObjectURL(file));
    e.target.value = '';
  }, []);

  const handleCropConfirm = useCallback((crop: NormalizedCrop) => {
    const file = pendingFileRef.current;
    if (file) {
      onUpload(file, crop);
    } else {
      console.warn('[PreviewImageUploadButton.handleCropConfirm] No pending file');
    }
    if (cropDialogSrc) URL.revokeObjectURL(cropDialogSrc);
    setCropDialogSrc(null);
    pendingFileRef.current = null;
  }, [onUpload, cropDialogSrc]);

  const handleCropCancel = useCallback(() => {
    if (cropDialogSrc) URL.revokeObjectURL(cropDialogSrc);
    setCropDialogSrc(null);
    pendingFileRef.current = null;
  }, [cropDialogSrc]);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      <button
        type="button"
        aria-label={t('editorCore.uploadPreviewImage', 'Upload preview image')}
        className={variant === 'inline'
          ? 'w-7 h-7 rounded-full flex items-center justify-center hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] transition-colors cursor-pointer shrink-0'
          : 'absolute bottom-1 right-1 w-7 h-7 rounded-full flex items-center justify-center bg-black/50 hover:bg-black/70 text-white transition-colors cursor-pointer z-10'}
        onClick={handleButtonClick}
      >
        <Upload className="h-3.5 w-3.5" />
      </button>

      {cropDialogSrc && (
        <ImageCropDialog
          open
          imageSrc={cropDialogSrc}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </>
  );
});
