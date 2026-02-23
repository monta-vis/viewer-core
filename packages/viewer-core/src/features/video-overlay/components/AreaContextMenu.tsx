import { useTranslation } from 'react-i18next';
import { Image } from 'lucide-react';
import { ContextMenu, ContextMenuItem } from '@/components/ui';

export interface AreaContextMenuProps {
  /** Position in viewport pixels */
  position: { x: number; y: number };
  /** Called when "Set as Instruction Image" is selected */
  onSetAsCoverImage: () => void;
  /** Called when the menu is dismissed */
  onClose: () => void;
}

export function AreaContextMenu({
  position,
  onSetAsCoverImage,
  onClose,
}: AreaContextMenuProps) {
  const { t } = useTranslation();

  return (
    <ContextMenu position={position} onClose={onClose} minWidth="min-w-[12rem]">
      <ContextMenuItem onClick={() => { onSetAsCoverImage(); onClose(); }}>
        <Image className="w-4 h-4 text-[var(--color-text-muted)]" />
        {t('instruction.setAsCoverImage', 'Set as Instruction Image')}
      </ContextMenuItem>
    </ContextMenu>
  );
}
