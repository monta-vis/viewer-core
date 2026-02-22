import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Check, Pencil, Eraser, Mic, Trash2, Camera, Image, Film, Send, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

import { IconButton } from '@/components/ui';
import { submitFeedback, dataUrlToBlob } from '../utils/submitFeedback';
import { SupportAgentIcon } from './SupportAgentIcon';

type Mode = 'form' | 'drawing';

interface FeedbackWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Position of the widget - 'right' (default) or 'left' */
  position?: 'left' | 'right';
  /** Ref for the slide-over panel element (for swipe gesture DOM manipulation) */
  panelRef?: React.Ref<HTMLDivElement>;
  /** Ref for the backdrop element (for swipe gesture DOM manipulation) */
  backdropRef?: React.Ref<HTMLDivElement>;
  /** Support email for CC (optional, wired later) */
  supportEmail?: string | null;
  /** Instruction name for context */
  instructionName?: string;
  /** Current step number for context (1-based) */
  stepNumber?: number;
}

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
}

const STROKE_COLOR = '#ef4444'; // Red color for drawing
const STROKE_WIDTH = 4;

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 MB

export function FeedbackWidget({
  isOpen,
  onClose,
  position = 'right',
  panelRef,
  backdropRef,
  supportEmail,
  instructionName,
  stepNumber,
}: FeedbackWidgetProps) {
  const { t } = useTranslation();

  const [mode, setMode] = useState<Mode>('form');
  const widgetRef = useRef<HTMLDivElement>(null);

  // Drawing state
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawRafRef = useRef<number | null>(null);

  // Screenshot state
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Form state
  const [description, setDescription] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Callback request checkbox
  const [requestCallback, setRequestCallback] = useState(false);

  // Attachment state
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Setup canvas size
  useEffect(() => {
    if (mode !== 'drawing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }, [mode]);

  // Draw strokes on canvas
  const drawStrokes = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const allStrokes = [...strokes, { points: currentStroke }];
    for (const stroke of allStrokes) {
      if (stroke.points.length < 2) continue;

      ctx.beginPath();
      ctx.strokeStyle = STROKE_COLOR;
      ctx.lineWidth = STROKE_WIDTH;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
  }, [strokes, currentStroke]);

  useEffect(() => {
    drawStrokes();
  }, [drawStrokes]);

  // Drawing handlers
  const getPoint = (e: React.MouseEvent | React.TouchEvent): Point => {
    if ('touches' in e) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  };

  const handleDrawStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const point = getPoint(e);
    setIsDrawing(true);
    setCurrentStroke([point]);
  };

  const handleDrawMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const point = getPoint(e);
    if (drawRafRef.current != null) return;
    drawRafRef.current = requestAnimationFrame(() => {
      drawRafRef.current = null;
      setCurrentStroke((prev) => [...prev, point]);
    });
  };

  const handleDrawEnd = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStroke.length > 1) {
      setStrokes((prev) => [...prev, { points: currentStroke }]);
    }
    setCurrentStroke([]);
  };

  // Start drawing mode
  const startDrawing = () => {
    setMode('drawing');
    setStrokes([]);
    setCurrentStroke([]);
  };

  // Confirm drawing and capture screenshot
  const confirmDrawing = useCallback(async () => {
    if (isCapturing) return;
    setIsCapturing(true);

    try {
      const { toPng } = await import('html-to-image');

      const dataUrl = await toPng(document.body, {
        cacheBust: true,
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        filter: (node) => {
          // Ignore feedback widget elements (but not drawing canvas)
          if (node instanceof Element) {
            if (node.hasAttribute('data-feedback-widget')) {
              return false;
            }
            // Ignore video elements
            if (node.tagName === 'VIDEO') {
              return false;
            }
          }
          return true;
        },
      });

      setScreenshotUrl(dataUrl);
      setMode('form');
    } catch (err) {
      console.error('Failed to capture screenshot:', err);
      setSubmitError(t('feedback.captureError'));
      setMode('form');
    } finally {
      setIsCapturing(false);
    }
  }, [t, isCapturing]);

  // Cancel drawing
  const cancelDrawing = useCallback(() => {
    setMode('form');
    setStrokes([]);
    setCurrentStroke([]);
  }, []);

  // Handle keyboard shortcuts in drawing mode
  useEffect(() => {
    if (mode !== 'drawing') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelDrawing();
      } else if (e.key === 'Enter') {
        confirmDrawing();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, cancelDrawing, confirmDrawing]);

  // --- Attachment upload ---
  const handleAttachmentSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_ATTACHMENT_BYTES) {
      setSubmitError(t('feedback.fileTooLarge'));
      return;
    }

    setSubmitError(null);
    setAttachmentFile(file);
    setAttachmentPreviewUrl(URL.createObjectURL(file));
  }, [t]);

  const deleteAttachment = useCallback(() => {
    if (attachmentPreviewUrl) URL.revokeObjectURL(attachmentPreviewUrl);
    setAttachmentFile(null);
    setAttachmentPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [attachmentPreviewUrl]);

  // Send button enabled when any content exists + phone valid if callback requested
  const hasContent = !!(description.trim() || screenshotUrl || attachmentFile);
  const hasValidPhone = phoneNumber.replace(/\D/g, '').length >= 3;
  const canSend = hasContent && (!requestCallback || hasValidPhone);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (isSubmitting || !canSend) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Convert screenshot data URL to File
      let screenshotFile: File | null = null;
      if (screenshotUrl) {
        const blob = dataUrlToBlob(screenshotUrl);
        screenshotFile = new File([blob], 'screenshot.png', { type: 'image/png' });
      }

      const result = await submitFeedback({
        description: description.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
        screenshot: screenshotFile,
        attachment: attachmentFile,
        instructionName,
        stepNumber,
        supportEmail,
      });

      if (result.success) {
        setSubmitSuccess(true);
      } else {
        setSubmitError(t('feedback.error'));
      }
    } catch {
      setSubmitError(t('feedback.error'));
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, canSend, screenshotUrl, description, phoneNumber, attachmentFile, instructionName, stepNumber, supportEmail, t]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setMode('form');
      setStrokes([]);
      setCurrentStroke([]);
      setScreenshotUrl(null);
      setDescription('');
      setPhoneNumber('');
      setSubmitError(null);
      setIsSubmitting(false);
      setSubmitSuccess(false);
      setRequestCallback(false);
      deleteAttachment();
    }
  }, [isOpen, deleteAttachment]);

  // Auto-close after success
  useEffect(() => {
    if (!submitSuccess) return;
    const timeoutId = setTimeout(onClose, 2000);
    return () => clearTimeout(timeoutId);
  }, [submitSuccess, onClose]);

  // Drawing mode - canvas + small toolbar
  if (mode === 'drawing') {
    return (
      <>
        <canvas
          ref={canvasRef}
          data-drawing-canvas
          className="fixed inset-0 z-[200] cursor-crosshair"
          onMouseDown={handleDrawStart}
          onMouseMove={handleDrawMove}
          onMouseUp={handleDrawEnd}
          onMouseLeave={handleDrawEnd}
          onTouchStart={handleDrawStart}
          onTouchMove={handleDrawMove}
          onTouchEnd={handleDrawEnd}
        />

        {/* Small toolbar - positioned based on prop */}
        <div
          data-feedback-widget
          className={clsx(
            'fixed top-2 z-[201]',
            position === 'left' ? 'left-2' : 'right-2',
            'flex items-center gap-1 p-1 rounded-lg',
            'bg-[var(--color-bg-elevated)]/90 backdrop-blur-sm',
            'shadow-lg'
          )}
        >
          <IconButton
            icon={<X />}
            aria-label={t('common.cancel')}
            variant="ghost"
            size="sm"
            onClick={cancelDrawing}
          />
          <IconButton
            icon={<Eraser />}
            aria-label={t('feedback.clear')}
            variant="ghost"
            size="sm"
            onClick={() => setStrokes([])}
            disabled={strokes.length === 0}
          />
          <IconButton
            icon={<Check />}
            aria-label={t('feedback.done')}
            variant="primary"
            size="sm"
            onClick={confirmDrawing}
            disabled={isCapturing}
          />
        </div>
      </>
    );
  }

  // Slide direction based on position
  const slideFromRight = position === 'right';

  // Form mode (and success state) - Sliding drawer
  return (
    <>
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className={clsx(
          'fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 will-change-[opacity]',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div
        ref={(el) => {
          // Assign to both widgetRef and panelRef
          (widgetRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          if (typeof panelRef === 'function') panelRef(el);
          else if (panelRef) (panelRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        }}
        data-feedback-widget
        className={clsx(
          'fixed top-0 h-full bg-[var(--color-bg-surface)] z-50',
          'w-80 sm:w-[22rem]',
          'shadow-[0_0_60px_-15px_rgba(0,0,0,0.5)]',
          'transform transition-transform duration-300 ease-out',
          'flex flex-col',
          slideFromRight
            ? 'right-0'
            : 'left-0',
          isOpen
            ? 'translate-x-0'
            : slideFromRight ? 'translate-x-full' : '-translate-x-full'
        )}
      >
        {/* Header - matching PartsDrawer style */}
        <div className="flex items-center justify-between px-4 py-1 shadow-sm bg-gradient-to-r from-[var(--color-bg-elevated)] to-[var(--color-bg-surface)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[hsl(27,51%,56%)]/10">
              <SupportAgentIcon className="h-8 w-8 text-[hsl(27,51%,56%)]" />
            </div>
            <h2 className="font-semibold text-lg text-[var(--color-text-base)]">
              {t('feedback.title')}
            </h2>
          </div>
          <IconButton
            icon={<X />}
            variant="ghost"
            size="md"
            onClick={onClose}
            aria-label={t('common.close', 'Close')}
          />
        </div>

        {/* Success State */}
        {submitSuccess ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
            <div className="h-16 w-16 rounded-full bg-[var(--color-status-success-bg)] flex items-center justify-center">
              <Check className="h-8 w-8 text-[var(--color-status-success)]" />
            </div>
            <span className="text-base font-medium text-[var(--color-text-base)] text-center">
              {t('feedback.success')}
            </span>
          </div>
        ) : (
          /* Form Content */
          <div className="flex-1 overflow-y-auto scrollbar-subtle p-4 space-y-4">
            {/* Screenshot Area - Mark Location */}
            <div className="relative rounded-lg overflow-hidden shadow-sm bg-[var(--color-bg-elevated)]">
              {screenshotUrl ? (
                <div className="relative">
                  <img
                    src={screenshotUrl}
                    alt="Screenshot"
                    className="w-full h-auto max-h-48 object-contain"
                    draggable={false}
                  />
                  {/* Retake button */}
                  <button
                    onClick={() => {
                      setScreenshotUrl(null);
                      startDrawing();
                    }}
                    className={clsx(
                      'absolute top-2 right-2 p-2 rounded-lg',
                      'bg-black/60 hover:bg-black/80',
                      'text-white transition-colors'
                    )}
                    aria-label={t('feedback.retake')}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  disabled
                  className={clsx(
                    'w-full h-28 flex flex-col items-center justify-center gap-2',
                    'text-[var(--color-text-muted)] opacity-40 cursor-not-allowed'
                  )}
                >
                  <Pencil className="h-6 w-6" />
                  <span className="text-sm font-medium">{t('feedback.markLocation')}</span>
                  <span className="text-xs opacity-70">Coming soon</span>
                </button>
              )}
            </div>

            {/* Description + Mic button */}
            <div className="flex gap-2">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('feedback.descriptionPlaceholderOptional')}
                rows={3}
                className={clsx(
                  'flex-1 px-3 py-2.5 rounded-lg text-sm',
                  'bg-[var(--color-bg-elevated)] shadow-sm',
                  'text-[var(--color-text-base)] placeholder:text-[var(--color-text-muted)]',
                  'focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]/40',
                  'resize-none transition-all'
                )}
              />
              {/* Mic button (disabled — coming soon) */}
              <div className="flex flex-col items-center justify-start pt-1">
                <button
                  disabled
                  aria-label={t('feedback.recordMemo')}
                  title="Coming soon"
                  className={clsx(
                    'h-10 w-10 rounded-full flex items-center justify-center',
                    'bg-[var(--color-bg-elevated)] shadow-sm',
                    'text-[var(--color-text-muted)] opacity-40 cursor-not-allowed'
                  )}
                >
                  <Mic className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Attachment upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleAttachmentSelect}
            />
            {attachmentFile ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-bg-elevated)] shadow-sm">
                <div className="h-8 w-8 rounded flex items-center justify-center flex-shrink-0 bg-[var(--color-secondary)]/20 text-[var(--color-secondary)]">
                  {attachmentFile.type.startsWith('video/') ? (
                    <Film className="h-4 w-4" />
                  ) : (
                    <Image className="h-4 w-4" />
                  )}
                </div>
                <span className="text-sm text-[var(--color-text-base)] flex-1 truncate">
                  {t('feedback.attachmentAdded')} — {attachmentFile.name}
                </span>
                <button
                  onClick={deleteAttachment}
                  aria-label={t('feedback.deleteAttachment')}
                  className="p-1 rounded text-[var(--color-text-muted)] hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                disabled
                aria-label={t('feedback.uploadAttachment')}
                className={clsx(
                  'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm',
                  'bg-[var(--color-bg-elevated)] shadow-sm',
                  'text-[var(--color-text-muted)] opacity-40 cursor-not-allowed'
                )}
              >
                <Camera className="h-4 w-4" />
                <span>{t('feedback.uploadAttachment')}</span>
                <span className="ml-auto text-xs opacity-70">Coming soon</span>
              </button>
            )}

            {/* Phone number input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <SupportAgentIcon className="h-5 w-5 text-[var(--color-text-muted)]" />
              </div>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder={t('feedback.phoneNumberPlaceholder')}
                className={clsx(
                  'w-full pl-9 pr-3 py-2.5 rounded-lg text-sm',
                  'bg-[var(--color-bg-elevated)] shadow-sm',
                  'text-[var(--color-text-base)] placeholder:text-[var(--color-text-muted)]',
                  'focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]/40',
                  'transition-all'
                )}
              />
            </div>

            {/* Error */}
            {submitError && (
              <p className="text-sm text-[var(--color-error)] px-1">{submitError}</p>
            )}

            {/* Request callback checkbox */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={requestCallback}
                onChange={(e) => setRequestCallback(e.target.checked)}
                className="h-4 w-4 rounded accent-[var(--color-secondary)]"
              />
              <span className="text-sm text-[var(--color-text-base)]">
                {t('feedback.requestCallback')}
              </span>
            </label>

            {/* Send Button */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleSubmit}
                disabled={!canSend || isSubmitting}
                className={clsx(
                  'w-full flex items-center justify-center gap-3 p-4 rounded-xl',
                  'text-base font-semibold transition-all',
                  canSend && !isSubmitting
                    ? 'bg-[var(--color-secondary)] text-white hover:bg-[var(--color-secondary)]/90 shadow-md'
                    : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] opacity-50 cursor-not-allowed'
                )}
                aria-label={isSubmitting ? t('feedback.sending') : t('feedback.send')}
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
                <span>{isSubmitting ? t('feedback.sending') : t('feedback.send')}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
