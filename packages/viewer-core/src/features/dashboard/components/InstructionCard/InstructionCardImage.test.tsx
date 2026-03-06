import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { InstructionCardImage } from './InstructionCardImage';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

afterEach(() => {
  cleanup();
});

const baseProps = {
  imageUrl: 'https://example.com/image.jpg',
  name: 'Test Instruction',
  isExpanded: false,
  isUploadingImage: false,
  isDragOver: false,
  getRootProps: () => ({}),
  getInputProps: () => ({}),
  fileInputRef: { current: null },
  onImageSelect: vi.fn(),
  onUploadClick: vi.fn(),
  onImageDelete: vi.fn(),
};

describe('InstructionCardImage', () => {
  describe('collapsed view', () => {
    it('renders object-contain and bg-black on the container', () => {
      const { container } = render(
        <InstructionCardImage {...baseProps} isExpanded={false} />
      );

      // Container should have bg-black
      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper.className).toContain('bg-black');

      // Image should use object-contain
      const img = screen.getByRole('img');
      expect(img.className).toContain('object-contain');
      expect(img.className).not.toContain('object-cover');
    });
  });

  describe('expanded view', () => {
    it('renders object-contain on the img element', () => {
      render(
        <InstructionCardImage {...baseProps} isExpanded={true} />
      );

      const img = screen.getByRole('img');
      expect(img.className).toContain('object-contain');
      expect(img.className).not.toContain('object-cover');
    });

    it('has bg-black on the container for letterbox effect', () => {
      const { container } = render(
        <InstructionCardImage {...baseProps} isExpanded={true} />
      );

      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper.className).toContain('bg-black');
    });
  });
});
