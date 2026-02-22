import type { DrawingRow } from '@/features/instruction';
import type { ShapeHandleType } from '../types';
import { ShapeRenderer } from './ShapeRenderer';

// Re-export for backwards compatibility
export type DrawingHandleType = ShapeHandleType;

interface DrawingRendererProps {
  drawing: DrawingRow;
  containerWidth: number;
  containerHeight: number;
  isSelected?: boolean;
  onClick?: () => void;
  onHandleMouseDown?: (handle: DrawingHandleType, e: React.MouseEvent) => void;
}

/**
 * DrawingRenderer - Renders a single video drawing shape.
 * This is a thin wrapper around the unified ShapeRenderer.
 */
export function DrawingRenderer({
  drawing,
  containerWidth,
  containerHeight,
  isSelected,
  onClick,
  onHandleMouseDown,
}: DrawingRendererProps) {
  return (
    <ShapeRenderer
      shape={drawing}
      containerWidth={containerWidth}
      containerHeight={containerHeight}
      isSelected={isSelected}
      onClick={onClick}
      onHandleMouseDown={onHandleMouseDown}
    />
  );
}
