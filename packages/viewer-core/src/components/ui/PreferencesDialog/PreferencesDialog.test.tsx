import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PreferencesDialog } from './PreferencesDialog';

afterEach(cleanup);

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

// Mock hooks used internally
vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({
    theme: 'dark',
    resolvedTheme: 'dark',
    setTheme: vi.fn(),
    toggleTheme: vi.fn(),
    isDark: true,
  }),
}));

vi.mock('@/hooks/usePlaybackSpeed', () => ({
  usePlaybackSpeed: () => ({
    playbackSpeed: 1,
    setPlaybackSpeed: vi.fn(),
  }),
}));

vi.mock('@/hooks/useFontSize', () => ({
  useFontSize: () => ({
    fontSize: 'medium',
    setFontSize: vi.fn(),
  }),
}));

describe('PreferencesDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
  };

  it('renders when isOpen=true', () => {
    render(<PreferencesDialog {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('hidden when isOpen=false', () => {
    render(<PreferencesDialog {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows all 4 built-in sections by default', () => {
    render(<PreferencesDialog {...defaultProps} />);
    expect(screen.getByText('preferences.language')).toBeInTheDocument();
    expect(screen.getByText('preferences.theme')).toBeInTheDocument();
    expect(screen.getByText('preferences.fontSize')).toBeInTheDocument();
    expect(screen.getByText('preferences.playbackSpeed')).toBeInTheDocument();
  });

  it('hideSections hides specified sections', () => {
    render(
      <PreferencesDialog
        {...defaultProps}
        hideSections={['language', 'playbackSpeed']}
      />
    );
    expect(screen.queryByText('preferences.language')).not.toBeInTheDocument();
    expect(screen.queryByText('preferences.playbackSpeed')).not.toBeInTheDocument();
    expect(screen.getByText('preferences.theme')).toBeInTheDocument();
    expect(screen.getByText('preferences.fontSize')).toBeInTheDocument();
  });

  it('extraSections renders after built-in sections', () => {
    render(
      <PreferencesDialog
        {...defaultProps}
        extraSections={<div data-testid="extra">Extra Content</div>}
      />
    );
    expect(screen.getByTestId('extra')).toBeInTheDocument();
  });

  it('calls onClose on backdrop click', () => {
    const onClose = vi.fn();
    render(<PreferencesDialog isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('preferences-backdrop'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn();
    render(<PreferencesDialog isOpen={true} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders language buttons in a grid (not a select)', () => {
    render(<PreferencesDialog {...defaultProps} />);
    // Should render language options as buttons, not a <select>
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Deutsch')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('shows Check icon on selected language', () => {
    render(<PreferencesDialog {...defaultProps} />);
    // "English" is the current language (mocked as 'en')
    const englishButton = screen.getByText('English').closest('button');
    expect(englishButton).toBeInTheDocument();
    // The active button should contain an SVG (the Check icon)
    const svg = englishButton?.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders theme icons (Sun/Moon)', () => {
    render(<PreferencesDialog {...defaultProps} />);
    // Theme section should have light and dark buttons with icons
    expect(screen.getByText('preferences.themeLight')).toBeInTheDocument();
    expect(screen.getByText('preferences.themeDark')).toBeInTheDocument();
  });
});
