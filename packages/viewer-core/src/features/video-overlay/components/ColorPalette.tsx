import { useTranslation } from 'react-i18next';
import { ColorSwatch } from '@/components/ui';
import { type ShapeColor, SHAPE_COLORS } from '../types';

interface ColorPaletteProps {
  activeColor: ShapeColor;
  onColorSelect: (color: ShapeColor) => void;
  size?: 'sm' | 'md' | 'lg';
}

const PALETTE_COLORS: ShapeColor[] = ['black', 'white'];

export function ColorPalette({
  activeColor,
  onColorSelect,
  size = 'md',
}: ColorPaletteProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2" role="radiogroup" aria-label={t('shortcuts.colorSelection')}>
      {PALETTE_COLORS.map((color) => (
        <ColorSwatch
          key={color}
          color={SHAPE_COLORS[color]}
          selected={activeColor === color}
          size={size}
          onClick={() => onColorSelect(color)}
          aria-label={color}
        />
      ))}
    </div>
  );
}
