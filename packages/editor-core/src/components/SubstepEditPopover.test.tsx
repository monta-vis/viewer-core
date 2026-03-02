import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { SubstepEditPopover } from './SubstepEditPopover';
import type { SubstepEditPopoverProps } from './SubstepEditPopover';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { language: 'en' },
  }),
}));

// Mock useSessionHistory — we test the hook separately
const mockCaptureSnapshot = vi.fn();
const mockUndo = vi.fn();
const mockRedo = vi.fn();
const mockReset = vi.fn();
let mockCanUndo = false;
let mockCanRedo = false;

vi.mock('../hooks/useSessionHistory', () => ({
  useSessionHistory: () => ({
    canUndo: mockCanUndo,
    canRedo: mockCanRedo,
    captureSnapshot: mockCaptureSnapshot,
    undo: mockUndo,
    redo: mockRedo,
    reset: mockReset,
  }),
}));

// Mock ImageCropDialog — renders confirm/cancel buttons for testing
let mockCropOnConfirm: ((crop: { x: number; y: number; width: number; height: number }) => void) | null = null;
let mockCropOnCancel: (() => void) | null = null;
vi.mock('./ImageCropDialog', () => ({
  ImageCropDialog: ({ open, onConfirm, onCancel }: { open: boolean; onConfirm: (crop: { x: number; y: number; width: number; height: number }) => void; onCancel: () => void }) => {
    mockCropOnConfirm = onConfirm;
    mockCropOnCancel = onCancel;
    if (!open) return null;
    return (
      <div data-testid="crop-dialog">
        <button data-testid="crop-confirm" onClick={() => onConfirm({ x: 0.1, y: 0.1, width: 0.8, height: 0.8 })}>Confirm</button>
        <button data-testid="crop-cancel" onClick={() => onCancel()}>Cancel</button>
      </div>
    );
  },
}));

// Mock VideoTrimDialog — renders confirm/close buttons for testing
let mockVideoTrimOnConfirm: ((result: { file: File; trimData: null }) => void) | null = null;
let mockVideoTrimOnClose: (() => void) | null = null;
vi.mock('./VideoTrimDialog', () => ({
  VideoTrimDialog: ({ open, file, onConfirm, onClose }: { open: boolean; file: File; onConfirm: (result: { file: File; trimData: null }) => void; onClose: () => void }) => {
    mockVideoTrimOnConfirm = onConfirm;
    mockVideoTrimOnClose = onClose;
    if (!open) return null;
    return (
      <div data-testid="video-editor-dialog">
        <button data-testid="video-editor-save" onClick={() => onConfirm({ file, trimData: null })}>Confirm</button>
        <button data-testid="video-editor-cancel" onClick={() => onClose()}>Cancel</button>
      </div>
    );
  },
}));

// Mock viewer-core exports used by inline note editing
vi.mock('@monta-vis/viewer-core', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    NOTE_CATEGORY_STYLES: {
      Verbotszeichen: { bg: 'bg-red', border: 'border-red', text: 'text-red' },
      Warnzeichen: { bg: 'bg-yellow', border: 'border-yellow', text: 'text-yellow' },
      Gefahrstoffe: { bg: 'bg-red', border: 'border-red', text: 'text-red' },
      Gebotszeichen: { bg: 'bg-blue', border: 'border-blue', text: 'text-blue' },
      'Piktogramme-Leitern': { bg: 'bg-gray', border: 'border-gray', text: 'text-gray' },
    },
    SAFETY_ICON_MANIFEST: [],
    buildMediaUrl: (folder: string, path: string) => `mvis-media://${folder}/${path}`,
  };
});

// Mock URL.createObjectURL / revokeObjectURL (not available in jsdom)
const mockCreateObjectURL = vi.fn().mockReturnValue('blob:test-url');
const mockRevokeObjectURL = vi.fn();
globalThis.URL.createObjectURL = mockCreateObjectURL;
globalThis.URL.revokeObjectURL = mockRevokeObjectURL;

afterEach(() => {
  cleanup();
  mockCreateObjectURL.mockClear();
  mockRevokeObjectURL.mockClear();
});

const callbacks = {
  onDeleteImage: vi.fn(),
  onEditVideo: vi.fn(),
  onDeleteVideo: vi.fn(),
  onSaveDescription: vi.fn(),
  onDeleteDescription: vi.fn(),
  onAddDescription: vi.fn(),
  onSaveNote: vi.fn(),
  onDeleteNote: vi.fn(),
  onAddNote: vi.fn(),
  onSaveRepeat: vi.fn(),
  onDeleteRepeat: vi.fn(),
  onEditTutorial: vi.fn(),
  onDeleteTutorial: vi.fn(),
  onAddTutorial: vi.fn(),
  onEditPartTools: vi.fn(),
  onUpdatePartTool: vi.fn(),
  onUpdateSubstepPartToolAmount: vi.fn(),
  onAddSubstepPartTool: vi.fn(),
  onDeleteSubstepPartTool: vi.fn(),
};

