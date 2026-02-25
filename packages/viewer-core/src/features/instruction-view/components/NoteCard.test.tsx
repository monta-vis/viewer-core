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

describe('NoteCard safety icon resolution', () => {
  const baseProps = {
    level: 'Warning' as const,
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

  it('returns null icon when no safetyIconId and renders lucide icon', () => {
    render(<NoteCard {...baseProps} />);
    // No <img> tag — lucide icon is rendered instead
    expect(screen.queryByRole('img')).toBeNull();
  });
});
