import type { ShapeHandleType, ShapeType, ShapeColor } from '../types';
import { SelectionHandle } from './SelectionHandle';

/**
 * Common shape data interface that both AnnotationRow and DrawingRow satisfy.
 */
export interface ShapeData {
  id: string;
  type: ShapeType;
  color: ShapeColor | string;
  strokeWidth?: number | null;
  x1: number | null;
  y1: number | null;
  x2: number | null;
  y2: number | null;
  // Optional fields for specific shape types
  text?: string | null;
  content?: string | null;
  fontSize?: number | null;
  points?: string | null;
  // Position fields (used by DrawingRow for text)
  x?: number | null;
  y?: number | null;
  radius?: number | null;
}

interface ShapeRendererProps<T extends ShapeData> {
  shape: T;
  containerWidth: number;
  containerHeight: number;
  isSelected?: boolean;
  /** When true, show edge midpoint handles (n, s, e, w) for free resize */
  showEdgeHandles?: boolean;
  onClick?: () => void;
  onHandleMouseDown?: (handle: ShapeHandleType, e: React.MouseEvent) => void;
  /** When true, disable all pointer events to allow drawing through shapes */
  isDrawModeActive?: boolean;
  /** Width in pixels to use for text fontSize scaling. Falls back to containerWidth. */
  textScaleWidth?: number;
  /** Called when a selected text shape is double-clicked (for editing) */
  onDoubleClick?: () => void;
}

/**
 * Renders arrow shape (line with arrowhead)
 */
function ArrowShape({
  x1,
  y1,
  x2,
  y2,
  commonProps,
  hitAreaProps,
  isSelected,
  onHandleMouseDown,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  commonProps: Omit<React.SVGProps<SVGElement>, 'ref'>;
  hitAreaProps: Omit<React.SVGProps<SVGElement>, 'ref'>;
  isSelected?: boolean;
  onHandleMouseDown?: (handle: ShapeHandleType, e: React.MouseEvent) => void;
}) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLength = 12;
  const headAngle = Math.PI / 6;

  const headX1 = x2 - headLength * Math.cos(angle - headAngle);
  const headY1 = y2 - headLength * Math.sin(angle - headAngle);
  const headX2 = x2 - headLength * Math.cos(angle + headAngle);
  const headY2 = y2 - headLength * Math.sin(angle + headAngle);

  return (
    <g>
      {/* Invisible hit area for easier clicking/moving */}
      <g {...hitAreaProps}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} />
        <line x1={x2} y1={y2} x2={headX1} y2={headY1} />
        <line x1={x2} y1={y2} x2={headX2} y2={headY2} />
      </g>
      {/* Visible stroke */}
      <g {...commonProps} style={{ ...commonProps.style, pointerEvents: 'none' }}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} />
        <line x1={x2} y1={y2} x2={headX1} y2={headY1} />
        <line x1={x2} y1={y2} x2={headX2} y2={headY2} />
      </g>
      {/* Selection handles at start and end points */}
      {isSelected && (
        <>
          <SelectionHandle x={x1} y={y1} handleType="start" onMouseDown={onHandleMouseDown} />
          <SelectionHandle x={x2} y={y2} handleType="end" onMouseDown={onHandleMouseDown} />
        </>
      )}
    </g>
  );
}

/**
 * Renders ellipse/circle shape inscribed in bounding box
 */
function EllipseShape({
  x1,
  y1,
  x2,
  y2,
  commonProps,
  hitAreaProps,
  isSelected,
  showEdgeHandles,
  onHandleMouseDown,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  commonProps: Omit<React.SVGProps<SVGElement>, 'ref'>;
  hitAreaProps: Omit<React.SVGProps<SVGElement>, 'ref'>;
  isSelected?: boolean;
  showEdgeHandles?: boolean;
  onHandleMouseDown?: (handle: ShapeHandleType, e: React.MouseEvent) => void;
}) {
  const rectX = Math.min(x1, x2);
  const rectY = Math.min(y1, y2);
  const rectWidth = Math.abs(x2 - x1);
  const rectHeight = Math.abs(y2 - y1);
  const cx = rectX + rectWidth / 2;
  const cy = rectY + rectHeight / 2;
  const rx = rectWidth / 2;
  const ry = rectHeight / 2;

  return (
    <g>
      {/* Invisible hit area */}
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} {...hitAreaProps} />
      {/* Visible stroke */}
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        {...commonProps}
        style={{ ...commonProps.style, pointerEvents: 'none' }}
      />
      {/* Selection handles: corners and edge midpoints of bounding box */}
      {isSelected && (
        <>
          {/* Corners */}
          <SelectionHandle x={rectX} y={rectY} handleType="nw" onMouseDown={onHandleMouseDown} />
          <SelectionHandle x={rectX + rectWidth} y={rectY} handleType="ne" onMouseDown={onHandleMouseDown} />
          <SelectionHandle x={rectX + rectWidth} y={rectY + rectHeight} handleType="se" onMouseDown={onHandleMouseDown} />
          <SelectionHandle x={rectX} y={rectY + rectHeight} handleType="sw" onMouseDown={onHandleMouseDown} />
          {/* Edge midpoints - only shown when Shift is pressed (for free resize) */}
          {showEdgeHandles && (
            <>
              <SelectionHandle x={cx} y={rectY} handleType="n" onMouseDown={onHandleMouseDown} />
              <SelectionHandle x={rectX + rectWidth} y={cy} handleType="e" onMouseDown={onHandleMouseDown} />
              <SelectionHandle x={cx} y={rectY + rectHeight} handleType="s" onMouseDown={onHandleMouseDown} />
              <SelectionHandle x={rectX} y={cy} handleType="w" onMouseDown={onHandleMouseDown} />
            </>
          )}
        </>
      )}
    </g>
  );
}

