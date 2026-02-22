import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Star, Check, X } from 'lucide-react';
import { clsx } from 'clsx';

import { Button } from '@/components/ui';
import { submitFeedback } from '../utils/submitFeedback';

interface StarRatingProps {
  /** Instruction name for email context */
  instructionName?: string;
  /** Support email to CC */
  supportEmail?: string | null;
  /** Callback when rating is complete */
  onComplete?: () => void;
  /** Additional class names */
  className?: string;
}

type State = 'initial' | 'comment' | 'success';

/**
 * StarRating - Quick 5-star rating shown on the last step.
 *
 * - 5 stars: Shows "Danke!" and auto-closes
 * - 1-4 stars: Shows centered modal with optional comment input
 */
export function StarRating({ instructionName, supportEmail, onComplete, className }: StarRatingProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<State>('initial');
  const [hoveredStar, setHoveredStar] = useState<number>(0);
  const [selectedStars, setSelectedStars] = useState<number>(0);
  const [comment, setComment] = useState('');

  const handleStarClick = useCallback((stars: number) => {
    setSelectedStars(stars);

    if (stars === 5) {
      // Perfect rating - fire and forget
      submitFeedback({
        description: `Rating: ${stars}/5 stars`,
        instructionName,
        supportEmail,
      }).catch(err => console.error('Failed to submit rating:', err));

      setState('success');
      setTimeout(() => onComplete?.(), 1500);
    } else {
      // Less than perfect - ask for feedback
      setState('comment');
    }
  }, [instructionName, supportEmail, onComplete]);

  const handleSubmitComment = useCallback(() => {
    // Fire and forget
    const msg = comment.trim()
      ? `Rating: ${selectedStars}/5 stars\n\n${comment.trim()}`
      : `Rating: ${selectedStars}/5 stars`;
    submitFeedback({
      description: msg,
      instructionName,
      supportEmail,
    }).catch(err => console.error('Failed to submit rating:', err));

    setState('success');
    setTimeout(() => onComplete?.(), 1500);
  }, [selectedStars, comment, instructionName, supportEmail, onComplete]);

  const handleCancel = useCallback(() => {
    // Reset everything - no API call
    setState('initial');
    setSelectedStars(0);
    setComment('');
  }, []);

  // ESC key cancels and resets
  useEffect(() => {
    if (state !== 'comment') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state, handleCancel]);

  // Success state
  if (state === 'success') {
    return (
      <div className={clsx('flex items-center gap-2', className)}>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-status-success-bg)] text-[var(--color-status-success)]">
          <Check className="h-4 w-4" />
          <span className="text-sm font-medium">{t('rating.thanks', 'Thanks!')}</span>
        </div>
      </div>
    );
  }

  // Always show stars with modal for comments
  return (
    <>
      <div className={clsx('relative', className)}>
        {/* Stars - always visible */}
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => handleStarClick(star)}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              disabled={state === 'comment'}
              className={clsx(
                'p-1.5 rounded-lg transition-all duration-150',
                'hover:bg-[var(--color-warning)]/10',
                'focus:outline-none focus:ring-2 focus:ring-[var(--color-warning)]/50',
                'disabled:pointer-events-none'
              )}
              aria-label={t('rating.starLabel', 'Rate {{count}} stars', { count: star })}
            >
              <Star
                className={clsx(
                  'h-7 w-7 transition-all duration-150',
                  (hoveredStar >= star || selectedStars >= star)
                    ? 'fill-[var(--color-warning)] text-[var(--color-warning)] scale-110'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-warning)]'
                )}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Comment modal - centered overlay */}
      {state === 'comment' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop - no onClick to prevent accidental close */}
          <div className="absolute inset-0 bg-black/50" />

          {/* Modal content */}
          <div className="relative bg-[var(--color-bg-elevated)] rounded-xl p-6 shadow-2xl w-80">
            {/* Close button - cancels without submitting */}
            <button
              type="button"
              onClick={handleCancel}
              className="absolute top-3 right-3 p-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-base)] hover:bg-[var(--color-bg-surface)] transition-colors"
              aria-label={t('common.close', 'Close')}
            >
              <X className="h-5 w-5" />
            </button>

            {/* Question */}
            <p className="text-sm text-[var(--color-text-base)] mb-3 pr-6">
              {t('rating.whatCanWeDoBetter', 'What can we do better?')}
            </p>

            {/* Input */}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('rating.optional', 'Optional...')}
              rows={3}
              className={clsx(
                'w-full px-3 py-2 rounded-lg text-sm',
                'bg-[var(--color-bg-surface)] border border-[var(--color-border-base)]',
                'text-[var(--color-text-base)] placeholder:text-[var(--color-text-muted)]',
                'focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]',
                'resize-none'
              )}
              autoFocus
            />

            {/* Submit button */}
            <div className="mt-4">
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmitComment}
                className="w-full"
              >
                {t('rating.submit', 'Submit')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