const mockOnUploadSubstepImage = vi.fn();
const mockOnUploadSubstepVideo = vi.fn().mockResolvedValue(undefined);

const baseProps: SubstepEditPopoverProps = {
  open: true,
  onClose: vi.fn(),
  callbacks,
  onUploadSubstepImage: mockOnUploadSubstepImage,
  descriptions: [
    { id: 'desc-1', substepId: 's1', text: 'First description', order: 1 },
    { id: 'desc-2', substepId: 's1', text: 'Second description', order: 2 },
  ],
  notes: [
    {
      id: 'note-row-1',
      substepId: 's1',
      noteId: 'note-1',
      order: 1,
      note: { id: 'note-1', versionId: 'v1', instructionId: 'i1', text: 'Safety note', safetyIconId: 'W001-Allgemeines-Warnzeichen.png', safetyIconCategory: 'Warnzeichen' },
    },
  ],
  partTools: [
    {
      id: 'pt-row-1',
      versionId: 'v1',
      substepId: 's1',
      partToolId: 'pt-1',
      amount: 2,
      order: 1,
      partTool: {
        id: 'pt-1', versionId: 'v1', instructionId: 'i1', previewImageId: null,
        name: 'Wrench', label: null, type: 'Tool' as const, partNumber: 'PT-001',
        amount: 10, description: null, unit: null, material: 'Steel', dimension: '10mm',
        iconId: null,
      },
    },
    {
      id: 'pt-row-2',
      versionId: 'v1',
      substepId: 's1',
      partToolId: 'pt-2',
      amount: 1,
      order: 2,
      partTool: {
        id: 'pt-2', versionId: 'v1', instructionId: 'i1', previewImageId: null,
        name: 'Bolt M6', label: null, type: 'Part' as const, partNumber: null,
        amount: 50, description: null, unit: null, material: null, dimension: null,
        iconId: null,
      },
    },
  ],
  repeatCount: 3,
  repeatLabel: 'left & right',
  tutorials: [{ kind: 'see', label: 'See Step 3' }],
  hasImage: true,
  hasVideo: true,
};

beforeEach(() => {
  Object.values(callbacks).forEach((fn) => fn.mockClear());
  (baseProps.onClose as ReturnType<typeof vi.fn>).mockClear();
  mockOnUploadSubstepImage.mockClear();
  mockOnUploadSubstepVideo.mockClear();
  mockOnUploadSubstepVideo.mockResolvedValue(undefined);
  mockCropOnConfirm = null;
  mockCropOnCancel = null;
  mockVideoTrimOnConfirm = null;
  mockVideoTrimOnClose = null;
  mockCaptureSnapshot.mockClear();
  mockUndo.mockClear();
  mockRedo.mockClear();
  mockReset.mockClear();
  mockCanUndo = false;
  mockCanRedo = false;
});

