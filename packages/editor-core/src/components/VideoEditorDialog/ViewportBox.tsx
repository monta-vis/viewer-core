import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MIN_VIEWPORT_SIZE } from './viewportUtils';

const clamp = (val: number, min: number, max: number) =>
  Math.min(Math.max(val, min), max);

export interface ViewportBoxProps {
  x: number;
  y: number;
  width: number;
  height: number;
  containerWidth: number;
  containerHeight: number;
  onChange: (viewport: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
}

type Corner = 'tl' | 'tr' | 'bl' | 'br';

export function ViewportBox({
  x,
  y,
  width,
  height,
  containerWidth,
  containerHeight,
  onChange,
}: ViewportBoxProps) {
  const { t } = useTranslation();
  const dragState = useRef<{
    type: 'move' | 'resize';
    corner?: Corner;
    startMouseX: number;
    startMouseY: number;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

  const handleMouseMoveImpl = useCallback(
    (e: MouseEvent) => {
      if (!dragState.current || containerWidth <= 0 || containerHeight <= 0)
        return;

      const dx = (e.clientX - dragState.current.startMouseX) / containerWidth;
      const dy =
        (e.clientY - dragState.current.startMouseY) / containerHeight;
      const { startX, startY, startW, startH, type, corner } =
        dragState.current;

      if (type === 'move') {
        onChange({
          x: clamp(startX + dx, 0, 1 - startW),
          y: clamp(startY + dy, 0, 1 - startH),
          width: startW,
          height: startH,
        });
      } else if (type === 'resize' && corner) {
        let newX = startX;
        let newY = startY;
        let newW = startW;
        let newH = startH;

        if (corner === 'br' || corner === 'tr') {
          newW = clamp(startW + dx, MIN_VIEWPORT_SIZE, 1 - startX);
        } else {
          newW = clamp(startW - dx, MIN_VIEWPORT_SIZE, startX + startW);
          newX = startX + startW - newW;
        }

        if (corner === 'br' || corner === 'bl') {
          newH = clamp(startH + dy, MIN_VIEWPORT_SIZE, 1 - startY);
        } else {
          newH = clamp(startH - dy, MIN_VIEWPORT_SIZE, startY + startH);
          newY = startY + startH - newH;
        }

        onChange({ x: newX, y: newY, width: newW, height: newH });
      }
    },
    [containerWidth, containerHeight, onChange],
  );

  const mouseMoveRef = useRef(handleMouseMoveImpl);
  mouseMoveRef.current = handleMouseMoveImpl;

  const stableMouseMove = useCallback((e: MouseEvent) => mouseMoveRef.current(e), []);
  const stableMouseUp = useCallback(() => {
    dragState.current = null;
    document.removeEventListener('mousemove', stableMouseMove);
    document.removeEventListener('mouseup', stableMouseUp);
  }, [stableMouseMove]);

  // Cleanup on unmount to prevent listener leaks if component unmounts mid-drag
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', stableMouseMove);
      document.removeEventListener('mouseup', stableMouseUp);
    };
  }, [stableMouseMove, stableMouseUp]);

  const startDrag = useCallback(
    (e: React.MouseEvent, type: 'move' | 'resize', corner?: Corner) => {
      e.preventDefault();
      e.stopPropagation();
      dragState.current = {
        type,
        corner,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startX: x,
        startY: y,
        startW: width,
        startH: height,
      };
      document.addEventListener('mousemove', stableMouseMove);
      document.addEventListener('mouseup', stableMouseUp);
    },
    [x, y, width, height, stableMouseMove, stableMouseUp],
  );

  if (containerWidth <= 0 || containerHeight <= 0) return null;

  const pxLeft = x * containerWidth;
  const pxTop = y * containerHeight;
  const pxWidth = width * containerWidth;
  const pxHeight = height * containerHeight;

  const corners = useMemo<{ key: Corner; label: string; className: string }[]>(() => [
    {
      key: 'tl',
      label: t('editorCore.videoEditor.resizeTopLeft', 'Resize top-left'),
      className: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2',
    },
    {
      key: 'tr',
      label: t('editorCore.videoEditor.resizeTopRight', 'Resize top-right'),
      className: 'top-0 right-0 translate-x-1/2 -translate-y-1/2',
    },
    {
      key: 'bl',
      label: t('editorCore.videoEditor.resizeBottomLeft', 'Resize bottom-left'),
      className: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2',
    },
    {
      key: 'br',
      label: t('editorCore.videoEditor.resizeBottomRight', 'Resize bottom-right'),
      className: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2',
    },
  ], [t]);

  return (
    <div
      data-testid="viewport-box"
      className="absolute border-2 border-orange-500 cursor-move"
      style={{
        left: `${pxLeft}px`,
        top: `${pxTop}px`,
        width: `${pxWidth}px`,
        height: `${pxHeight}px`,
      }}
      onMouseDown={(e) => startDrag(e, 'move')}
    >
      {corners.map(({ key, label, className }) => (
        <button
          key={key}
          type="button"
          aria-label={label}
          className={`absolute h-2.5 w-2.5 rounded-full bg-orange-500 cursor-nwse-resize border-0 p-0 ${className}`}
          onMouseDown={(e) => startDrag(e, 'resize', key)}
        />
      ))}
    </div>
  );
}
