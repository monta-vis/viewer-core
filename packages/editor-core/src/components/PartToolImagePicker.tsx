import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ImagePlus, X } from 'lucide-react';
import { useMenuClose } from '@monta-vis/viewer-core';

export interface PartToolImageItem {
  junctionId: string;
  areaId: string;
  url: string;
  isPreview: boolean;
}

export interface PartToolImagePickerProps {
  open: boolean;
  onClose: () => void;
  position: { left: number; bottom: number };
  images: PartToolImageItem[];
  onSelect: (junctionId: string, areaId: string) => void;
  onAdd: () => void;
  onDelete?: (junctionId: string, areaId: string) => void;
}

export function PartToolImagePicker({
  open,
  onClose,
  position,
  images,
  onSelect,
  onAdd,
  onDelete,
}: PartToolImagePickerProps) {
  const { t } = useTranslation();
  const popoverRef = useRef<HTMLDivElement>(null);

  useMenuClose(popoverRef, onClose, open);

  if (!open) return null;

  const previewImage = images.find((img) => img.isPreview) ?? images[0] ?? null;

  const style: React.CSSProperties = {
    position: 'fixed',
    left: position.left,
    bottom: position.bottom,
  };

  return createPortal(
    <div
      ref={popoverRef}
      data-testid="picker-popover"
      style={style}
      className="z-50 bg-[var(--color-bg-elevated)] border border-[var(--color-border-base)] rounded-lg shadow-lg p-1.5"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Large preview */}
      {previewImage && (
        <img
          data-testid="picker-preview"
          src={previewImage.url}
          alt=""
          className="w-40 h-40 rounded object-contain bg-black"
        />
      )}

      {/* Thumbnail strip + add button */}
      <div className="flex gap-1 mt-1 items-center">
        {images.map((img) => (
          <div key={img.junctionId} className="relative group">
            <button
              type="button"
              data-testid={`picker-image-${img.junctionId}`}
              aria-label={t('editorCore.selectImage', 'Select image')}
              className={`w-8 h-8 rounded overflow-hidden border-2 bg-black cursor-pointer transition-all ${
                img.isPreview
                  ? 'border-[var(--color-secondary)]'
                  : 'border-transparent hover:border-[var(--color-text-muted)]'
              }`}
              onClick={() => onSelect(img.junctionId, img.areaId)}
            >
              <img src={img.url} alt="" className="w-full h-full object-contain" />
            </button>
            {onDelete && (
              <button
                type="button"
                data-testid={`picker-delete-${img.junctionId}`}
                aria-label={t('editorCore.deleteImage', 'Delete image')}
                className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:!opacity-100 transition-opacity cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(img.junctionId, img.areaId);
                }}
              >
                <X className="h-2 w-2" />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          data-testid="picker-add-image"
          aria-label={t('editorCore.addImage', 'Add image')}
          className="w-8 h-8 rounded border-2 border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-secondary)] hover:text-[var(--color-secondary)] flex items-center justify-center transition-colors cursor-pointer"
          onClick={onAdd}
        >
          <ImagePlus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>,
    document.body,
  );
}
