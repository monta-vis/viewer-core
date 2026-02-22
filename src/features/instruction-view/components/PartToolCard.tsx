import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { Package, Wrench } from 'lucide-react';

interface PartToolCardProps {
  name: string;
  partNumber?: string | null;
  type: 'part' | 'tool';
  totalAmount: number;
  unit?: string | null;
  amountsPerSubstep: Map<string, number>;
  highlightedSubstepId?: string | null;
  /** Compact mode for sidebar */
  compact?: boolean;
  /** Preview image URL (if available) - shown instead of icon */
  previewImageUrl?: string | null;
}

/**
 * Industrial-style card for parts and tools.
 * Technical drawing aesthetic with diagonal accent stripes.
 */
export function PartToolCard({
  name,
  partNumber,
  type,
  totalAmount,
  unit,
  amountsPerSubstep,
  highlightedSubstepId,
  compact = false,
  previewImageUrl,
}: PartToolCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const Icon = type === 'part' ? Package : Wrench;

  // Color scheme based on type
  const colors = type === 'part'
    ? {
        accent: 'var(--color-element-part)',
        accentRgb: '45, 212, 191', // teal
        bg: 'rgba(45, 212, 191, 0.08)',
        border: 'rgba(45, 212, 191, 0.25)',
        glow: 'rgba(45, 212, 191, 0.4)',
      }
    : {
        accent: 'var(--color-element-tool)',
        accentRgb: '96, 165, 250', // blue
        bg: 'rgba(96, 165, 250, 0.08)',
        border: 'rgba(96, 165, 250, 0.25)',
        glow: 'rgba(96, 165, 250, 0.4)',
      };

  // Close panel on any click when expanded
  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = () => {
      setIsExpanded(false);
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isExpanded]);

  const handleClick = () => {
    if (!isExpanded && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setPanelPosition({
        top: rect.top,
        left: rect.right + 8,
      });
      setIsExpanded(true);
    }
  };

  // Get amount for highlighted substep
  const highlightedAmount = highlightedSubstepId
    ? amountsPerSubstep.get(highlightedSubstepId) ?? 0
    : 0;
  const isInHighlightedSubstep = highlightedAmount > 0;
  const isDimmed = highlightedSubstepId && !isInHighlightedSubstep;

  // Floating detail panel
  const floatingPanel = isExpanded
    ? createPortal(
        <div
          className={clsx(
            'fixed w-72 overflow-hidden',
            'bg-[var(--color-bg-elevated)]',
            'border-2 rounded-lg',
            'animate-in fade-in-0 slide-in-from-left-2 duration-150'
          )}
          style={{
            top: panelPosition.top,
            left: panelPosition.left,
            zIndex: 9999,
            borderColor: colors.accent,
            boxShadow: `0 0 30px ${colors.glow}, 0 20px 40px rgba(0,0,0,0.5)`,
          }}
        >
          {/* Header stripe */}
          <div
            className="h-1.5 w-full"
            style={{ background: colors.accent }}
          />

          {/* Preview image area */}
          <div className="relative aspect-[4/3]" style={{ background: colors.bg }}>
            {previewImageUrl ? (
              <img
                src={previewImageUrl}
                alt={name}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Icon
                  className="w-16 h-16 opacity-40"
                  style={{ color: colors.accent }}
                />
              </div>
            )}

            {/* Technical corner marks */}
            <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 opacity-50" style={{ borderColor: colors.accent }} />
            <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 opacity-50" style={{ borderColor: colors.accent }} />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 opacity-50" style={{ borderColor: colors.accent }} />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 opacity-50" style={{ borderColor: colors.accent }} />
          </div>

          {/* Details section */}
          <div className="p-4 space-y-2 border-t" style={{ borderColor: colors.border }}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-base text-[var(--color-text-base)] leading-tight">
                {name}
              </h3>
              <span
                className="flex-shrink-0 px-2 py-0.5 rounded text-sm font-bold tabular-nums"
                style={{
                  background: colors.accent,
                  color: 'var(--color-bg-base)'
                }}
              >
                ×{totalAmount}
                {unit && <span className="ml-0.5 text-xs font-normal opacity-80">{unit}</span>}
              </span>
            </div>
            {partNumber && (
              <p
                className="text-sm font-mono px-2 py-1 rounded"
                style={{
                  background: colors.bg,
                  color: colors.accent
                }}
              >
                {partNumber}
              </p>
            )}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div
      ref={cardRef}
      onClick={handleClick}
      className={clsx(
        'group relative cursor-pointer',
        'transition-all duration-200',
        compact ? 'w-full' : 'w-36',
        isDimmed && 'opacity-25'
      )}
    >
      {floatingPanel}

      {/* Main card container */}
      <div
        className={clsx(
          'relative overflow-hidden rounded-lg border-2',
          'transition-all duration-200',
          'hover:scale-[1.02]',
          compact ? 'p-2' : 'p-3'
        )}
        style={{
          background: `linear-gradient(135deg, var(--color-bg-surface) 0%, ${colors.bg} 100%)`,
          borderColor: isInHighlightedSubstep ? colors.accent : colors.border,
          boxShadow: isInHighlightedSubstep
            ? `0 0 20px ${colors.glow}`
            : 'none',
        }}
      >
        {/* Diagonal accent stripe in corner */}
        <div
          className="absolute -top-6 -right-6 w-12 h-12 rotate-45"
          style={{
            background: colors.accent,
            opacity: 0.15,
          }}
        />

        {/* Top row: Icon badge + Amount */}
        <div className="flex items-start justify-between mb-2">
          {/* Icon badge */}
          <div
            className={clsx(
              'flex items-center justify-center rounded overflow-hidden',
              compact ? 'w-7 h-7' : 'w-9 h-9'
            )}
            style={{
              background: colors.bg,
            }}
          >
            {previewImageUrl ? (
              <img
                src={previewImageUrl}
                alt=""
                className="w-full h-full object-contain"
              />
            ) : (
              <Icon
                className={compact ? 'h-4 w-4' : 'h-5 w-5'}
                style={{ color: colors.accent }}
              />
            )}
          </div>

          {/* Amount badge */}
          <div
            className={clsx(
              'flex items-center justify-center rounded font-bold tabular-nums',
              'transition-all duration-200',
              compact ? 'text-xs px-1.5 py-0.5 min-w-6' : 'text-sm px-2 py-1 min-w-8'
            )}
            style={{
              background: isInHighlightedSubstep ? colors.accent : colors.bg,
              color: isInHighlightedSubstep ? 'var(--color-bg-base)' : colors.accent,
            }}
          >
            ×{isInHighlightedSubstep ? highlightedAmount : totalAmount}
            {unit && <span className="ml-0.5 text-[0.75em] font-normal opacity-70">{unit}</span>}
          </div>
        </div>

        {/* Name */}
        <div
          className={clsx(
            'font-semibold text-[var(--color-text-base)] truncate leading-tight',
            compact ? 'text-xs' : 'text-sm'
          )}
        >
          {name}
        </div>

        {/* Part number */}
        {(!compact || partNumber) && (
          <div
            className={clsx(
              'font-mono truncate mt-0.5',
              compact ? 'text-[0.625rem]' : 'text-xs'
            )}
            style={{ color: `rgba(${colors.accentRgb}, 0.7)` }}
          >
            {partNumber || '\u00A0'}
          </div>
        )}

        {/* Bottom accent line */}
        <div
          className={clsx(
            'absolute bottom-0 left-0 right-0',
            'transition-all duration-200',
            'group-hover:h-1',
            compact ? 'h-0.5' : 'h-0.5'
          )}
          style={{ background: colors.accent }}
        />
      </div>
    </div>
  );
}
