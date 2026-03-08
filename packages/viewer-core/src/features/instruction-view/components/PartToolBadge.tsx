import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { PartIcon, ToolIcon } from '@/lib/icons';

interface PartToolBadgeProps {
  partCount: number;
  toolCount: number;
  onClick?: () => void;
  showChevron?: boolean;
  /** Extra CSS classes merged onto the button. */
  className?: string;
  /** Inline styles merged onto the button. */
  style?: React.CSSProperties;
}

/** Reusable badge showing part/tool icons with counts in a colored pill. */
export function PartToolBadge({
  partCount,
  toolCount,
  onClick,
  showChevron,
  className = '',
  style,
}: PartToolBadgeProps) {
  const { t } = useTranslation();

  const hasParts = partCount > 0;
  const hasTools = toolCount > 0;

  if (!hasParts && !hasTools) return null;

  const ariaLabel = [
    hasParts ? t('instructionView.nParts', '{{count}} Parts', { count: partCount }) : null,
    hasTools ? t('instructionView.nTools', '{{count}} Tools', { count: toolCount }) : null,
  ].filter(Boolean).join(', ');

  // Compute background based on part/tool presence
  let bgStyle: React.CSSProperties = { ...style };
  let bgClass = '';
  if (hasParts && hasTools) {
    bgStyle = {
      ...bgStyle,
      background: 'linear-gradient(120deg, color-mix(in srgb, var(--color-element-part) 15%, transparent) 45%, color-mix(in srgb, var(--color-element-tool) 15%, transparent) 55%)',
    };
  } else if (hasParts) {
    bgClass = 'bg-[var(--color-element-part)]/15';
  } else {
    bgClass = 'bg-[var(--color-element-tool)]/15';
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={`group flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 focus:outline-none cursor-pointer hover:scale-105 active:scale-95 border border-[var(--color-border)]/30 ${bgClass} ${className}`}
      style={bgStyle}
      onClick={onClick}
    >
      {hasParts && (
        <span className="flex items-center gap-1">
          <PartIcon className="h-4 w-4 text-[var(--color-element-part)] transition-transform duration-200 group-hover:scale-110" />
          <span className="text-[var(--color-text-base)]">&times;{partCount}</span>
        </span>
      )}
      {hasParts && hasTools && (
        <span className="w-px h-4 bg-[var(--color-border)] rotate-[20deg]" />
      )}
      {hasTools && (
        <span className="flex items-center gap-1">
          <ToolIcon className="h-4 w-4 text-[var(--color-element-tool)] transition-transform duration-200 group-hover:scale-110" />
          <span className="text-[var(--color-text-base)]">&times;{toolCount}</span>
        </span>
      )}
      {showChevron && (
        <ChevronRight data-testid="part-tool-badge-chevron" className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
      )}
    </button>
  );
}