// ============================================================
// Visibility
// ============================================================
describe('SubstepEditPopover — visibility', () => {
  it('renders nothing when open=false', () => {
    const { container } = render(<SubstepEditPopover {...baseProps} open={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders popover when open=true', () => {
    render(<SubstepEditPopover {...baseProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

// ============================================================
// Layout — section cards
// ============================================================
describe('SubstepEditPopover — section cards', () => {
  it('renders section-media card when open', () => {
    render(<SubstepEditPopover {...baseProps} />);
    expect(screen.getByTestId('section-media')).toBeInTheDocument();
  });

  it('renders section-descriptions card when open', () => {
    render(<SubstepEditPopover {...baseProps} />);
    expect(screen.getByTestId('section-descriptions')).toBeInTheDocument();
  });

  it('renders section-notes card when open', () => {
    render(<SubstepEditPopover {...baseProps} />);
    expect(screen.getByTestId('section-notes')).toBeInTheDocument();
  });

  it('renders section-repeat card when open', () => {
    render(<SubstepEditPopover {...baseProps} />);
    expect(screen.getByTestId('section-repeat')).toBeInTheDocument();
  });

  it('renders section-tutorials card when open', () => {
    render(<SubstepEditPopover {...baseProps} />);
    expect(screen.getByTestId('section-tutorials')).toBeInTheDocument();
  });

  it('renders section-parts card when open', () => {
    render(<SubstepEditPopover {...baseProps} />);
    expect(screen.getByTestId('section-parts')).toBeInTheDocument();
  });

  it('media card shows empty state when hasImage=false and hasVideo=false', () => {
    render(<SubstepEditPopover {...baseProps} hasImage={false} hasVideo={false} />);
    const mediaCard = screen.getByTestId('section-media');
    expect(mediaCard).toHaveTextContent('No media');
  });

  it('repeat card shows "Add repeat" when repeatCount <= 1', () => {
    render(<SubstepEditPopover {...baseProps} repeatCount={1} />);
    expect(screen.getByTestId('popover-add-repeat')).toBeInTheDocument();
  });
});

// ============================================================
// Media section — actions do NOT auto-close
// ============================================================
describe('SubstepEditPopover — media', () => {
  it('shows image row with edit + delete when hasImage=true', () => {
    render(<SubstepEditPopover {...baseProps} />);
    expect(screen.getByTestId('media-image-row')).toBeInTheDocument();
  });

  it('shows video row with edit + delete when hasVideo=true', () => {
    render(<SubstepEditPopover {...baseProps} />);
    expect(screen.getByTestId('media-video-row')).toBeInTheDocument();
  });

  it('clicking edit-image pencil opens the file input (no close)', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    const row = screen.getByTestId('media-image-row');
    const editBtn = row.querySelector('[aria-label="Edit image"]');
    expect(editBtn).toBeTruthy();

    // Mock click on hidden file input
    const fileInput = screen.getByTestId('substep-image-file-input') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click');

    await user.click(editBtn!);
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(baseProps.onClose).not.toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('selecting a file opens the crop dialog', async () => {
    render(<SubstepEditPopover {...baseProps} />);

    const fileInput = screen.getByTestId('substep-image-file-input') as HTMLInputElement;
    const testFile = new File(['test'], 'photo.png', { type: 'image/png' });

    // Simulate file selection
    await userEvent.upload(fileInput, testFile);

    expect(screen.getByTestId('crop-dialog')).toBeInTheDocument();
  });

  it('crop confirm calls onUploadSubstepImage(file, crop)', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    const fileInput = screen.getByTestId('substep-image-file-input') as HTMLInputElement;
    const testFile = new File(['test'], 'photo.png', { type: 'image/png' });

    await userEvent.upload(fileInput, testFile);
    expect(screen.getByTestId('crop-dialog')).toBeInTheDocument();

    await user.click(screen.getByTestId('crop-confirm'));

    expect(mockOnUploadSubstepImage).toHaveBeenCalledOnce();
    expect(mockOnUploadSubstepImage).toHaveBeenCalledWith(
      expect.any(File),
      { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
    );
    expect(mockCaptureSnapshot).toHaveBeenCalled();
    // Crop dialog should be closed
    expect(screen.queryByTestId('crop-dialog')).not.toBeInTheDocument();
  });

  it('crop cancel cleans up state without calling onUploadSubstepImage', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    const fileInput = screen.getByTestId('substep-image-file-input') as HTMLInputElement;
    const testFile = new File(['test'], 'photo.png', { type: 'image/png' });

    await userEvent.upload(fileInput, testFile);
    expect(screen.getByTestId('crop-dialog')).toBeInTheDocument();

    await user.click(screen.getByTestId('crop-cancel'));

    expect(mockOnUploadSubstepImage).not.toHaveBeenCalled();
    expect(screen.queryByTestId('crop-dialog')).not.toBeInTheDocument();
  });

  it('fires onDeleteImage WITHOUT closing when image delete is clicked', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    const row = screen.getByTestId('media-image-row');
    const deleteBtn = row.querySelector('[aria-label="Delete image"]');
    expect(deleteBtn).toBeTruthy();
    await user.click(deleteBtn!);
    expect(callbacks.onDeleteImage).toHaveBeenCalledOnce();
    expect(mockCaptureSnapshot).toHaveBeenCalledOnce();
    expect(baseProps.onClose).not.toHaveBeenCalled();
  });

  it('fires onEditVideo WITHOUT closing when video edit is clicked', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    const row = screen.getByTestId('media-video-row');
    const editBtn = row.querySelector('[aria-label="Edit video"]');
    expect(editBtn).toBeTruthy();
    await user.click(editBtn!);
    expect(callbacks.onEditVideo).toHaveBeenCalledOnce();
    expect(mockCaptureSnapshot).toHaveBeenCalledOnce();
    expect(baseProps.onClose).not.toHaveBeenCalled();
  });

  it('fires onDeleteVideo WITHOUT closing when video delete is clicked', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    const row = screen.getByTestId('media-video-row');
    const deleteBtn = row.querySelector('[aria-label="Delete video"]');
    expect(deleteBtn).toBeTruthy();
    await user.click(deleteBtn!);
    expect(callbacks.onDeleteVideo).toHaveBeenCalledOnce();
    expect(mockCaptureSnapshot).toHaveBeenCalledOnce();
    expect(baseProps.onClose).not.toHaveBeenCalled();
  });

  it('media image row still has edit pencil button (regression guard)', () => {
    render(<SubstepEditPopover {...baseProps} />);
    expect(screen.getByLabelText('Edit image')).toBeInTheDocument();
  });

  it('does not show file input when hasImage=false', () => {
    render(<SubstepEditPopover {...baseProps} hasImage={false} hasVideo={false} />);
    expect(screen.queryByTestId('substep-image-file-input')).not.toBeInTheDocument();
  });
});

// ============================================================
// Descriptions — inline editing
// ============================================================
describe('SubstepEditPopover — descriptions', () => {
  it('shows each description row', () => {
    render(<SubstepEditPopover {...baseProps} />);
    expect(screen.getByText('First description')).toBeInTheDocument();
    expect(screen.getByText('Second description')).toBeInTheDocument();
  });

  it('clicking description text switches row to textarea with current text', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    await user.click(screen.getByText('First description'));

    const textarea = screen.getByTestId('inline-edit-desc-desc-1');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue('First description');
  });

  it('Escape cancels inline edit, returns to display mode', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    // Enter edit mode by clicking text
    await user.click(screen.getByText('First description'));
    expect(screen.getByTestId('inline-edit-desc-desc-1')).toBeInTheDocument();

    // Press Escape
    await user.keyboard('{Escape}');

    // Should be back to display mode
    expect(screen.queryByTestId('inline-edit-desc-desc-1')).not.toBeInTheDocument();
    expect(screen.getByText('First description')).toBeInTheDocument();
    // Should NOT have closed the popover
    expect(baseProps.onClose).not.toHaveBeenCalled();
  });

  it('Ctrl+Enter saves and calls onSaveDescription(id, text)', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    // Enter edit mode by clicking text
    await user.click(screen.getByText('First description'));

    // Edit the text
    const textarea = screen.getByTestId('inline-edit-desc-desc-1');
    await user.clear(textarea);
    await user.type(textarea, 'Updated description');

    // Ctrl+Enter to save
    await user.keyboard('{Control>}{Enter}{/Control}');

    expect(callbacks.onSaveDescription).toHaveBeenCalledWith('desc-1', 'Updated description');
    expect(mockCaptureSnapshot).toHaveBeenCalled();
    // Should exit edit mode
    expect(screen.queryByTestId('inline-edit-desc-desc-1')).not.toBeInTheDocument();
  });

  it('Enter saves description edit (plain Enter, no modifier)', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    await user.click(screen.getByText('First description'));

    const textarea = screen.getByTestId('inline-edit-desc-desc-1');
    await user.clear(textarea);
    await user.type(textarea, 'Updated via Enter');

    await user.keyboard('{Enter}');

    expect(callbacks.onSaveDescription).toHaveBeenCalledWith('desc-1', 'Updated via Enter');
    expect(mockCaptureSnapshot).toHaveBeenCalled();
    expect(screen.queryByTestId('inline-edit-desc-desc-1')).not.toBeInTheDocument();
  });

  it('blur commits description edit + fires callback', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    await user.click(screen.getByText('First description'));

    const textarea = screen.getByTestId('inline-edit-desc-desc-1');
    await user.clear(textarea);
    await user.type(textarea, 'Blurred text');

    // Blur by tabbing away
    await user.tab();

    // Wait for setTimeout in handleBlurSave
    await vi.waitFor(() => {
      expect(callbacks.onSaveDescription).toHaveBeenCalledWith('desc-1', 'Blurred text');
    });
    expect(mockCaptureSnapshot).toHaveBeenCalled();
  });

  it('description row does not have edit pencil button', () => {
    render(<SubstepEditPopover {...baseProps} />);
    const row = screen.getByTestId('popover-desc-desc-1');
    expect(row.querySelector('[aria-label="Edit description"]')).toBeNull();
  });

  it('fires onDeleteDescription(id) WITHOUT closing when delete clicked', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    const row = screen.getByTestId('popover-desc-desc-2');
    const deleteBtn = row.querySelector('[aria-label="Delete description"]');
    await user.click(deleteBtn!);
    expect(callbacks.onDeleteDescription).toHaveBeenCalledWith('desc-2');
    expect(mockCaptureSnapshot).toHaveBeenCalledOnce();
    expect(baseProps.onClose).not.toHaveBeenCalled();
  });

  it('clicking "+" shows inline add textarea, Enter commits onAddDescription(text)', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    await user.click(screen.getByTestId('popover-add-description'));
    expect(screen.getByTestId('inline-add-desc')).toBeInTheDocument();

    const textarea = screen.getByTestId('inline-add-desc-input');
    await user.type(textarea, 'New description');

    await user.keyboard('{Enter}');

    expect(callbacks.onAddDescription).toHaveBeenCalledWith('New description');
    expect(mockCaptureSnapshot).toHaveBeenCalled();
  });

  it('Cancel discards description edit without firing callback', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    await user.click(screen.getByText('First description'));
    const textarea = screen.getByTestId('inline-edit-desc-desc-1');
    await user.clear(textarea);
    await user.type(textarea, 'Should be discarded');

    // Click cancel button
    await user.click(screen.getByLabelText('Cancel'));

    // Wait for any pending blur timeout
    await vi.waitFor(() => {
      expect(screen.queryByTestId('inline-edit-desc-desc-1')).not.toBeInTheDocument();
    });
    expect(callbacks.onSaveDescription).not.toHaveBeenCalled();
  });
});

