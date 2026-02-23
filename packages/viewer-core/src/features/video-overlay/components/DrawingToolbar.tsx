import { ArrowUpRight, Circle, Square, Type } from 'lucide-react';
import { IconButton } from '@/components/ui';
import type { ShapeType } from '../types';

// Backwards compatible alias
type AnnotationType = ShapeType;

interface DrawingToolbarProps {
  activeTool: AnnotationType | null;
  onToolSelect: (tool: AnnotationType | null) => void;
}

const tools: { type: AnnotationType; icon: typeof ArrowUpRight; label: string }[] = [
  { type: 'arrow', icon: ArrowUpRight, label: 'Arrow' },
  { type: 'circle', icon: Circle, label: 'Circle' },
  { type: 'rectangle', icon: Square, label: 'Rectangle' },
  { type: 'text', icon: Type, label: 'Text' },
];

export function DrawingToolbar({ activeTool, onToolSelect }: DrawingToolbarProps) {
  const handleToolClick = (type: AnnotationType) => {
    onToolSelect(activeTool === type ? null : type);
  };

  return (
    <div className="flex items-center gap-1">
      {tools.map(({ type, icon: Icon, label }) => (
        <IconButton
          key={type}
          icon={<Icon />}
          aria-label={label}
          onClick={() => handleToolClick(type)}
          variant={activeTool === type ? 'primary' : 'ghost'}
          size="md"
        />
      ))}
    </div>
  );
}
