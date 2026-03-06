import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface MediaEditDialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  sidebar: ReactNode;
}

/**
 * MediaEditDialog — shared full-screen modal shell for image and video annotation editors.
 *
 * Layout:
 * ┌─────────────────────────────────────────────┐
 * │                          │ sidebar (15rem)   │
 * │  children (flex-1)       │                   │
 * │                          │                   │
 * └─────────────────────────────────────────────┘
 */
export function MediaEditDialog({ open, onClose, children, sidebar }: MediaEditDialogProps) {
  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-[95vw] max-w-[75rem] h-[90vh] max-h-[50rem] flex flex-col rounded-2xl bg-[var(--color-bg-elevated)] shadow-xl">
        {/* Body — two-column: content + sidebar */}
        <div className="flex-1 flex min-h-0">
          {/* Content area */}
          <div className="flex-1 min-w-0">
            {children}
          </div>

          {/* Sidebar */}
          <div className="w-[15rem] shrink-0 border-l border-[var(--color-border-base)] overflow-y-auto">
            {sidebar}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
