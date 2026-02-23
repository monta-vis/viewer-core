import { clsx } from 'clsx';
import {
  type AreaData,
  type Rectangle,
  type AreaResizeHandle,
  AREA_COLORS,
  AREA_HANDLE_CURSORS,
} from '../types';
import { useShiftKey } from '../hooks/useShiftKey';

// Re-export for backwards compatibility
export type VideoFrameAreaData = AreaData;
export type ResizeHandle = AreaResizeHandle;

interface AreaHighlightProps {
  /** Area data */
  area: VideoFrameAreaData;
  /** Is this area selected */
  selected?: boolean;
  /** Is this area being frame-edited (frame follows playhead) */
  editing?: boolean;
  /** Click handler */
  onClick?: (areaId: string) => void;
  /** Resize/Move start handler */
  onResizeStart?: (areaId: string, handle: ResizeHandle, initialRect: Rectangle, e?: React.MouseEvent) => void;
  /** Right-click context menu handler */
  onContextMenu?: (areaId: string, e: React.MouseEvent) => void;
}

// Use constants from types (already imported)

/**
 * AreaHighlight Component
 *
 * PowerPoint-style area selection with 8 resize handles.
 * Delete with DEL key when selected.
 */
export function AreaHighlight({
  area,
  selected = false,
  editing = false,
  onClick,
  onResizeStart,
  onContextMenu,
}: AreaHighlightProps) {
  const isShiftPressed = useShiftKey();
  // Use color override if set, otherwise use type-based color
  const color = area.color ?? AREA_COLORS[area.type || 'SubstepImage'] ?? AREA_COLORS.SubstepImage;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(area.id);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu?.(area.id, e);
  };

  const handleResizeStart = (e: React.MouseEvent, handle: ResizeHandle) => {
    e.stopPropagation();
    e.preventDefault();
    const rect: Rectangle = {
      x: area.x,
      y: area.y,
      width: area.width,
      height: area.height,
    };
    onResizeStart?.(area.id, handle, rect, e);
  };

  // Handle border mousedown - move if selected, otherwise just prevent propagation
  const handleBorderMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selected) {
      // Start move operation
      e.preventDefault();
      const rect: Rectangle = {
        x: area.x,
        y: area.y,
        width: area.width,
        height: area.height,
      };
      onResizeStart?.(area.id, 'move', rect, e);
    }
  };

  // Render a single resize handle - always clickable even in draw mode
  const renderHandle = (handle: ResizeHandle, positionClasses: string) => (
    <div
      key={handle}
      className={clsx(
        'absolute w-2.5 h-2.5 pointer-events-auto',
        'bg-white border border-[var(--color-border-base)]',
        'rounded-full shadow-sm',
        'hover:scale-125 transition-transform duration-100',
        positionClasses
      )}
      style={{ cursor: AREA_HANDLE_CURSORS[handle] }}
      onMouseDown={(e) => handleResizeStart(e, handle)}
    />
  );

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${area.x}%`,
        top: `${area.y}%`,
        width: `${area.width}%`,
        height: `${area.height}%`,
      }}
      title={area.label}
      onContextMenu={handleContextMenu}
    >
      {/* Clickable border only (PowerPoint-style) - 4 edge divs */}
      {/* Borders are ALWAYS clickable - even in draw mode, to allow area selection */}
      {/* Top edge */}
      <div
        className="absolute left-0 right-0 top-0 h-2 pointer-events-auto"
        style={{ cursor: selected ? 'move' : 'pointer' }}
        onMouseDown={handleBorderMouseDown}
        onClick={handleClick}
      />
      {/* Bottom edge */}
      <div
        className="absolute left-0 right-0 bottom-0 h-2 pointer-events-auto"
        style={{ cursor: selected ? 'move' : 'pointer' }}
        onMouseDown={handleBorderMouseDown}
        onClick={handleClick}
      />
      {/* Left edge */}
      <div
        className="absolute top-0 bottom-0 left-0 w-2 pointer-events-auto"
        style={{ cursor: selected ? 'move' : 'pointer' }}
        onMouseDown={handleBorderMouseDown}
        onClick={handleClick}
      />
      {/* Right edge */}
      <div
        className="absolute top-0 bottom-0 right-0 w-2 pointer-events-auto"
        style={{ cursor: selected ? 'move' : 'pointer' }}
        onMouseDown={handleBorderMouseDown}
        onClick={handleClick}
      />

      {/* Visual border (non-interactive) */}
      <div
        className={clsx(
          'absolute inset-0 border-2 pointer-events-none',
          'transition-all duration-150'
        )}
        style={{
          borderColor: color,
          backgroundColor: selected ? `${color}15` : 'transparent',
          boxShadow: editing
            ? `0 0 12px 4px ${color}, inset 0 0 8px 2px ${color}40`
            : undefined,
        }}
      />

      {/* PowerPoint-style 8 resize handles */}
      {selected && (
        <>
          {/* Corners */}
          {renderHandle('topLeft', '-top-1 -left-1')}
          {renderHandle('topRight', '-top-1 -right-1')}
          {renderHandle('bottomLeft', '-bottom-1 -left-1')}
          {renderHandle('bottomRight', '-bottom-1 -right-1')}

          {/* Edge midpoints - only shown when Shift is pressed (for free resize mode) */}
          {isShiftPressed && (
            <>
              {renderHandle('top', '-top-1 left-1/2 -translate-x-1/2')}
              {renderHandle('bottom', '-bottom-1 left-1/2 -translate-x-1/2')}
              {renderHandle('left', 'top-1/2 -left-1 -translate-y-1/2')}
              {renderHandle('right', 'top-1/2 -right-1 -translate-y-1/2')}
            </>
          )}
        </>
      )}

      {/* Label - clickable like borders (selects area, move when selected) */}
      {area.label && (
        <span
          className="absolute -top-5 left-0 text-[0.625rem] text-white px-1 rounded whitespace-nowrap pointer-events-auto"
          style={{ backgroundColor: color, cursor: selected ? 'move' : 'pointer' }}
          onClick={handleClick}
          onMouseDown={handleBorderMouseDown}
        >
          {area.label}
        </span>
      )}
    </div>
  );
}