// ============================================================
// Notes — inline editing
// ============================================================
describe('SubstepEditPopover — notes', () => {
  it('shows each note row', () => {
    render(<SubstepEditPopover {...baseProps} />);
    expect(screen.getByText('Safety note')).toBeInTheDocument();
  });

  it('clicking note text expands row with input + SafetyIconPicker', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    await user.click(screen.getByText('Safety note'));

    expect(screen.getByTestId('inline-edit-note-note-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('inline-icon-picker')).toBeInTheDocument();
  });

  it('Enter saves note edit (plain Enter, no modifier)', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    await user.click(screen.getByText('Safety note'));

    const input = screen.getByTestId('inline-edit-note-note-row-1');
    await user.clear(input);
    await user.type(input, 'Updated note via Enter');

    await user.keyboard('{Enter}');

    expect(callbacks.onSaveNote).toHaveBeenCalledWith(
      'note-row-1',
      'Updated note via Enter',
      'W001-Allgemeines-Warnzeichen.png',
      'Warnzeichen',
    );
    expect(mockCaptureSnapshot).toHaveBeenCalled();
  });

  it('blur commits note edit + fires callback', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    await user.click(screen.getByText('Safety note'));

    const input = screen.getByTestId('inline-edit-note-note-row-1');
    await user.clear(input);
    await user.type(input, 'Blurred note');

    // Blur by tabbing away
    await user.tab();

    await vi.waitFor(() => {
      expect(callbacks.onSaveNote).toHaveBeenCalledWith(
        'note-row-1',
        'Blurred note',
        'W001-Allgemeines-Warnzeichen.png',
        'Warnzeichen',
      );
    });
    expect(mockCaptureSnapshot).toHaveBeenCalled();
  });

  it('note row does not have edit pencil button', () => {
    render(<SubstepEditPopover {...baseProps} />);
    const row = screen.getByTestId('popover-note-note-row-1');
    expect(row.querySelector('[aria-label="Edit note"]')).toBeNull();
  });

  it('fires onDeleteNote(id) WITHOUT closing when delete clicked', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    const row = screen.getByTestId('popover-note-note-row-1');
    const deleteBtn = row.querySelector('[aria-label="Delete note"]');
    await user.click(deleteBtn!);
    expect(callbacks.onDeleteNote).toHaveBeenCalledWith('note-row-1');
    expect(mockCaptureSnapshot).toHaveBeenCalledOnce();
    expect(baseProps.onClose).not.toHaveBeenCalled();
  });

  it('clicking inside icon picker does not close the inline note editor', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    // Enter edit mode
    await user.click(screen.getByText('Safety note'));
    expect(screen.getByTestId('inline-edit-note-note-row-1')).toBeInTheDocument();

    // Click inside the icon picker wrapper (mouseDown + click)
    const iconPicker = screen.getByTestId('inline-icon-picker');
    fireEvent.mouseDown(iconPicker);

    // The inline editor should still be visible (not closed by blur)
    expect(screen.getByTestId('inline-edit-note-note-row-1')).toBeInTheDocument();
    expect(callbacks.onSaveNote).not.toHaveBeenCalled();
  });

  it('clicking inside add-note icon picker does not close the inline editor', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    // Open add-note inline editor
    await user.click(screen.getByTestId('popover-add-note'));
    expect(screen.getByTestId('inline-add-note')).toBeInTheDocument();

    // Click inside the icon picker wrapper
    const iconPicker = screen.getByTestId('inline-icon-picker-add');
    fireEvent.mouseDown(iconPicker);

    // The inline editor should still be visible
    expect(screen.getByTestId('inline-add-note')).toBeInTheDocument();
  });

  it('clicking "+" shows inline add note, Enter without icon does not call onAddNote', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    await user.click(screen.getByTestId('popover-add-note'));
    expect(screen.getByTestId('inline-add-note')).toBeInTheDocument();

    const input = screen.getByTestId('inline-add-note-input');
    await user.type(input, 'New note text');

    // Enter without selecting an icon — should not call onAddNote (icon required)
    await user.keyboard('{Enter}');

    expect(callbacks.onAddNote).not.toHaveBeenCalled();
  });
});

