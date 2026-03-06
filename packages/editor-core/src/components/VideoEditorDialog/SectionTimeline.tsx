import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';

export interface SectionData {
  startFrame: number;
  endFrame: number;
}

export interface SectionTimelineProps {
  sections: SectionData[];
  totalFrames: number;
  fps: number;
  selectedIndex: number;
  onSelectSection: (index: number) => void;
  onSectionChange: (index: number, section: SectionData) => void;
  onSeek: (frame: number) => void;
}

const MIN_SECTION_FRAMES = 2;

export function SectionTimeline({
  sections,
  totalFrames,
  fps: _fps,
  selectedIndex,
  onSelectSection,
  onSectionChange,
  onSeek,
}: SectionTimelineProps) {
  const { t } = useTranslation();
  const trackRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    sectionIndex: number;
    edge: 'left' | 'right';
  } | null>(null);

  const getFrameFromClientX = useCallback(
    (clientX: number): number => {
      const track = trackRef.current;
      if (!track) return 0;
      const rect = track.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Math.round(pct * totalFrames);
    },
    [totalFrames],
  );

  const handleTrackClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return;
      onSeek(getFrameFromClientX(e.clientX));
    },
    [onSeek, getFrameFromClientX],
  );

  // Use refs for stable event handler identity during drags
  const handleMouseMoveImpl = useCallback(
    (e: MouseEvent) => {
      if (!dragState.current) return;
      const { sectionIndex, edge } = dragState.current;
      const frame = getFrameFromClientX(e.clientX);
      const section = sections[sectionIndex];
      if (!section) return;

      if (edge === 'left') {
        const maxStart = section.endFrame - MIN_SECTION_FRAMES;
        const newStart = Math.max(0, Math.min(frame, maxStart));
        onSectionChange(sectionIndex, {
          startFrame: newStart,
          endFrame: section.endFrame,
        });
      } else {
        const minEnd = section.startFrame + MIN_SECTION_FRAMES;
        const newEnd = Math.max(minEnd, Math.min(frame, totalFrames));
        onSectionChange(sectionIndex, {
          startFrame: section.startFrame,
          endFrame: newEnd,
        });
      }
    },
    [sections, totalFrames, onSectionChange, getFrameFromClientX],
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

  const startHandleDrag = useCallback(
    (e: React.MouseEvent, sectionIndex: number, edge: 'left' | 'right') => {
      e.preventDefault();
      e.stopPropagation();
      dragState.current = { sectionIndex, edge };
      document.addEventListener('mousemove', stableMouseMove);
      document.addEventListener('mouseup', stableMouseUp);
    },
    [stableMouseMove, stableMouseUp],
  );

  return (
    <div className="relative w-full" data-testid="section-timeline">
      <div
        ref={trackRef}
        data-testid="section-timeline-track"
        className="relative h-6 w-full rounded bg-[var(--color-bg-surface)] border border-[var(--color-border-base)] cursor-pointer"
        onClick={handleTrackClick}
        aria-label={t('editorCore.videoEditor.sectionTimeline', 'Section timeline')}
      >
        {sections.map((section, idx) => {
          const leftPct = (section.startFrame / totalFrames) * 100;
          const widthPct = ((section.endFrame - section.startFrame) / totalFrames) * 100;
          const isSelected = idx === selectedIndex;

          return (
            <div
              key={idx}
              data-testid="video-section-bar"
              className={clsx(
                'absolute top-1 bottom-1 rounded-sm cursor-pointer',
                isSelected && 'ring-2 ring-white',
              )}
              style={{
                left: `${leftPct}%`,
                width: `${widthPct}%`,
                backgroundColor: 'var(--color-element-drawing)',
                opacity: 0.6,
              }}
              onClick={() => onSelectSection(idx)}
            >
              {/* Left drag handle */}
              <button
                type="button"
                data-testid="section-handle-left"
                className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center hover:bg-white/20 transition-colors"
                onMouseDown={(e) => startHandleDrag(e, idx, 'left')}
                aria-label={t('editorCore.videoEditor.sectionHandleLeft', 'Resize section start')}
              >
                <div className="w-0.5 h-4 bg-white rounded-full" />
              </button>
              {/* Right drag handle */}
              <button
                type="button"
                data-testid="section-handle-right"
                className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center hover:bg-white/20 transition-colors"
                onMouseDown={(e) => startHandleDrag(e, idx, 'right')}
                aria-label={t('editorCore.videoEditor.sectionHandleRight', 'Resize section end')}
              >
                <div className="w-0.5 h-4 bg-white rounded-full" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
