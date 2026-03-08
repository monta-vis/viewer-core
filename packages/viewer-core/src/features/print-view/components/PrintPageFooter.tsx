import { useTranslation } from 'react-i18next';

interface PrintPageFooterProps {
  instructionName: string;
  pageNumber: number;
}

/**
 * Footer rendered at the bottom of each print page.
 * Shows instruction name on the left and page number on the right.
 */
export function PrintPageFooter({ instructionName, pageNumber }: PrintPageFooterProps) {
  const { t } = useTranslation();

  return (
    <footer className="print-page-footer">
      <span>{instructionName}</span>
      <span>{t('printView.page', 'Page')} {pageNumber}</span>
    </footer>
  );
}
