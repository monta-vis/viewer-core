import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

vi.mock('@monta-vis/viewer-core', () => ({
  DialogShell: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog-shell">{children}</div> : null,
  Button: ({ children, onClick, variant }: { children: React.ReactNode; onClick?: () => void; variant?: string }) => (
    <button onClick={onClick} data-variant={variant}>{children}</button>
  ),
}));

vi.mock('./ImageCropDialog', () => ({
  ImageCropDialog: ({ open, onConfirm, onCancel }: {
    open: boolean;
    onConfirm: (crop: { x: number; y: number; width: number; height: number }) => void;
    onCancel: () => void;
  }) =>
    open ? (
      <div data-testid="crop-dialog">
        <button data-testid="crop-confirm" onClick={() => onConfirm({ x: 0, y: 0, width: 1, height: 1 })}>Confirm</button>
        <button data-testid="crop-cancel" onClick={onCancel}>Cancel</button>
      </div>
    ) : null,
}));

import { PreviewImageUploadButton } from './PreviewImageUploadButton';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PreviewImageUploadButton', () => {
  it('renders upload button with aria-label', () => {
    render(<PreviewImageUploadButton onUpload={vi.fn()} />);
    expect(screen.getByLabelText('Upload preview image')).toBeInTheDocument();
  });

  it('click triggers hidden file input', async () => {
    const user = userEvent.setup();
    render(<PreviewImageUploadButton onUpload={vi.fn()} />);

    const button = screen.getByLabelText('Upload preview image');
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    const clickSpy = vi.spyOn(fileInput, 'click');
    await user.click(button);
    expect(clickSpy).toHaveBeenCalled();
  });

  it('file selection opens ImageCropDialog', () => {
    render(<PreviewImageUploadButton onUpload={vi.fn()} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const testFile = new File(['test'], 'test.png', { type: 'image/png' });

    // Mock createObjectURL
    const mockUrl = 'blob:test-url';
    vi.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl);

    fireEvent.change(fileInput, { target: { files: [testFile] } });

    expect(screen.getByTestId('crop-dialog')).toBeInTheDocument();
  });

  it('crop confirm calls onUpload(file, crop)', () => {
    const onUpload = vi.fn();
    render(<PreviewImageUploadButton onUpload={onUpload} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const testFile = new File(['test'], 'test.png', { type: 'image/png' });

    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    fireEvent.change(fileInput, { target: { files: [testFile] } });
    fireEvent.click(screen.getByTestId('crop-confirm'));

    expect(onUpload).toHaveBeenCalledWith(testFile, { x: 0, y: 0, width: 1, height: 1 });
  });

  it('crop cancel resets state without calling onUpload', () => {
    const onUpload = vi.fn();
    render(<PreviewImageUploadButton onUpload={onUpload} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const testFile = new File(['test'], 'test.png', { type: 'image/png' });

    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    fireEvent.change(fileInput, { target: { files: [testFile] } });
    fireEvent.click(screen.getByTestId('crop-cancel'));

    expect(onUpload).not.toHaveBeenCalled();
    expect(screen.queryByTestId('crop-dialog')).not.toBeInTheDocument();
  });

  it('click stops propagation (card is clickable)', async () => {
    const parentClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <PreviewImageUploadButton onUpload={vi.fn()} />
      </div>,
    );

    const user = userEvent.setup();
    await user.click(screen.getByLabelText('Upload preview image'));
    expect(parentClick).not.toHaveBeenCalled();
  });
});