// ============================================================
// Repeat — inline editing
// ============================================================
describe('SubstepEditPopover — repeat', () => {
  it('shows repeat row when repeatCount > 1', () => {
    render(<SubstepEditPopover {...baseProps} />);
    expect(screen.getByTestId('popover-repeat-row')).toBeInTheDocument();
    expect(screen.getByText(/×3/)).toBeInTheDocument();
  });

  it('clicking repeat row text opens inline repeat editor', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    await user.click(screen.getByText(/×3/));
    expect(screen.getByTestId('inline-edit-repeat')).toBeInTheDocument();
  });

  it('clicking "+" on repeat shows inline repeat editor with defaults', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} repeatCount={1} />);

    await user.click(screen.getByTestId('popover-add-repeat'));
    expect(screen.getByTestId('inline-edit-repeat')).toBeInTheDocument();
    // Default count should be 2 when no existing repeat
    expect(screen.getByTestId('inline-edit-repeat-count')).toHaveValue(2);
  });

  it('Enter saves repeat edit (plain Enter, no modifier)', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} repeatCount={3} repeatLabel="left & right" />);

    await user.click(screen.getByText(/×3/));

    const labelInput = screen.getByTestId('inline-edit-repeat-label');
    await user.clear(labelInput);
    await user.type(labelInput, 'both sides');

    await user.keyboard('{Enter}');

    expect(callbacks.onSaveRepeat).toHaveBeenCalledWith(3, 'both sides');
    expect(mockCaptureSnapshot).toHaveBeenCalled();
  });

  it('blur commits repeat edit + fires onSaveRepeat', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} repeatCount={1} repeatLabel={null} />);

    await user.click(screen.getByTestId('popover-add-repeat'));

    const countInput = screen.getByTestId('inline-edit-repeat-count');
    await user.tripleClick(countInput);
    await user.keyboard('5');

    const labelInput = screen.getByTestId('inline-edit-repeat-label');
    await user.type(labelInput, 'each side');

    // Simulate blur leaving the repeat editor container (relatedTarget outside)
    const container = screen.getByTestId('inline-edit-repeat');
    fireEvent.blur(labelInput, { relatedTarget: document.body });
    // Also trigger container onBlur
    fireEvent.blur(container, { relatedTarget: document.body });

    await vi.waitFor(() => {
      expect(callbacks.onSaveRepeat).toHaveBeenCalledWith(5, 'each side');
    });
    expect(mockCaptureSnapshot).toHaveBeenCalled();
  });

  it('Enter on repeat label commits repeat with empty label as null', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} repeatCount={1} repeatLabel={null} />);

    await user.click(screen.getByTestId('popover-add-repeat'));

    // Focus the label and press Enter
    const labelInput = screen.getByTestId('inline-edit-repeat-label');
    await user.click(labelInput);
    await user.keyboard('{Enter}');

    expect(callbacks.onSaveRepeat).toHaveBeenCalledWith(2, null);
  });

  it('cancel hides inline repeat editor', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} repeatCount={1} />);

    await user.click(screen.getByTestId('popover-add-repeat'));
    expect(screen.getByTestId('inline-edit-repeat')).toBeInTheDocument();

    await user.click(screen.getByTestId('cancel-repeat'));
    expect(screen.queryByTestId('inline-edit-repeat')).not.toBeInTheDocument();
  });

  it('fires onDeleteRepeat WITHOUT closing when repeat delete clicked', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    const row = screen.getByTestId('popover-repeat-row');
    const deleteBtn = row.querySelector('[aria-label="Delete repeat"]');
    await user.click(deleteBtn!);
    expect(callbacks.onDeleteRepeat).toHaveBeenCalledOnce();
    expect(mockCaptureSnapshot).toHaveBeenCalledOnce();
    expect(baseProps.onClose).not.toHaveBeenCalled();
  });

  it('editing existing repeat pre-fills count and label', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} repeatCount={3} repeatLabel="left & right" />);

    await user.click(screen.getByText(/×3/));
    expect(screen.getByTestId('inline-edit-repeat-count')).toHaveValue(3);
    expect(screen.getByTestId('inline-edit-repeat-label')).toHaveValue('left & right');
  });
});

