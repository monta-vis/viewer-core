import type { ReactNode } from 'react';
import { clsx } from 'clsx';

export interface CollapsiblePanelProps {
  /** Whether the panel is expanded */
  isOpen: boolean;
  children: ReactNode;
  className?: string;
  /** Max height when open. The inner container uses overflow-hidden for the collapse animation; consumers should add their own overflow-y-auto on scrollable content inside. */
  maxHeight?: string;
}

/**
 * Inline collapsible panel that animates between 0 and auto height.
 * Uses the CSS grid-rows trick (0fr → 1fr) for smooth transitions.
 * Lives in document flow — no backdrop, no fixed positioning.
 */
export function CollapsiblePanel({ isOpen, children, className, maxHeight }: CollapsiblePanelProps) {
  return (
    <div
      className={clsx(
        'grid transition-[grid-template-rows] duration-300 ease-in-out',
        isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        className,
      )}
    >
      <div
        className="overflow-hidden min-h-0"
        style={maxHeight ? { maxHeight } : undefined}
      >
        {children}
      </div>
    </div>
  );
}
