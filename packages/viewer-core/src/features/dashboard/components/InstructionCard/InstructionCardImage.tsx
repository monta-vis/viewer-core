import { clsx } from 'clsx';
import { FileText, Upload, Trash2, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface InstructionCardImageProps {
  imageUrl: string | null;
  name: string;
  isExpanded: boolean;
  isUploadingImage: boolean;
  isDragOver: boolean;
  getRootProps: () => Record<string, unknown>;
  getInputProps: () => Record<string, unknown>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadClick: (e: React.MouseEvent) => void;
  onImageDelete: (e: React.MouseEvent) => void;
}

export function InstructionCardImage({
  imageUrl,
  name,
  isExpanded,
  isUploadingImage,
  isDragOver,
  getRootProps,
  getInputProps,
  fileInputRef,
  onImageSelect,
  onUploadClick,
  onImageDelete,
}: InstructionCardImageProps) {
  const { t } = useTranslation();

  // Collapsed view - simple image display
  if (!isExpanded) {
    return (
      <div className="relative aspect-square bg-[var(--color-bg-surface)] overflow-hidden rounded-t-xl">
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt={name}
              className="w-full h-full object-cover transition-[filter] duration-300 group-hover:brightness-105"
            />
            {/* Gradient overlay for better readability of overlaid buttons */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/15 to-transparent pointer-events-none" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--color-bg-surface)] to-[var(--color-bg-base)]">
            <FileText className="h-10 w-10 text-[var(--color-text-subtle)]" />
          </div>
        )}
      </div>
    );
  }

  // Expanded view - with drag-and-drop
  return (
    <div
      {...getRootProps()}
      className={clsx(
        'relative aspect-video overflow-hidden group',
        'transition-colors',
        isDragOver
          ? 'bg-[var(--color-primary)]/30 ring-2 ring-[var(--color-primary)] ring-inset'
          : 'bg-[var(--color-primary)]/20'
      )}
    >
      {/* Hidden file inputs */}
      <input {...(getInputProps() as React.InputHTMLAttributes<HTMLInputElement>)} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={onImageSelect}
        className="hidden"
      />

      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--color-primary)]/20">
          <div className="flex flex-col items-center gap-2 text-[var(--color-primary)]">
            <Upload className="h-12 w-12" />
            <span className="text-sm font-medium">
              {t('instruction.dropImageHere', 'Bild hier ablegen')}
            </span>
          </div>
        </div>
      )}

      {imageUrl ? (
        <>
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
          {/* Overlay with actions */}
          <div className={clsx(
            'absolute inset-0 bg-black/50 flex items-center justify-center gap-3',
            'opacity-0 group-hover:opacity-100 transition-opacity',
            isUploadingImage && 'opacity-100'
          )}>
            {isUploadingImage ? (
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            ) : (
              <>
                <button
                  type="button"
                  onClick={onUploadClick}
                  className={clsx(
                    'p-3 rounded-full bg-[var(--color-primary)] text-white',
                    'hover:bg-[var(--color-primary)]/80 transition-colors'
                  )}
                  title={t('instruction.changeImage', 'Change image')}
                >
                  <Upload className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={onImageDelete}
                  className={clsx(
                    'p-3 rounded-full bg-[var(--color-error)] text-white',
                    'hover:bg-[var(--color-error)]/80 transition-colors'
                  )}
                  title={t('instruction.deleteImage', 'Delete image')}
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
        </>
      ) : (
        <div
          className={clsx(
            'w-full h-full flex flex-col items-center justify-center gap-2',
            'bg-gradient-to-br from-[var(--color-secondary)]/20 to-[var(--color-secondary)]/5',
            !isDragOver && 'hover:from-[var(--color-secondary)]/30 hover:to-[var(--color-secondary)]/10',
            'transition-colors cursor-pointer'
          )}
        >
          {isUploadingImage ? (
            <Loader2 className="h-12 w-12 text-[var(--color-secondary)]/60 animate-spin" />
          ) : (
            <>
              <Upload className="h-12 w-12 text-[var(--color-secondary)]/40" />
              <span className="text-sm text-[var(--color-text-muted)]">
                {t('instruction.uploadImage', 'Bild hochladen')}
              </span>
              <span className="text-xs text-[var(--color-text-subtle)]">
                {t('instruction.orDragAndDrop', 'oder per Drag & Drop')}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
