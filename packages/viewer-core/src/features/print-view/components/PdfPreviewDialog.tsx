import { useTranslation } from 'react-i18next';
import { X, AlertTriangle } from 'lucide-react';
import { DialogShell } from '@/components/ui/DialogShell/DialogShell';
import { LogoSpinner } from '@/components/ui/LogoSpinner';

export interface PdfPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  /** Blob URL to the rendered PDF */
  pdfUrl: string | null;
  isLoading: boolean;
  error: string | null;
}

export function PdfPreviewDialog({
  open,
  onClose,
  pdfUrl,
  isLoading,
  error,
}: PdfPreviewDialogProps) {
  const { t } = useTranslation();

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      maxWidth="max-w-6xl"
      className="!p-0 overflow-hidden"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-surface)]">
        <h2 className="text-base font-semibold text-[var(--color-text)]">
          {t('printPreview.title')}
        </h2>
        <button
          type="button"
          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] transition-colors"
          onClick={onClose}
          aria-label={t('printPreview.close')}
          data-testid="pdf-preview-close-btn"
        >
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      <div className="bg-[var(--color-bg-subtle)]" style={{ height: 'calc(85vh - 3.5rem)' }}>
        {isLoading ? (
          <div
            className="flex flex-col items-center justify-center h-full gap-4"
            data-testid="pdf-preview-loading"
          >
            <LogoSpinner size="lg" />
            <p className="text-sm text-[var(--color-text-muted)]">
              {t('printPreview.generating')}
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <AlertTriangle size={32} className="text-[var(--color-text-danger)]" />
            <p className="text-sm font-medium text-[var(--color-text-danger)]">
              {t('printPreview.error')}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">{error}</p>
          </div>
        ) : pdfUrl ? (
          <iframe
            src={pdfUrl}
            title={t('printPreview.title')}
            className="w-full h-full border-none"
          />
        ) : null}
      </div>
    </DialogShell>
  );
}