// ============================================================
// Tutorials — actions do NOT auto-close
// ============================================================
describe('SubstepEditPopover — tutorials', () => {
  it('shows tutorial rows', () => {
    render(<SubstepEditPopover {...baseProps} />);
    expect(screen.getByText('See Step 3')).toBeInTheDocument();
  });

  it('fires onEditTutorial(0) WITHOUT closing when tutorial text clicked', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    await user.click(screen.getByText('See Step 3'));
    expect(callbacks.onEditTutorial).toHaveBeenCalledWith(0);
    expect(mockCaptureSnapshot).toHaveBeenCalledOnce();
    expect(baseProps.onClose).not.toHaveBeenCalled();
  });

  it('tutorial row does not have edit pencil button', () => {
    render(<SubstepEditPopover {...baseProps} />);
    const row = screen.getByTestId('popover-tutorial-0');
    expect(row.querySelector('[aria-label="Edit tutorial"]')).toBeNull();
  });

  it('fires onDeleteTutorial(0) WITHOUT closing when delete clicked', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    const row = screen.getByTestId('popover-tutorial-0');
    const deleteBtn = row.querySelector('[aria-label="Delete tutorial"]');
    await user.click(deleteBtn!);
    expect(callbacks.onDeleteTutorial).toHaveBeenCalledWith(0);
    expect(mockCaptureSnapshot).toHaveBeenCalledOnce();
    expect(baseProps.onClose).not.toHaveBeenCalled();
  });

  it('tutorials add button is disabled', () => {
    render(<SubstepEditPopover {...baseProps} tutorials={[]} />);
    expect(screen.getByTestId('popover-add-tutorial')).toBeDisabled();
  });
});