/**
 * Renders rectangle shape
 */
function RectangleShape({
  x1,
  y1,
  x2,
  y2,
  commonProps,
  hitAreaProps,
  isSelected,
  showEdgeHandles,
  onHandleMouseDown,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  commonProps: Omit<React.SVGProps<SVGElement>, 'ref'>;
  hitAreaProps: Omit<React.SVGProps<SVGElement>, 'ref'>;
  isSelected?: boolean;
  showEdgeHandles?: boolean;
  onHandleMouseDown?: (handle: ShapeHandleType, e: React.MouseEvent) => void;
}) {
  const rectX = Math.min(x1, x2);
  const rectY = Math.min(y1, y2);
  const rectWidth = Math.abs(x2 - x1);
  const rectHeight = Math.abs(y2 - y1);
  const midX = rectX + rectWidth / 2;
  const midY = rectY + rectHeight / 2;

  return (
    <g>
      {/* Invisible hit area */}
      <rect x={rectX} y={rectY} width={rectWidth} height={rectHeight} {...hitAreaProps} />
      {/* Visible stroke */}
      <rect
        x={rectX}
        y={rectY}
        width={rectWidth}
        height={rectHeight}
        {...commonProps}
        style={{ ...commonProps.style, pointerEvents: 'none' }}
      />
      {/* Selection handles: corners and edge midpoints */}
      {isSelected && (
        <>
          {/* Corners */}
          <SelectionHandle x={rectX} y={rectY} handleType="nw" onMouseDown={onHandleMouseDown} />
          <SelectionHandle x={rectX + rectWidth} y={rectY} handleType="ne" onMouseDown={onHandleMouseDown} />
          <SelectionHandle x={rectX + rectWidth} y={rectY + rectHeight} handleType="se" onMouseDown={onHandleMouseDown} />
          <SelectionHandle x={rectX} y={rectY + rectHeight} handleType="sw" onMouseDown={onHandleMouseDown} />
          {/* Edge midpoints - only shown when Shift is pressed (for free resize) */}
          {showEdgeHandles && (
            <>
              <SelectionHandle x={midX} y={rectY} handleType="n" onMouseDown={onHandleMouseDown} />
              <SelectionHandle x={rectX + rectWidth} y={midY} handleType="e" onMouseDown={onHandleMouseDown} />
              <SelectionHandle x={midX} y={rectY + rectHeight} handleType="s" onMouseDown={onHandleMouseDown} />
              <SelectionHandle x={rectX} y={midY} handleType="w" onMouseDown={onHandleMouseDown} />
            </>
          )}
        </>
      )}
    </g>
  );
}

/**
 * Renders freehand path (only for drawings)
 */
function FreehandShape({
  points,
  containerWidth,
  containerHeight,
  commonProps,
  hitAreaProps,
}: {
  points: string | null | undefined;
  containerWidth: number;
  containerHeight: number;
  commonProps: Omit<React.SVGProps<SVGElement>, 'ref'>;
  hitAreaProps: Omit<React.SVGProps<SVGElement>, 'ref'>;
}) {
  if (!points) return null;

  let parsedPoints: { x: number; y: number }[] = [];
  try {
    parsedPoints = JSON.parse(points);
  } catch {
    return null;
  }

  if (parsedPoints.length < 2) return null;

  const pathData = parsedPoints
    .map((p, i) => {
      const px = (p.x / 100) * containerWidth;
      const py = (p.y / 100) * containerHeight;
      return i === 0 ? `M ${px} ${py}` : `L ${px} ${py}`;
    })
    .join(' ');

  return (
    <g>
      <path d={pathData} {...hitAreaProps} />
      <path
        d={pathData}
        {...commonProps}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ ...commonProps.style, pointerEvents: 'none' }}
      />
    </g>
  );
}

/**
 * ShapeRenderer - Unified component for rendering SVG shapes.
 * Used by both annotations (on images) and drawings (on video).
 */
