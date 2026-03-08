import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PdfPreviewDialog } from './PdfPreviewDialog';

afterEach(cleanup);

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'printPreview.title': 'PDF Preview',
        'printPreview.close': 'Close',
        'printPreview.generating': 'Generating PDF...',
        'printPreview.error': 'Failed to generate PDF',
      };
      return translations[key] ?? key;
    },
  }),
}));

describe('PdfPreviewDialog', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    pdfUrl: null,
    isLoading: false,
    error: null,
  };

  it('does not render when open is false', () => {
    const { container } = render(
      <PdfPreviewDialog {...defaultProps} open={false} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows loading spinner when isLoading is true', () => {
    render(<PdfPreviewDialog {...defaultProps} isLoading={true} />);
    expect(screen.getByText('Generating PDF...')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-preview-loading')).toBeInTheDocument();
  });

  it('shows error message when error is set', () => {
    render(
      <PdfPreviewDialog {...defaultProps} error="Something went wrong" />,
    );
    expect(screen.getByText('Failed to generate PDF')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders iframe with correct src when pdfUrl is provided', () => {
    const blobUrl = 'blob:http://localhost/fake-pdf';
    render(<PdfPreviewDialog {...defaultProps} pdfUrl={blobUrl} />);
    const iframe = screen.getByTitle('PDF Preview');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', blobUrl);
  });

  it('calls onClose when Close button is clicked', async () => {
    const onClose = vi.fn();
    render(
      <PdfPreviewDialog
        {...defaultProps}
        pdfUrl="blob:http://localhost/fake"
        onClose={onClose}
      />,
    );
    await userEvent.click(screen.getByTestId('pdf-preview-close-btn'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('close button has aria-label', () => {
    render(
      <PdfPreviewDialog
        {...defaultProps}
        pdfUrl="blob:http://localhost/fake"
      />,
    );
    const closeBtn = screen.getByTestId('pdf-preview-close-btn');
    expect(closeBtn).toHaveAttribute('aria-label');
  });
});
