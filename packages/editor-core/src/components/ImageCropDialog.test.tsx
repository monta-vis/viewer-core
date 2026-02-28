import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ImageCropDialog } from './ImageCropDialog';

afterEach(() => {
  cleanup();
});

// Mock react-image-crop since it relies on image loading
vi.mock('react-image-crop', () => ({
  default: ({ children, onChange, onComplete }: {
    children: React.ReactNode;
    onChange: (crop: unknown, percentCrop: unknown) => void;
    onComplete: (crop: unknown, percentCrop: unknown) => void;
  }) => {
    return (
      <div data-testid="react-crop" onClick={() => {
        const percentCrop = { unit: '%', x: 10, y: 20, width: 60, height: 50 };
        onChange(percentCrop, percentCrop);
        onComplete(percentCrop, percentCrop);
      }}>
        {children}
      </div>
    );
  },
}));

vi.mock('react-image-crop/dist/ReactCrop.css', () => ({}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { language: 'en' },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

describe('ImageCropDialog', () => {
  const defaultProps = {
    open: true,
    imageSrc: 'test-image.jpg',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it('renders when open is true', () => {
    render(<ImageCropDialog {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Crop Image')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(<ImageCropDialog {...defaultProps} open={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the image', () => {
    const { container } = render(<ImageCropDialog {...defaultProps} />);
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', 'test-image.jpg');
  });

  it('calls onCancel when Cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<ImageCropDialog {...defaultProps} onCancel={onCancel} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when backdrop is clicked', () => {
    const onCancel = vi.fn();
    const { container } = render(<ImageCropDialog {...defaultProps} onCancel={onCancel} />);

    const backdrop = container.querySelector('.bg-black\\/60');
    if (backdrop) fireEvent.click(backdrop);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm with normalized coordinates on confirm', () => {
    const onConfirm = vi.fn();
    render(<ImageCropDialog {...defaultProps} onConfirm={onConfirm} />);

    // Simulate crop interaction
    const cropArea = screen.getByTestId('react-crop');
    fireEvent.click(cropArea);

    // Click confirm
    fireEvent.click(screen.getByText('Confirm'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const crop = onConfirm.mock.calls[0][0];
    expect(crop.x).toBeCloseTo(0.1);
    expect(crop.y).toBeCloseTo(0.2);
    expect(crop.width).toBeCloseTo(0.6);
    expect(crop.height).toBeCloseTo(0.5);
  });

  it('calls onConfirm with default crop when no interaction', () => {
    const onConfirm = vi.fn();
    render(<ImageCropDialog {...defaultProps} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByText('Confirm'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const crop = onConfirm.mock.calls[0][0];
    expect(crop.x).toBeCloseTo(0.1);
    expect(crop.y).toBeCloseTo(0.1);
    expect(crop.width).toBeCloseTo(0.8);
    expect(crop.height).toBeCloseTo(0.8);
  });
});
