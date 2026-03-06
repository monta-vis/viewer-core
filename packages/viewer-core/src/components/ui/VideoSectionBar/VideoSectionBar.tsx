import type { ReactNode } from 'react';

export interface VideoSectionBarProps {
  index: number;
  startFrame: number;
  endFrame: number;
  totalFrames: number;
  fps: number;
  selected?: boolean;
  onClick?: () => void;
  children?: ReactNode;
}

export function VideoSectionBar({
  index,
  startFrame,
  endFrame,
  totalFrames,
  fps,
  selected = false,
  onClick,
  children,
}: VideoSectionBarProps) {
  const widthPct = ((endFrame - startFrame) / totalFrames) * 100;
  const leftPct = (startFrame / totalFrames) * 100;
  const durationSec = (endFrame - startFrame) / fps;

  return (
    <div
      className={`absolute top-0 h-full rounded border-2 border-green-500 bg-green-500/20 cursor-pointer select-none flex items-center justify-between px-1 ${
        selected ? 'ring-2 ring-green-400 ring-offset-1' : ''
      }`}
      style={{ width: `${widthPct}%`, left: `${leftPct}%` }}
      onClick={onClick}
      data-testid="video-section-bar"
    >
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-600 text-[0.625rem] font-bold text-white">
        {index + 1}
      </span>
      <span className="text-[0.625rem] text-[var(--color-text-muted)]">
        {durationSec.toFixed(1)}s
      </span>
      {children}
    </div>
  );
}
