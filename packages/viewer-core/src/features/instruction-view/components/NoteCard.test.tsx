import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { NoteCard } from './NoteCard';

afterEach(() => cleanup());

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

// Mock buildMediaUrl
vi.mock('@/lib/media', () => ({
  buildMediaUrl: (folder: string, path: string) => `mvis-media://${folder}/${path}`,
  publicAsset: (path: string) => `/${path}`,
}));

describe('NoteCard border stability', () => {
  const borderProps = {
    safetyIconCategory: 'Warnzeichen' as const,
    safetyIconId: 'W001-Allgemeines-Warnzeichen.png',
    text: 'Caution',
    onToggle: vi.fn(),
  };

  it('always renders with border-2 regardless of expanded state', () => {
    const { rerender } = render(<NoteCard {...borderProps} isExpanded={true} />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('border-2');

    rerender(<NoteCard {...borderProps} isExpanded={false} />);
    expect(btn.className).toContain('border-2');
  });

  it('applies category border color and backdrop-blur when expanded with text', () => {
    render(<NoteCard {...borderProps} isExpanded={true} />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('backdrop-blur-md');
    expect(btn.className).not.toContain('border-transparent');
  });

  it('always has min-h-14 to lock height during collapse', () => {
    const { rerender } = render(<NoteCard {...borderProps} isExpanded={true} />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('min-h-14');

    rerender(<NoteCard {...borderProps} isExpanded={false} />);
    expect(btn.className).toContain('min-h-14');
  });

  it('applies border-transparent and bg-transparent when collapsed with text', () => {
    render(<NoteCard {...borderProps} isExpanded={false} />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('border-transparent');
    expect(btn.className).toContain('bg-transparent');
    expect(btn.className).not.toContain('backdrop-blur-md');
  });
});

describe('NoteCard safety icon resolution', () => {
  const baseProps = {
    safetyIconCategory: 'Warnzeichen' as const,
    safetyIconId: 'W001-Allgemeines-Warnzeichen.png',
    text: 'Caution',
    isExpanded: true,
    onToggle: vi.fn(),
  };

  it('resolves safety icon via localPath when folderName is undefined (mweb context)', () => {
    const vfas = {
      'safety-uuid-1': { localPath: './media/frames/safety-uuid-1/image.png' },
    };
    render(
      <NoteCard
        {...baseProps}
        safetyIconId="safety-uuid-1"
        videoFrameAreas={vfas}
      />,
    );
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toBe('./media/frames/safety-uuid-1/image.png');
  });

  it('resolves safety icon via buildMediaUrl when folderName is set (Electron context)', () => {
    render(
      <NoteCard
        {...baseProps}
        safetyIconId="safety-uuid-1"
        folderName="my-project"
      />,
    );
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toBe('mvis-media://my-project/media/frames/safety-uuid-1/image.png');
  });

  it('falls back to safetyIconUrl for legacy filename icons', () => {
    render(
      <NoteCard
        {...baseProps}
        safetyIconId="W001-Allgemeines-Warnzeichen.png"
      />,
    );
    const img = screen.getByRole('img');
    // publicAsset('SafetyIcons/...') → '/SafetyIcons/W001-Allgemeines-Warnzeichen.png'
    expect(img.getAttribute('src')).toBe('/SafetyIcons/W001-Allgemeines-Warnzeichen.png');
  });

  it('renders fallback text when icon URL cannot be resolved (VFA without folderName or localPath)', () => {
    render(<NoteCard {...baseProps} safetyIconId="unknown-vfa-uuid" />);
    // No <img> tag — fallback category text abbreviation is rendered
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('War')).toBeInTheDocument(); // first 3 chars of 'Warnzeichen'
  });
});
