import type { ShapeHandleType } from '../types';

interface SelectionHandleProps {
  x: number;
  y: number;
  handleType: ShapeHandleType;
  onMouseDown?: (handle: ShapeHandleType, e: React.MouseEvent) => void;
}

/**
 * PowerPoint-style round selection handle for SVG shapes.
 * Used by both AnnotationRenderer and DrawingRenderer.
 */
export function SelectionHandle({
  x,
  y,
  handleType,
  onMouseDown,
}: SelectionHandleProps) {
  const size = 8;

  return (
    <circle
      cx={x}
      cy={y}
      r={size / 2}
      fill="white"
      stroke="#0066cc"
      strokeWidth={1.5}
      cursor="pointer"
      style={{ pointerEvents: 'auto' }}
      onMouseDown={(e) => {
        e.stopPropagation();
        onMouseDown?.(handleType, e);
      }}
    />
  );
}
