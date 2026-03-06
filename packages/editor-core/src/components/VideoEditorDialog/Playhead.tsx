import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { formatTimecodeWithFrames } from '@monta-vis/viewer-core';

export interface PlayheadProps {
  /** Position as percentage (0-100) */
  position: number;
  /** Total track height in rem for full-height spanning */
  trackHeight: number;
  /** Current time in seconds */
  currentTime: number;
  /** Current frame number */
  currentFrame: number;
  /** Frames per second */
  fps: number;
  /** Ref to the track element for drag coordinate calculations. Falls back to [data-timeline-track] query. */
  trackRef?: RefObject<HTMLElement | null>;
  /** Called when user starts dragging the playhead */
  onDragStart?: () => void;
  /** Called during drag with position percentage (clamped 0-100) and raw percentage (can be outside) */
  onDrag?: (positionPercent: number, rawPercent?: number) => void;
  /** Called when drag ends */
  onDragEnd?: () => void;
}

/**
 * Timeline Playhead Component
 *
 * Yellow vertical line with grab handle, tooltip, and drag-to-seek.
 * Spans full height of all timeline tracks.
 */
export function Playhead({
  position,
  trackHeight,
  currentTime,
  currentFrame,
  fps,
  trackRef,
  onDragStart,
  onDrag,
  onDragEnd,
}: PlayheadProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Use refs for callbacks to avoid stale closures during drag
  const onDragRef = useRef(onDrag);
  onDragRef.current = onDrag;
  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;

  const trackElementRef = useRef<HTMLElement | null>(null);

  const handleMouseMove = useCallback((moveEvent: MouseEvent) => {
    const track = trackElementRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const x = moveEvent.clientX - rect.left;
    const rawPercent = (x / rect.width) * 100;
    const clampedPercent = Math.max(0, Math.min(100, rawPercent));
    onDragRef.current?.(clampedPercent, rawPercent);
  }, []);

  const handleMouseUp = useCallback(() => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    setIsDragging(false);
    onDragEndRef.current?.();
  }, [handleMouseMove]);

  // Cleanup on unmount to prevent listener leaks if component unmounts mid-drag
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
    onDragStart?.();

    const timelineTrack = trackRef?.current ?? document.querySelector('[data-timeline-track]') as HTMLElement | null;
    if (!timelineTrack) return;

    trackElementRef.current = timelineTrack;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [trackRef, onDragStart, handleMouseMove, handleMouseUp]);

  const active = isHovered || isDragging;

  return (
    <div
      data-testid="playhead"
      className={`absolute top-0 z-50 cursor-ew-resize pointer-events-auto w-6 -ml-3 playhead-container`}
      style={{
        left: `${position}%`,
        height: `${trackHeight}rem`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => !isDragging && setIsHovered(false)}
      onMouseDown={handleMouseDown}
    >
      {/* Grab handle at top */}
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-full h-12 flex items-start justify-center">
        <div
          className={`bg-[var(--color-playhead)] rounded-sm transition-all duration-150 pointer-events-none ${
            active ? 'w-3 h-3' : 'w-2 h-2'
          }`}
        />
      </div>

      {/* Playhead line - spans full track height */}
      <div
        className={`absolute top-0 left-1/2 -translate-x-1/2 bg-[var(--color-playhead)] transition-all duration-150 pointer-events-none ${
          active
            ? 'w-[var(--playhead-width-active)]'
            : 'w-[var(--playhead-width)]'
        }`}
        style={{ height: `${trackHeight}rem` }}
      />

      {/* Timecode tooltip */}
      {active && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-2 py-1.5 rounded-md bg-[var(--color-bg-elevated)] border border-[var(--color-border-base)] text-sm font-mono whitespace-nowrap shadow-lg pointer-events-none z-50">
          <div className="text-[var(--color-text-base)] font-semibold">
            {formatTimecodeWithFrames(currentTime, fps)}
          </div>
          <div className="text-[var(--color-text-muted)] text-xs">
            Frame {currentFrame}
          </div>
        </div>
      )}
    </div>
  );
}
