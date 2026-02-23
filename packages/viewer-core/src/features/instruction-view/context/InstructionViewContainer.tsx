/**
 * InstructionViewContainer
 *
 * Container-Komponente die das Theme auf den InstructionView-Bereich anwendet.
 * Isoliert die CSS-Variablen vom Rest der App.
 * Unterstützt Viewport-Simulation für verschiedene Gerätegrößen.
 */
import { type ReactNode } from 'react';
import clsx from 'clsx';
import { useInstructionView } from './InstructionViewContext';

interface InstructionViewContainerProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  textSizeLarge?: boolean;
}

/**
 * Container der die Theme-Klasse für die InstructionView trägt.
 * Muss innerhalb eines InstructionViewProvider verwendet werden.
 */
export function InstructionViewContainer({
  children,
  className,
  style,
  textSizeLarge,
}: InstructionViewContainerProps) {
  const { theme } = useInstructionView();

  return (
    <div
      style={style}
      className={clsx(
        'instruction-view-container',
        theme === 'light' ? 'instruction-theme-light' : 'instruction-theme-dark',
        textSizeLarge && 'instruction-text-large',
        'relative flex h-full w-full overflow-hidden',
        'bg-[var(--color-bg-base)]',
        'transition-colors duration-200',
        className
      )}
    >
      <div
        className={clsx(
          'flex flex-col',
          'bg-[var(--color-bg-base)] text-[var(--color-text-base)]',
          'h-full w-full'
        )}
      >
        {children}
      </div>
    </div>
  );
}
