/**
 * TimelineRegion - A single cut region overlay on the timeline.
 *
 * Renders the region with drag handles for resizing.
 */

import { useTranslation } from 'react-i18next';
import { formatTimecode } from '../../utils/trimUtils';
import type { CutRegion } from '../../types/trim.types';

const REGION_BASE =
  'absolute inset-y-1 rounded cursor-move bg-[var(--color-error)]/30 border-2 bg-gradient-to-r from-[var(--color-error)]/20 via-[var(--color-error)]/40 to-[var(--color-error)]/20';
const REGION_SELECTED = 'border-[var(--color-error)]';
const REGION_UNSELECTED = 'border-[var(--color-error)]/50';

export interface TimelineRegionProps {
  region: CutRegion;
  isSelected: boolean;
  leftPercent: number;
  widthPercent: number;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent, handle: 'start' | 'end' | 'move') => void;
}

export function TimelineRegion({
  region,
  isSelected,
  leftPercent,
  widthPercent,
  onSelect,
  onDragStart,
}: TimelineRegionProps) {
  const { t } = useTranslation();

  return (
    <div
      data-region
      role="button"
      aria-label={t('editorCore.videoTrim.cutRegion', {
        start: formatTimecode(region.startTime),
        end: formatTimecode(region.endTime),
        defaultValue: `Cut region ${formatTimecode(region.startTime)} - ${formatTimecode(region.endTime)}`,
      })}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseDown={(e) => onDragStart(e, 'move')}
      className={`${REGION_BASE} ${isSelected ? REGION_SELECTED : REGION_UNSELECTED}`}
      style={{
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
      }}
    >
      {/* Start handle */}
      <div
        role="slider"
        aria-label={t('editorCore.videoTrim.startHandle', 'Start handle')}
        onMouseDown={(e) => {
          e.stopPropagation();
          onDragStart(e, 'start');
        }}
        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-[var(--color-error)] hover:bg-[var(--color-error)]/80 rounded-l"
      />
      {/* End handle */}
      <div
        role="slider"
        aria-label={t('editorCore.videoTrim.endHandle', 'End handle')}
        onMouseDown={(e) => {
          e.stopPropagation();
          onDragStart(e, 'end');
        }}
        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-[var(--color-error)] hover:bg-[var(--color-error)]/80 rounded-r"
      />
    </div>
  );
}
