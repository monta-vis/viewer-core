import { useTranslation } from 'react-i18next';
import { DialogShell } from './DialogShell';
import { Button } from './Button';

export interface ConfirmDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

/**
 * ConfirmDeleteDialog — Reusable confirmation dialog for destructive actions.
 */
export function ConfirmDeleteDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
}: ConfirmDeleteDialogProps) {
  const { t } = useTranslation();

  return (
    <DialogShell open={open} onClose={onClose} maxWidth="max-w-sm">
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold text-[var(--color-text-base)]">
          {title}
        </h3>
        <p className="text-sm text-[var(--color-text-muted)]">
          {message}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {t('common.delete', 'Delete')}
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}
