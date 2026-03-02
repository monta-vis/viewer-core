/**
 * Timeline component for video trimming.
 *
 * Shows video duration with cut region overlays.
 * Users can click to seek, double-click to add cut region,
 * drag handles to resize, or press Delete to remove.
 * Drag from edges to create cuts from start/end of video.
 */

import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { generateCutId, mergeOverlappingRegions } from '../../utils/trimUtils';
import type { CutRegion } from '../../types/trim.types';
import { TimelineRegion } from './TimelineRegion';
import { CutRegionList } from './CutRegionList';
import { useTrimDrag } from './useTrimDrag';
import { useRegionManagement } from './useRegionManagement';

import { MIN_REGION_DURATION, EDGE_GRAB_WIDTH } from './trimConstants';

export interface TrimTimelineProps {
  duration: number;
  currentTime: number;
  regions: CutRegion[];
  onSeek: (time: number) => void;
  onRegionsChange: (regions: CutRegion[]) => void;
}

export function TrimTimeline({
  duration,
  currentTime,
  regions,
  onSeek,
  onRegionsChange,
}: TrimTimelineProps) {
  const { t } = useTranslation();
  const timelineRef = useRef<HTMLDivElement>(null);

  // Edge drag state - region shown during drag, confirmed on release
  const [edgeDragRegion, setEdgeDragRegion] = useState<{
    startTime: number;
    endTime: number;
  } | null>(null);
  const [isEdgeDragging, setIsEdgeDragging] = useState(false);

  const { dragging, handleDragStart } = useTrimDrag({
    timelineRef,
    duration,
    regions,
    onRegionsChange,
  });

  const { selectedRegionId, setSelectedRegionId, handleDeleteRegion } = useRegionManagement({
    regions,
    onRegionsChange,
  });

  const timeToPercent = useCallback(
    (time: number) => (duration <= 0 ? 0 : (time / duration) * 100),
    [duration],
  );

  const positionToTime = useCallback(
    (clientX: number) => {
      if (!timelineRef.current || duration <= 0) return 0;
      const rect = timelineRef.current.getBoundingClientRect();
      return Math.max(0, Math.min(duration, ((clientX - rect.left) / rect.width) * duration));
    },
    [duration],
  );

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('[data-region]')) return;
      if ((e.target as HTMLElement).closest('[data-edge-zone]')) return;
      onSeek(positionToTime(e.clientX));
    },
    [positionToTime, onSeek],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('[data-region]')) return;
      if ((e.target as HTMLElement).closest('[data-edge-zone]')) return;
      const clickTime = positionToTime(e.clientX);
      const defaultDur = Math.min(5, duration * 0.1);
      const newRegion: CutRegion = {
        id: generateCutId(),
        startTime: Math.max(0, clickTime - defaultDur / 2),
        endTime: Math.min(duration, clickTime + defaultDur / 2),
      };
      onRegionsChange([...regions, newRegion]);
      setSelectedRegionId(newRegion.id);
    },
    [positionToTime, duration, regions, onRegionsChange, setSelectedRegionId],
  );

  // Handle playhead drag
  const handlePlayheadMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const time = positionToTime(moveEvent.clientX);
        onSeek(time);
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [positionToTime, onSeek],
  );

  // Handle edge drag (create cut from start or end)
  const handleEdgeMouseDown = useCallback(
    (e: React.MouseEvent, edge: 'start' | 'end') => {
      e.stopPropagation();
      e.preventDefault();

      setIsEdgeDragging(true);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const time = positionToTime(moveEvent.clientX);

        if (edge === 'start') {
          // Cut from 0 to current position
          if (time > MIN_REGION_DURATION) {
            setEdgeDragRegion({ startTime: 0, endTime: time });
          }
        } else {
          // Cut from current position to end
          if (duration - time > MIN_REGION_DURATION) {
            setEdgeDragRegion({ startTime: time, endTime: duration });
          }
        }

        onSeek(time);
      };

      const handleMouseUp = () => {
        // Create confirmed cut from edge drag region
        setEdgeDragRegion((region) => {
          if (region && region.endTime - region.startTime >= MIN_REGION_DURATION) {
            const newRegion: CutRegion = {
              id: generateCutId(),
              startTime: region.startTime,
              endTime: region.endTime,
            };
            const merged = mergeOverlappingRegions([...regions, newRegion]);
            onRegionsChange(merged);
          }
          return null;
        });

        setIsEdgeDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [positionToTime, duration, regions, onRegionsChange, onSeek],
  );

  const onRegionDragStart = useCallback(
    (e: React.MouseEvent, regionId: string, handle: 'start' | 'end' | 'move') => {
      handleDragStart(e, regionId, handle);
      setSelectedRegionId(regionId);
    },
    [handleDragStart, setSelectedRegionId],
  );

  return (
    <div className="space-y-2">
      <div
        ref={timelineRef}
        role="slider"
        aria-label={t('editorCore.videoTrim.timeline', 'Timeline')}
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
        tabIndex={0}
        onClick={handleTimelineClick}
        onDoubleClick={handleDoubleClick}
        className={`relative h-12 rounded-lg cursor-pointer bg-[var(--color-bg-surface)] border border-[var(--color-border-base)] ${dragging || isEdgeDragging ? 'cursor-ew-resize' : ''}`}
      >
        {/* Progress indicator */}
        <div
          className="absolute inset-y-0 left-0 bg-[var(--color-primary)]/10 rounded-l-lg"
          style={{ width: `${timeToPercent(currentTime)}%` }}
        />

        {/* Edge grab zone - START (left side) */}
        <div
          data-edge-zone="start"
          className="absolute top-0 bottom-0 cursor-e-resize z-20 hover:bg-[var(--color-error)]/20 transition-colors rounded-l-lg"
          style={{ left: 0, width: EDGE_GRAB_WIDTH }}
          onMouseDown={(e) => handleEdgeMouseDown(e, 'start')}
        >
          {/* Visual indicator at left edge */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-error)]/60 hover:bg-[var(--color-error)] rounded-r transition-colors" />
        </div>

        {/* Edge grab zone - END (right side) */}
        <div
          data-edge-zone="end"
          className="absolute top-0 bottom-0 cursor-w-resize z-20 hover:bg-[var(--color-error)]/20 transition-colors rounded-r-lg"
          style={{ right: 0, width: EDGE_GRAB_WIDTH }}
          onMouseDown={(e) => handleEdgeMouseDown(e, 'end')}
        >
          {/* Visual indicator at right edge */}
          <div className="absolute right-0 top-0 bottom-0 w-1 bg-[var(--color-error)]/60 hover:bg-[var(--color-error)] rounded-l transition-colors" />
        </div>

        {/* Existing cut regions */}
        {regions.map((region) => (
          <TimelineRegion
            key={region.id}
            region={region}
            isSelected={selectedRegionId === region.id}
            leftPercent={timeToPercent(region.startTime)}
            widthPercent={timeToPercent(region.endTime) - timeToPercent(region.startTime)}
            onSelect={() => setSelectedRegionId(region.id)}
            onDragStart={(e, handle) => onRegionDragStart(e, region.id, handle)}
          />
        ))}

        {/* Edge drag region (shown during drag, red striped) */}
        {edgeDragRegion && (
          <div
            className="absolute top-1 bottom-1 rounded ring-2 ring-white/50 z-10"
            style={{
              left: `${timeToPercent(edgeDragRegion.startTime)}%`,
              width: `${Math.max(timeToPercent(edgeDragRegion.endTime) - timeToPercent(edgeDragRegion.startTime), 1)}%`,
              background: `repeating-linear-gradient(
                -45deg,
                rgba(239, 68, 68, 0.8),
                rgba(239, 68, 68, 0.8) 4px,
                rgba(185, 28, 28, 0.8) 4px,
                rgba(185, 28, 28, 0.8) 8px
              )`,
            }}
          >
            {/* Handles at edges */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-white/90 rounded-r" />
            <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-white/90 rounded-l" />
          </div>
        )}

        {/* Playhead - draggable, above everything */}
        <div
          aria-label={t('editorCore.videoTrim.playhead', 'Playhead')}
          className="absolute z-50 cursor-ew-resize"
          style={{
            left: `calc(${timeToPercent(currentTime)}% - 0.75rem)`,
            top: 0,
            bottom: 0,
            width: '1.5rem', // Larger hit area for easier grabbing
          }}
          onMouseDown={handlePlayheadMouseDown}
        >
          {/* Playhead line */}
          <div
            className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-white shadow-[0_0_4px_rgba(255,255,255,0.5)]"
          />
          {/* Playhead handle */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.5)]" />
        </div>
      </div>
      <CutRegionList
        regions={regions}
        selectedRegionId={selectedRegionId}
        onDelete={handleDeleteRegion}
      />
    </div>
  );
}
