import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { ViewportKeyframeRow } from '@monta-vis/viewer-core';

export interface KeyframeContextMenuEvent {
  frame: number;
  clientX: number;
  clientY: number;
  interpolation: 'hold' | 'linear';
}

export interface ViewportKeyframeTimelineProps {
  keyframes: ViewportKeyframeRow[];
  totalFrames: number;
  onSeek: (frame: number) => void;
  onContextMenu?: (event: KeyframeContextMenuEvent) => void;
}

export function ViewportKeyframeTimeline({
  keyframes,
  totalFrames,
  onSeek,
  onContextMenu,
}: ViewportKeyframeTimelineProps) {
  const { t } = useTranslation();

  const handleBarClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      const frame = Math.round(pct * totalFrames);
      onSeek(Math.max(0, Math.min(frame, totalFrames)));
    },
    [totalFrames, onSeek],
  );

  const handleMarkerContextMenu = useCallback(
    (e: React.MouseEvent, kf: ViewportKeyframeRow) => {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu?.({
        frame: kf.frameNumber,
        clientX: e.clientX,
        clientY: e.clientY,
        interpolation: kf.interpolation ?? 'hold',
      });
    },
    [onContextMenu],
  );

  return (
    <div className="relative w-full" data-testid="viewport-keyframe-timeline">
      {/* Clickable bar */}
      <div
        data-testid="keyframe-timeline-bar"
        className="relative h-5 w-full cursor-pointer rounded bg-[var(--color-bg-elevated)] border border-[var(--color-border)]"
        onClick={handleBarClick}
        aria-label={t(
          'editorCore.viewportKeyframeTimeline',
          'Viewport keyframe timeline',
        )}
      >
        {/* Keyframe markers */}
        {keyframes.map((kf) => {
          const leftPct =
            totalFrames > 0 ? (kf.frameNumber / totalFrames) * 100 : 0;
          const isLinear = kf.interpolation === 'linear';

          return (
            <div
              key={kf.id}
              data-testid="keyframe-marker"
              className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer ${
                isLinear ? 'text-pink-500' : 'text-yellow-500'
              }`}
              style={{ left: `${leftPct}%` }}
              onContextMenu={(e) => handleMarkerContextMenu(e, kf)}
            >
              {/* Diamond shape */}
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                className="fill-current"
              >
                <polygon points="5,0 10,5 5,10 0,5" />
              </svg>
            </div>
          );
        })}

      </div>
    </div>
  );
}