// ============================================================
// Parts/Tools — inline table
// ============================================================
describe('SubstepEditPopover — parts/tools table', () => {
  it('renders PartToolTable in section-parts card', () => {
    render(<SubstepEditPopover {...baseProps} />);
    const section = screen.getByTestId('section-parts');
    expect(section).toBeInTheDocument();
    // Table rows are rendered inside the section
    expect(screen.getByTestId('parttool-row-pt-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('parttool-row-pt-row-2')).toBeInTheDocument();
  });

  it('shows partTool names as input values', () => {
    render(<SubstepEditPopover {...baseProps} />);
    expect(screen.getByDisplayValue('Wrench')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Bolt M6')).toBeInTheDocument();
  });

  it('shows amount inputs with correct values', () => {
    render(<SubstepEditPopover {...baseProps} />);
    expect(screen.getByDisplayValue('2')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1')).toBeInTheDocument();
  });

  it('add button fires onAddSubstepPartTool with snapshot', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    const addBtn = screen.getByTestId('parttool-add');
    await user.click(addBtn);
    expect(callbacks.onAddSubstepPartTool).toHaveBeenCalledOnce();
    expect(mockCaptureSnapshot).toHaveBeenCalledOnce();
    expect(baseProps.onClose).not.toHaveBeenCalled();
  });

  it('shows add button even when no parts', () => {
    render(<SubstepEditPopover {...baseProps} partTools={[]} />);
    expect(screen.getByTestId('parttool-add')).toBeInTheDocument();
  });

  it('delete fires onDeleteSubstepPartTool with snapshot', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    const deleteBtns = screen.getAllByLabelText('Delete part/tool');
    await user.click(deleteBtns[0]);
    expect(callbacks.onDeleteSubstepPartTool).toHaveBeenCalledWith('pt-row-1');
    expect(mockCaptureSnapshot).toHaveBeenCalledOnce();
  });
});

// ============================================================
// PartTool list open button
// ============================================================
describe('SubstepEditPopover — onOpenPartToolList button', () => {
  it('does not render edit-list button when onOpenPartToolList is undefined', () => {
    render(<SubstepEditPopover {...baseProps} />);
    expect(screen.queryByTestId('parttool-list-open')).not.toBeInTheDocument();
  });

  it('renders edit-list button with correct aria-label when onOpenPartToolList is provided', () => {
    const onOpenPartToolList = vi.fn();
    render(<SubstepEditPopover {...baseProps} onOpenPartToolList={onOpenPartToolList} />);
    const btn = screen.getByTestId('parttool-list-open');
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('aria-label', 'Edit part/tool list');
  });

  it('clicking edit-list button fires callback without closing popover', async () => {
    const user = userEvent.setup();
    const onOpenPartToolList = vi.fn();
    render(<SubstepEditPopover {...baseProps} onOpenPartToolList={onOpenPartToolList} />);

    await user.click(screen.getByTestId('parttool-list-open'));
    expect(onOpenPartToolList).toHaveBeenCalledOnce();
    expect(baseProps.onClose).not.toHaveBeenCalled();
  });
});

// ============================================================
// Modal close behavior
// ============================================================
describe('SubstepEditPopover — modal close', () => {
  it('fires onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);
    const backdrop = screen.getByTestId('dialog-shell-backdrop');
    await user.click(backdrop);
    expect(baseProps.onClose).toHaveBeenCalledOnce();
  });

  it('fires onClose when X button is clicked', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);
    await user.click(screen.getByLabelText('Close'));
    expect(baseProps.onClose).toHaveBeenCalledOnce();
  });

  it('fires onClose when Escape is pressed (not editing)', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);
    await user.keyboard('{Escape}');
    expect(baseProps.onClose).toHaveBeenCalledOnce();
  });
});

// ============================================================
// Media preview (ReactNode)
// ============================================================
describe('SubstepEditPopover — media preview', () => {
  it('renders mediaPreview ReactNode inside media-preview area', () => {
    const preview = createElement('img', { src: 'test.jpg', alt: 'preview', 'data-testid': 'test-media-img' });
    render(<SubstepEditPopover {...baseProps} mediaPreview={preview} />);
    expect(screen.getByTestId('media-preview')).toBeInTheDocument();
    expect(screen.getByTestId('test-media-img')).toBeInTheDocument();
  });

  it('shows empty state when no mediaPreview and no media flags', () => {
    render(<SubstepEditPopover {...baseProps} hasImage={false} hasVideo={false} />);
    const mediaCard = screen.getByTestId('section-media');
    expect(mediaCard).toHaveTextContent('No media');
  });

  it('shows placeholder when hasImage but no mediaPreview', () => {
    render(<SubstepEditPopover {...baseProps} hasImage={true} hasVideo={false} mediaPreview={undefined} />);
    // Should still render the media section without crashing — buttons visible
    expect(screen.getByTestId('media-image-row')).toBeInTheDocument();
  });
});

// ============================================================
// Note category badges
// ============================================================
describe('SubstepEditPopover — note category badges', () => {
  it('shows note category text in each note row', () => {
    render(<SubstepEditPopover {...baseProps} />);
    const noteRow = screen.getByTestId('popover-note-note-row-1');
    expect(noteRow).toHaveTextContent('Warnzeichen');
  });

  it('shows category text for each note category', () => {
    const multiNotes = [
      {
        id: 'nr-1', versionId: 'v1', substepId: 's1', noteId: 'n-1', order: 1,
        note: { id: 'n-1', versionId: 'v1', instructionId: 'i1', text: 'Prohibition note', safetyIconId: 'P001-Allgemeines-Verbotszeichen.png', safetyIconCategory: 'Verbotszeichen' as const },
      },
      {
        id: 'nr-2', versionId: 'v1', substepId: 's1', noteId: 'n-2', order: 2,
        note: { id: 'n-2', versionId: 'v1', instructionId: 'i1', text: 'Mandatory note', safetyIconId: 'M001_Allgemeines-Gebotszeichen.png', safetyIconCategory: 'Gebotszeichen' as const },
      },
    ];
    render(<SubstepEditPopover {...baseProps} notes={multiNotes} />);
    expect(screen.getByTestId('popover-note-nr-1')).toHaveTextContent('Verbotszeichen');
    expect(screen.getByTestId('popover-note-nr-2')).toHaveTextContent('Gebotszeichen');
  });
});

