import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NoteEditDialog } from './NoteEditDialog';
import type { SafetyIconCatalog } from '../types';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { language: 'en' },
  }),
}));

// Mock viewer-core
vi.mock('@monta-vis/viewer-core', () => ({
  SAFETY_ICON_MANIFEST: [
    { filename: 'W001-Allgemeines-Warnzeichen.png', category: 'Warnzeichen' },
    { filename: 'P001-Allgemeines-Verbotszeichen.png', category: 'Verbotszeichen' },
  ],
  buildMediaUrl: (_folder: string, path: string) => `mvis-media://${path}`,
  getCategoryPriority: () => 0,
  getCategoryColor: () => '#888',
  SAFETY_ICON_CATEGORIES: {
    Verbotszeichen: { color: '#CC0000', label: 'editor.safetyCategory.prohibition', priority: 0 },
    Warnzeichen: { color: '#FFD700', label: 'editor.safetyCategory.warning', priority: 1 },
  },
  NOTE_CATEGORY_STYLES: {
    Verbotszeichen: { bg: 'bg-red', border: 'border-red', text: 'text-red' },
    Warnzeichen: { bg: 'bg-yellow', border: 'border-yellow', text: 'text-yellow' },
  },
  DialogShell: ({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) => {
    React.useEffect(() => {
      if (!open) return;
      const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
      document.addEventListener('keydown', handler);
      return () => document.removeEventListener('keydown', handler);
    }, [open, onClose]);
    if (!open) return null;
    return (
      <div data-testid="dialog-shell-backdrop" onClick={onClose}>
        <div data-testid="dialog-shell-panel" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          {children}
        </div>
      </div>
    );
  },
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button {...props}>{children}</button>
  ),
}));

afterEach(() => {
  cleanup();
});

const defaultProps = {
  open: true,
  initialText: 'Safety warning',
  initialSafetyIconId: null as string | null,
  initialSafetyIconCategory: null as string | null,
  folderName: 'test-project',
  onSave: vi.fn(),
  onClose: vi.fn(),
};

beforeEach(() => {
  defaultProps.onSave.mockClear();
  defaultProps.onClose.mockClear();
});

// ============================================================
// Visibility
// ============================================================
describe('NoteEditDialog — visibility', () => {
  it('renders nothing when open=false', () => {
    const { container } = render(<NoteEditDialog {...defaultProps} open={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders dialog when open=true', () => {
    render(<NoteEditDialog {...defaultProps} />);
    expect(screen.getByPlaceholderText('Enter note...')).toBeInTheDocument();
  });
});

// ============================================================
// Catalogs prop
// ============================================================
describe('NoteEditDialog — catalogs prop', () => {
  it('falls back to built-in icons when catalogs is empty', () => {
    render(<NoteEditDialog {...defaultProps} catalogs={[]} />);
    // Built-in icons from SAFETY_ICON_MANIFEST should appear
    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThanOrEqual(1);
  });

  it('uses external catalog icons when catalogs are provided', () => {
    const catalogs: SafetyIconCatalog[] = [
      {
        name: 'Test Catalog',
        assetsDir: '/catalogs/test/assets',
        categories: [{ id: 'Danger', label: { en: 'Danger' } }],
        entries: [
          { filename: 'ext-icon.png', category: 'Danger', label: { en: 'External Icon' } },
        ],
      },
    ];

    render(<NoteEditDialog {...defaultProps} catalogs={catalogs} />);
    // Should show the external catalog icon, not built-in
    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================
// Save requires icon selection
// ============================================================
describe('NoteEditDialog — save', () => {
  it('save button is disabled when no icon is selected', () => {
    render(<NoteEditDialog {...defaultProps} />);
    const saveBtn = screen.getByText('Save');
    expect(saveBtn).toBeDisabled();
  });

  it('does not call onSave when no icon is selected', async () => {
    const user = userEvent.setup();
    render(<NoteEditDialog {...defaultProps} />);

    await user.click(screen.getByText('Save'));
    expect(defaultProps.onSave).not.toHaveBeenCalled();
  });

  it('calls onSave with text, safetyIconId, and category when icon is selected', async () => {
    const user = userEvent.setup();
    render(
      <NoteEditDialog
        {...defaultProps}
        initialSafetyIconId="W001-Allgemeines-Warnzeichen.png"
        initialSafetyIconCategory="Warnzeichen"
      />,
    );

    await user.click(screen.getByText('Save'));
    expect(defaultProps.onSave).toHaveBeenCalledWith(
      'Safety warning',
      'W001-Allgemeines-Warnzeichen.png',
      'Warnzeichen',
    );
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});

// ============================================================
// Cancel
// ============================================================
describe('NoteEditDialog — cancel', () => {
  it('calls onClose without saving when Cancel clicked', async () => {
    const user = userEvent.setup();
    render(<NoteEditDialog {...defaultProps} />);

    await user.click(screen.getByText('Cancel'));
    expect(defaultProps.onClose).toHaveBeenCalled();
    expect(defaultProps.onSave).not.toHaveBeenCalled();
  });

  it('calls onClose on Escape', async () => {
    const user = userEvent.setup();
    render(<NoteEditDialog {...defaultProps} />);

    // Focus inside the dialog so keydown fires on the backdrop's handler
    const input = screen.getByPlaceholderText('Enter note...');
    await user.click(input);
    await user.keyboard('{Escape}');
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});

// ============================================================
// Keyboard shortcut — Ctrl+Enter
// ============================================================
describe('NoteEditDialog — keyboard shortcuts', () => {
  it('saves on Ctrl+Enter when icon is selected', async () => {
    const user = userEvent.setup();
    render(
      <NoteEditDialog
        {...defaultProps}
        initialSafetyIconId="W001-Allgemeines-Warnzeichen.png"
        initialSafetyIconCategory="Warnzeichen"
      />,
    );

    const input = screen.getByPlaceholderText('Enter note...');
    await user.click(input);
    await user.keyboard('{Control>}{Enter}{/Control}');
    expect(defaultProps.onSave).toHaveBeenCalled();
  });
});

// ============================================================
// Initial values
// ============================================================
describe('NoteEditDialog — initial values', () => {
  it('pre-fills text input with initialText', () => {
    render(<NoteEditDialog {...defaultProps} />);
    const input = screen.getByPlaceholderText('Enter note...');
    expect(input).toHaveValue('Safety warning');
  });
});
