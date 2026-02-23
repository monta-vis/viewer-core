import type { AnnotationRow } from '@/features/instruction';
import type { ShapeHandleType } from '../types';
import { ShapeRenderer } from './ShapeRenderer';

// Re-export for backwards compatibility
export type AnnotationHandleType = ShapeHandleType;

interface AnnotationRendererProps {
  annotation: AnnotationRow;
  containerWidth: number;
  containerHeight: number;
  isSelected?: boolean;
  onClick?: () => void;
  onHandleMouseDown?: (handle: AnnotationHandleType, e: React.MouseEvent) => void;
}

/**
 * AnnotationRenderer - Renders a single annotation shape.
 * This is a thin wrapper around the unified ShapeRenderer.
 */
export function AnnotationRenderer({
  annotation,
  containerWidth,
  containerHeight,
  isSelected,
  onClick,
  onHandleMouseDown,
}: AnnotationRendererProps) {
  return (
    <ShapeRenderer
      shape={annotation}
      containerWidth={containerWidth}
      containerHeight={containerHeight}
      isSelected={isSelected}
      onClick={onClick}
      onHandleMouseDown={onHandleMouseDown}
    />
  );
}