export function ShapeRenderer<T extends ShapeData>({
  shape,
  containerWidth,
  containerHeight,
  isSelected,
  showEdgeHandles,
  onClick,
  onHandleMouseDown,
  isDrawModeActive = false,
  textScaleWidth,
  onDoubleClick,
}: ShapeRendererProps<T>) {
  // Skip rendering if required coordinates are missing
  if (shape.x1 === null || shape.y1 === null) {
    return null;
  }

  const isLightTheme = shape.color === 'white';
  const strokeColor = isLightTheme ? 'rgba(255, 255, 255, 0.80)' : 'rgba(30, 30, 30, 0.80)';
  const textColor = isLightTheme ? 'black' : 'white';
  const strokeWidth = (shape.strokeWidth ?? 2) * 2;

  // Convert percentage coordinates to pixels
  const x1 = (shape.x1 / 100) * containerWidth;
  const y1 = (shape.y1 / 100) * containerHeight;
  const x2 = shape.x2 !== null ? (shape.x2 / 100) * containerWidth : 0;
  const y2 = shape.y2 !== null ? (shape.y2 / 100) * containerHeight : 0;

  // Common props for visible stroke
  const commonProps: Omit<React.SVGProps<SVGElement>, 'ref'> = {
    stroke: strokeColor,
    strokeWidth,
    fill: 'none',
    style: isSelected
      ? { filter: `drop-shadow(0 0 3px rgba(0,102,204,0.8))${isLightTheme ? ' drop-shadow(0 0 1px rgba(0,0,0,0.4))' : ''}` }
      : isLightTheme ? { filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.4))' } : undefined,
  };

  // Stop mousedown from bubbling to container (prevents background click handler)
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSelected) {
      onHandleMouseDown?.('move', e);
    }
  };

  // Props for invisible hit area (wider stroke for easier clicking/moving)
  // Use 'none' so only the border is clickable (like PowerPoint behavior)
  const hitAreaProps: Omit<React.SVGProps<SVGElement>, 'ref'> = {
    stroke: 'transparent',
    strokeWidth: Math.max(strokeWidth + 10, 16),
    fill: 'none',
    cursor: isSelected ? 'move' : 'pointer',
    style: { pointerEvents: isDrawModeActive ? 'none' : 'auto' as const },
    onClick: !isSelected ? onClick : undefined,
    onMouseDown: handleMouseDown,
  };

  switch (shape.type) {
    case 'arrow':
      return (
        <ArrowShape
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          commonProps={commonProps}
          hitAreaProps={hitAreaProps}
          isSelected={isSelected}
          onHandleMouseDown={onHandleMouseDown}
        />
      );

    case 'circle':
      return (
        <EllipseShape
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          commonProps={commonProps}
          hitAreaProps={hitAreaProps}
          isSelected={isSelected}
          showEdgeHandles={showEdgeHandles}
          onHandleMouseDown={onHandleMouseDown}
        />
      );

    case 'rectangle':
      return (
        <RectangleShape
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          commonProps={commonProps}
          hitAreaProps={hitAreaProps}
          isSelected={isSelected}
          showEdgeHandles={showEdgeHandles}
          onHandleMouseDown={onHandleMouseDown}
        />
      );

    case 'text': {
      const textContent = shape.text || shape.content || '';
      const textX = shape.x !== null && shape.x !== undefined
        ? (shape.x / 100) * containerWidth
        : x1;
      const textY = shape.y !== null && shape.y !== undefined
        ? (shape.y / 100) * containerHeight
        : y1;
      const scaleWidth = textScaleWidth ?? containerWidth;
      const fontSize = scaleWidth * ((shape.fontSize ?? 5) / 100);
      const padding = fontSize * 0.4;

      return (
        <g>
          <foreignObject
            x={textX}
            y={textY - fontSize - padding}
            width="1"
            height="1"
            overflow="visible"
            style={{ pointerEvents: isDrawModeActive ? 'none' : 'auto' }}
          >
            <div
              style={{
                display: 'inline-block',
                backgroundColor: strokeColor,
                borderRadius: `${padding}px`,
                padding: `${padding * 0.5}px ${padding}px`,
                cursor: isSelected ? 'move' : 'pointer',
                ...(isLightTheme ? { border: '1px solid rgba(0, 0, 0, 0.25)' } : {}),
                ...(isSelected ? { outline: '2px solid rgba(0, 102, 204, 0.8)' } : {}),
              }}
              onClick={!isSelected ? onClick : undefined}
              onMouseDown={handleMouseDown}
              onDoubleClick={isSelected ? onDoubleClick : undefined}
            >
              <span
                style={{
                  color: textColor,
                  fontSize: `${fontSize}px`,
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.2,
                  pointerEvents: 'none',
                }}
              >
                {textContent}
              </span>
            </div>
          </foreignObject>
        </g>
      );
    }

    case 'freehand':
      return (
        <FreehandShape
          points={shape.points}
          containerWidth={containerWidth}
          containerHeight={containerHeight}
          commonProps={commonProps}
          hitAreaProps={hitAreaProps}
        />
      );

    default:
      return null;
  }
}
