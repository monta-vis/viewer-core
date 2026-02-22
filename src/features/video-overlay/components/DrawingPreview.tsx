import { type ShapeType, type ShapeColor, type Point, SHAPE_COLORS } from '../types';

// Backwards compatible aliases
type AnnotationType = ShapeType;
type AnnotationColor = ShapeColor;
const ANNOTATION_COLORS = SHAPE_COLORS;

interface DrawingPreviewProps {
  tool: AnnotationType;
  color: AnnotationColor;
  startPoint: Point;
  currentPoint: Point;
  containerWidth: number;
  containerHeight: number;
}

export function DrawingPreview({
  tool,
  color,
  startPoint,
  currentPoint,
  containerWidth,
  containerHeight,
}: DrawingPreviewProps) {
  const strokeColor = ANNOTATION_COLORS[color];
  const strokeWidth = 4;

  // Convert percentage to pixels
  const x1 = (startPoint.x / 100) * containerWidth;
  const y1 = (startPoint.y / 100) * containerHeight;
  const x2 = (currentPoint.x / 100) * containerWidth;
  const y2 = (currentPoint.y / 100) * containerHeight;

  const commonProps = {
    stroke: strokeColor,
    strokeWidth,
    fill: 'none',
    strokeDasharray: '5,5',
    opacity: 0.8,
  };

  switch (tool) {
    case 'arrow': {
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headLength = 12;
      const headAngle = Math.PI / 6;

      const headX1 = x2 - headLength * Math.cos(angle - headAngle);
      const headY1 = y2 - headLength * Math.sin(angle - headAngle);
      const headX2 = x2 - headLength * Math.cos(angle + headAngle);
      const headY2 = y2 - headLength * Math.sin(angle + headAngle);

      return (
        <g {...commonProps}>
          <line x1={x1} y1={y1} x2={x2} y2={y2} />
          <line x1={x2} y1={y2} x2={headX1} y2={headY1} />
          <line x1={x2} y1={y2} x2={headX2} y2={headY2} />
        </g>
      );
    }

    case 'circle': {
      // Draw ellipse inscribed in bounding box (PowerPoint style)
      const rectX = Math.min(x1, x2);
      const rectY = Math.min(y1, y2);
      const rectWidth = Math.abs(x2 - x1);
      const rectHeight = Math.abs(y2 - y1);
      const cx = rectX + rectWidth / 2;
      const cy = rectY + rectHeight / 2;
      const rx = rectWidth / 2;
      const ry = rectHeight / 2;
      return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} {...commonProps} />;
    }

    case 'rectangle': {
      const rectX = Math.min(x1, x2);
      const rectY = Math.min(y1, y2);
      const rectWidth = Math.abs(x2 - x1);
      const rectHeight = Math.abs(y2 - y1);
      return (
        <rect
          x={rectX}
          y={rectY}
          width={rectWidth}
          height={rectHeight}
          {...commonProps}
        />
      );
    }

    default:
      return null;
  }
}
