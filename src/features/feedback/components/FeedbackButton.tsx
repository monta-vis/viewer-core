import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';

import { FeedbackWidget } from './FeedbackWidget';
import { SupportAgentIcon } from './SupportAgentIcon';

interface FeedbackButtonProps {
  className?: string;
  /** Position of the widget - 'right' (default) or 'left' */
  position?: 'left' | 'right';
  /** Controlled mode: external open state */
  isOpen?: boolean;
  /** Controlled mode: callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Ref for the slide-over panel element (for swipe gesture DOM manipulation) */
  panelRef?: React.Ref<HTMLDivElement>;
  /** Ref for the backdrop element (for swipe gesture DOM manipulation) */
  backdropRef?: React.Ref<HTMLDivElement>;
  /** Support email for CC */
  supportEmail?: string | null;
  /** Instruction name for context */
  instructionName?: string;
  /** Current step number for context (1-based) */
  stepNumber?: number;
}

export function FeedbackButton({
  className,
  position = 'right',
  isOpen: controlledIsOpen,
  onOpenChange,
  panelRef,
  backdropRef,
  supportEmail,
  instructionName,
  stepNumber,
}: FeedbackButtonProps) {
  const { t } = useTranslation();
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  // Support both controlled and uncontrolled modes
  const isOpen = controlledIsOpen ?? internalIsOpen;
  const setIsOpen = onOpenChange ?? setInternalIsOpen;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={t('feedback.reportProblem', 'Problem?')}
        className={clsx(
          'group flex items-center justify-center rounded-lg transition-all duration-200',
          'h-12 w-12 sm:h-14 sm:w-14 m-0 bg-[hsl(0,60%,65%)]/10 hover:bg-[hsl(0,60%,65%)]/20',
          'border border-[hsl(0,60%,65%)]/30 hover:border-[hsl(0,60%,65%)]/50',
          'text-[hsl(0,60%,65%)] text-sm font-medium',
          className
        )}
      >
        <SupportAgentIcon className="h-7 w-7 sm:h-8 sm:w-8 transition-transform duration-200 group-hover:scale-110" />
      </button>

      <FeedbackWidget
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        position={position}
        panelRef={panelRef}
        backdropRef={backdropRef}
        supportEmail={supportEmail}
        instructionName={instructionName}
        stepNumber={stepNumber}
      />
    </>
  );
}