// ============================================================
// Two-column layout
// ============================================================
describe('SubstepEditPopover — layout', () => {
  it('renders sidebar and content columns', () => {
    render(<SubstepEditPopover {...baseProps} />);
    expect(screen.getByTestId('popover-col-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('popover-col-content')).toBeInTheDocument();
  });
});

// ============================================================
// Undo/Redo buttons in header
// ============================================================
describe('SubstepEditPopover — undo/redo', () => {
  it('renders undo and redo buttons in header', () => {
    render(<SubstepEditPopover {...baseProps} />);
    expect(screen.getByLabelText('Undo')).toBeInTheDocument();
    expect(screen.getByLabelText('Redo')).toBeInTheDocument();
  });

  it('undo button is disabled when canUndo=false', () => {
    mockCanUndo = false;
    render(<SubstepEditPopover {...baseProps} />);
    expect(screen.getByLabelText('Undo')).toBeDisabled();
  });

  it('undo button is enabled when canUndo=true', () => {
    mockCanUndo = true;
    render(<SubstepEditPopover {...baseProps} />);
    expect(screen.getByLabelText('Undo')).not.toBeDisabled();
  });

  it('redo button is disabled when canRedo=false', () => {
    mockCanRedo = false;
    render(<SubstepEditPopover {...baseProps} />);
    expect(screen.getByLabelText('Redo')).toBeDisabled();
  });

  it('redo button is enabled when canRedo=true', () => {
    mockCanRedo = true;
    render(<SubstepEditPopover {...baseProps} />);
    expect(screen.getByLabelText('Redo')).not.toBeDisabled();
  });

  it('clicking undo calls the undo function', async () => {
    mockCanUndo = true;
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);
    await user.click(screen.getByLabelText('Undo'));
    expect(mockUndo).toHaveBeenCalledOnce();
  });

  it('clicking redo calls the redo function', async () => {
    mockCanRedo = true;
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);
    await user.click(screen.getByLabelText('Redo'));
    expect(mockRedo).toHaveBeenCalledOnce();
  });
});

// ============================================================
// Video upload flow
// ============================================================
describe('SubstepEditPopover — video upload', () => {
  const videoProps = {
    ...baseProps,
    substepId: 's1',
    onUploadSubstepVideo: mockOnUploadSubstepVideo,
  };

  it('shows "Add video" button when hasVideo=false and onUploadSubstepVideo is provided', () => {
    render(<SubstepEditPopover {...videoProps} hasVideo={false} />);
    expect(screen.getByTestId('btn-add-video')).toBeInTheDocument();
  });

  it('does not show "Add video" when onUploadSubstepVideo is not provided', () => {
    render(<SubstepEditPopover {...baseProps} hasVideo={false} />);
    expect(screen.queryByTestId('btn-add-video')).not.toBeInTheDocument();
  });

  it('shows video file input when onUploadSubstepVideo is provided', () => {
    render(<SubstepEditPopover {...videoProps} />);
    expect(screen.getByTestId('substep-video-file-input')).toBeInTheDocument();
  });

  it('"Add video" click opens file picker', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...videoProps} hasVideo={false} hasImage={false} />);

    const fileInput = screen.getByTestId('substep-video-file-input') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click');

    await user.click(screen.getByTestId('btn-add-video'));
    expect(clickSpy).toHaveBeenCalledOnce();
    clickSpy.mockRestore();
  });

  it('selecting a video file opens VideoTrimDialog', async () => {
    render(<SubstepEditPopover {...videoProps} />);

    const fileInput = screen.getByTestId('substep-video-file-input') as HTMLInputElement;
    const testFile = new File(['video-data'], 'clip.mp4', { type: 'video/mp4' });

    await userEvent.upload(fileInput, testFile);

    expect(screen.getByTestId('video-editor-dialog')).toBeInTheDocument();
  });

  it('cancelling VideoTrimDialog closes it without calling upload', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...videoProps} />);

    const fileInput = screen.getByTestId('substep-video-file-input') as HTMLInputElement;
    const testFile = new File(['video-data'], 'clip.mp4', { type: 'video/mp4' });
    await userEvent.upload(fileInput, testFile);

    await user.click(screen.getByTestId('video-editor-cancel'));

    expect(screen.queryByTestId('video-editor-dialog')).not.toBeInTheDocument();
    expect(mockOnUploadSubstepVideo).not.toHaveBeenCalled();
  });
});
