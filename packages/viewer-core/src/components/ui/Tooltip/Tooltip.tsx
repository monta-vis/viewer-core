import { useState, type ReactNode } from 'react';
import { clsx } from 'clsx';

export interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom';
}

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && content && (
        <span
          role="tooltip"
          className={clsx(
            'absolute left-1/2 -translate-x-1/2 z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap pointer-events-none',
            position === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
