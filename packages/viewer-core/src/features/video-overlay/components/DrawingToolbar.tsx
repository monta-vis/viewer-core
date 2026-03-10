import { useTranslation } from 'react-i18next';
import { ArrowUpRight, Minus, Circle, Square, Type, Pencil } from 'lucide-react';
import { IconButton } from '@/components/ui';
import type { ShapeType } from '../types';

// Backwards compatible alias
type AnnotationType = ShapeType;

interface DrawingToolbarProps {
  activeTool: AnnotationType | null;
  onToolSelect: (tool: AnnotationType | null) => void;
}

const tools: { type: AnnotationType; icon: typeof ArrowUpRight; i18nKey: string; defaultLabel: string }[] = [
  { type: 'arrow', icon: ArrowUpRight, i18nKey: 'drawingToolbar.arrow', defaultLabel: 'Arrow' },
  { type: 'line', icon: Minus, i18nKey: 'drawingToolbar.line', defaultLabel: 'Line' },
  { type: 'circle', icon: Circle, i18nKey: 'drawingToolbar.circle', defaultLabel: 'Circle' },
  { type: 'rectangle', icon: Square, i18nKey: 'drawingToolbar.rectangle', defaultLabel: 'Rectangle' },
  { type: 'text', icon: Type, i18nKey: 'drawingToolbar.text', defaultLabel: 'Text' },
  { type: 'freehand', icon: Pencil, i18nKey: 'drawingToolbar.freehand', defaultLabel: 'Freehand' },
];

export function DrawingToolbar({ activeTool, onToolSelect }: DrawingToolbarProps) {
  const { t } = useTranslation();
  const handleToolClick = (type: AnnotationType) => {
    onToolSelect(activeTool === type ? null : type);
  };

  return (
    <div className="flex items-center gap-1">
      {tools.map(({ type, icon: Icon, i18nKey, defaultLabel }) => (
        <IconButton
          key={type}
          icon={<Icon />}
          aria-label={t(i18nKey, defaultLabel)}
          onClick={() => handleToolClick(type)}
          variant={activeTool === type ? 'primary' : 'ghost'}
          size="md"
        />
      ))}
    </div>
  );
}
