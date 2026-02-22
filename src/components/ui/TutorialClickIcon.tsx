import { MousePointerClick } from 'lucide-react';

type LabelPosition = 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface TutorialClickIconProps {
  /** Where the click icon sits on the parent. Default: `"center"`. */
  iconPosition?: 'center' | 'bottom-right';
  /** Where the label bubble appears relative to the icon. Default: `"bottom"`. */
  labelPosition?: LabelPosition;
  /** Optional hint text shown as a glass speech bubble. */
  label?: string;
  /** Fixed width for the bubble (e.g. `"10rem"`). Default: auto-sized by content. */
  labelWidth?: string;
}

const BUBBLE_CLASS = 'whitespace-pre-line text-center rounded-lg border border-[var(--color-tutorial)]/40 bg-[var(--color-tutorial)]/60 backdrop-blur-md px-2.5 py-1.5 text-sm font-semibold leading-tight text-[var(--color-accent-text)] shadow-sm';

/** Small triangle SVG pointing toward the icon. */
function Triangle({ direction, className }: { direction: 'up' | 'down' | 'left' | 'right'; className?: string }) {
  const paths = { up: 'M4 0L8 4H0z', down: 'M0 0h8L4 4z', left: 'M0 4L4 0v8z', right: 'M4 0v8l4-4z' };
  const vertical = direction === 'up' || direction === 'down';
  return (
    <svg
      width={vertical ? 8 : 4}
      height={vertical ? 4 : 8}
      viewBox={vertical ? '0 0 8 4' : '0 0 4 8'}
      className={`text-[var(--color-tutorial)]/40 shrink-0 ${className ?? ''}`}
    >
      <path d={paths[direction]} fill="currentColor" />
    </svg>
  );
}

/**
 * Config per label position:
 * - triangle: direction it points (toward the icon)
 * - triangleAlign: Tailwind self-alignment for diagonal corners
 * - style: absolute offset from the icon
 * - layout: flex classes for the bubble container
 * - triangleFirst: whether triangle renders before the text
 */
const LABEL_CONFIG: Record<LabelPosition, {
  triangle: 'up' | 'down' | 'left' | 'right';
  triangleAlign?: string;
  style: React.CSSProperties;
  layout: string;
  triangleFirst: boolean;
}> = {
  top:            { triangle: 'down',  style: { bottom: '100%', left: '50%', transform: 'translateX(-50%)' }, layout: 'flex-col items-center', triangleFirst: false },
  bottom:         { triangle: 'up',    style: { top: '100%', left: '50%', transform: 'translateX(-50%)' },    layout: 'flex-col items-center', triangleFirst: true },
  left:           { triangle: 'right', style: { right: '100%', top: '50%', transform: 'translateY(-50%)' },   layout: 'flex-row items-center', triangleFirst: false },
  right:          { triangle: 'left',  style: { left: '100%', top: '50%', transform: 'translateY(-50%)' },    layout: 'flex-row items-center', triangleFirst: true },
  'top-left':     { triangle: 'down',  triangleAlign: 'self-end',   style: { bottom: '100%', right: '0' },    layout: 'flex-col', triangleFirst: false },
  'top-right':    { triangle: 'down',  triangleAlign: 'self-start', style: { bottom: '100%', left: '0' },     layout: 'flex-col', triangleFirst: false },
  'bottom-left':  { triangle: 'up',    triangleAlign: 'self-end',   style: { top: '100%', right: '0' },       layout: 'flex-col', triangleFirst: true },
  'bottom-right': { triangle: 'up',    triangleAlign: 'self-start', style: { top: '100%', left: '0' },        layout: 'flex-col', triangleFirst: true },
};

/**
 * Pulsing click icon overlay with optional glass speech bubble.
 * Parent must have `position: relative`.
 */
export function TutorialClickIcon({ iconPosition = 'center', labelPosition = 'bottom', label, labelWidth }: TutorialClickIconProps) {
  const cfg = LABEL_CONFIG[labelPosition];

  const posClass = iconPosition === 'bottom-right'
    ? 'absolute right-0 bottom-0 -translate-x-1/4 -translate-y-1/4'
    : 'absolute inset-0 flex items-center justify-center';

  return (
    <div className={`${posClass} pointer-events-none z-10`}>
      <div className="relative">
        <MousePointerClick className="w-7 h-7 text-[var(--color-tutorial)] animate-pulse drop-shadow-md" />
        {label && (
          <div className={`absolute flex ${cfg.layout}`} style={cfg.style}>
            {cfg.triangleFirst && <Triangle direction={cfg.triangle} className={cfg.triangleAlign} />}
            <span className={BUBBLE_CLASS} style={labelWidth ? { width: labelWidth } : undefined}>{label}</span>
            {!cfg.triangleFirst && <Triangle direction={cfg.triangle} className={cfg.triangleAlign} />}
          </div>
        )}
      </div>
    </div>
  );
}
