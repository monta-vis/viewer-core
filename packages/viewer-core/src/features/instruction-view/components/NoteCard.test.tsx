import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { NoteCard } from './NoteCard';

afterEach(() => cleanup());

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

// Mock media utilities
vi.mock('@/lib/media', () => ({
  buildMediaUrl: (folder: string, path: string) => `mvis-media://${folder}/${path}`,
  publicAsset: (path: string) => `/${path}`,
  MediaPaths: {
    frame: (id: string) => `media/frames/${id}/image`,
  },
}));

describe('NoteCard icon stability', () => {
  const baseProps = {
    safetyIconCategory: 'Warnzeichen' as const,
    safetyIconId: 'W001-Allgemeines-Warnzeichen.png',
    text: 'Caution',
    onToggle: vi.fn(),
  };

  it('outer container uses flex layout for in-flow wrapping', () => {
    render(<NoteCard {...baseProps} isExpanded={true} />);
    const container = screen.getByTestId('note-card');
    expect(container.className).toContain('flex');
    expect(container.className).toContain('items-end');
    expect(container.className).not.toContain('relative');
    expect(container.className).not.toContain('h-14');
  });

  it('icon button is in-flow with flex-shrink-0 and fixed w-14 h-14', () => {
    const { rerender } = render(<NoteCard {...baseProps} isExpanded={true} />);
    const btn = screen.getByRole('button', { name: /Warnzeichen/ });
    expect(btn.className).toContain('flex-shrink-0');
    expect(btn.className).toContain('w-14');
    expect(btn.className).toContain('h-14');
    expect(btn.className).not.toContain('absolute');

    rerender(<NoteCard {...baseProps} isExpanded={false} />);
    expect(btn.className).toContain('flex-shrink-0');
    expect(btn.className).toContain('w-14');
    expect(btn.className).toContain('h-14');
    expect(btn.className).not.toContain('absolute');
  });

  it('text badge gets its own bg/border/backdrop-blur when expanded', () => {
    render(<NoteCard {...baseProps} isExpanded={true} />);
    const textBadge = screen.getByText('Caution').closest('[role="button"]')!;
    expect(textBadge.className).toContain('backdrop-blur-md');
    expect(textBadge.className).toContain('border-2');
    expect(textBadge.className).toContain('rounded-r-lg');
  });

  it('expanded text badge uses -ml-14 to tuck behind icon and is in-flow', () => {
    render(<NoteCard {...baseProps} isExpanded={true} />);
    const textBadge = screen.getByText('Caution').closest('[role="button"]')!;
    expect(textBadge.className).toContain('-ml-14');
    expect(textBadge.className).not.toContain('absolute');
  });

  it('expanded text badge inner span has pl-16 for icon clearance', () => {
    render(<NoteCard {...baseProps} isExpanded={true} />);
    const innerSpan = screen.getByText('Caution').closest('.flex.items-center')!;
    expect(innerSpan.className).toContain('pl-16');
  });

  it('text badge is not rendered when collapsed', () => {
    render(<NoteCard {...baseProps} isExpanded={false} />);
    expect(screen.queryByText('Caution')).toBeNull();
  });

  it('icon button does not have border or bg styles (only text badge does)', () => {
    render(<NoteCard {...baseProps} isExpanded={true} />);
    const btn = screen.getByRole('button', { name: /Warnzeichen/ });
    expect(btn.className).not.toContain('border-2');
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
    expect(img.getAttribute('src')).toBe('mvis-media://my-project/media/frames/safety-uuid-1/image');
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

describe('NoteCard text wrapping', () => {
  const animProps = {
    safetyIconCategory: 'Warnzeichen' as const,
    safetyIconId: 'W001-Allgemeines-Warnzeichen.png',
    text: 'Caution: handle with care',
    isExpanded: true,
    onToggle: vi.fn(),
  };

  it('allows text to wrap to multiple lines when content is long', () => {
    render(<NoteCard {...animProps} />);
    const textEl = screen.getByText('Caution: handle with care');
    expect(textEl.className).not.toContain('whitespace-nowrap');
  });
});

describe('NoteCard icon label tooltip', () => {
  const tooltipProps = {
    safetyIconCategory: 'Warnzeichen' as const,
    safetyIconId: 'W001-Allgemeines-Warnzeichen.png',
    text: 'Caution',
    isExpanded: true,
    onToggle: vi.fn(),
  };

  it('shows iconLabel as tooltip on hover when iconLabel prop is provided', () => {
    render(<NoteCard {...tooltipProps} iconLabel="General Warning" />);
    const img = screen.getByRole('img');
    const wrapper = img.parentElement!;
    fireEvent.mouseEnter(wrapper);
    expect(screen.getByRole('tooltip')).toHaveTextContent('General Warning');
  });

  it('shows categoryLabel as tooltip on hover when iconLabel is not provided', () => {
    render(<NoteCard {...tooltipProps} />);
    const img = screen.getByRole('img');
    const wrapper = img.parentElement!;
    fireEvent.mouseEnter(wrapper);
    // categoryLabel = t('editor.safetyCategory.Warnzeichen', 'Warnzeichen') → 'Warnzeichen'
    expect(screen.getByRole('tooltip')).toHaveTextContent('Warnzeichen');
  });
});

describe('NoteCard click behavior', () => {
  const clickProps = {
    safetyIconCategory: 'Warnzeichen' as const,
    safetyIconId: 'W001-Allgemeines-Warnzeichen.png',
    text: 'Caution',
    isExpanded: true,
    onToggle: vi.fn(),
  };

  it('calls onToggle when icon button is clicked', () => {
    render(<NoteCard {...clickProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Warnzeichen/ }));
    expect(clickProps.onToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onToggle when text badge is clicked', () => {
    const onToggle = vi.fn();
    render(<NoteCard {...clickProps} onToggle={onToggle} />);
    const textBadge = screen.getByText('Caution').closest('[role="button"]')!;
    fireEvent.click(textBadge);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
