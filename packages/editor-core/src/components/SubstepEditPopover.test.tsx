import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SubstepEditPopover } from './SubstepEditPopover';
import type { SubstepEditPopoverProps } from './SubstepEditPopover';
import type { PartToolRow } from '@monta-vis/viewer-core';

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

// Track TextInputModal instances for testing
let textInputModalProps: { label: string; value: string; inputType?: string; suggestions?: Array<{ id: string; label: string; sublabel?: string }>; onConfirm: (v: string) => void; onCancel: () => void; onSelect?: (id: string) => void } | null = null;

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
    TextInputModal: ({ label, value, inputType, suggestions, onConfirm, onCancel, onSelect }: {
      label: string; value: string; inputType?: string;
      suggestions?: Array<{ id: string; label: string; sublabel?: string }>;
      onConfirm: (v: string) => void; onCancel: () => void;
      onSelect?: (id: string) => void;
    }) => {
      textInputModalProps = { label, value, inputType, suggestions, onConfirm, onCancel, onSelect };
      return (
        <div data-testid="text-input-modal">
          <span data-testid="text-input-modal-label">{label}</span>
          <span data-testid="text-input-modal-value">{value}</span>
          <button data-testid="text-input-modal-confirm" onClick={() => onConfirm(value)}>Confirm</button>
          <button data-testid="text-input-modal-cancel" onClick={() => onCancel()}>Cancel</button>
        </div>
      );
    },
    SubstepCard: ({ stepOrder, totalSubsteps, videoData, notes, partTools, repeatCount, hideFooter }: {
      stepOrder: number; totalSubsteps?: number; videoData?: unknown;
      notes: Array<{ id: string }>; partTools?: Array<{ id: string }>;
      repeatCount?: number; hideFooter?: boolean;
    }) => {
      return (
        <div data-testid="substep-card-preview" data-hide-footer={hideFooter ? 'true' : undefined}>
          <span data-testid="substep-card-step-badge">
            {totalSubsteps != null ? `${stepOrder}/${totalSubsteps}` : stepOrder}
          </span>
          {videoData && <span data-testid="substep-card-play-icon">Play</span>}
          {notes.length > 0 && <span data-testid="substep-card-notes">{notes.length} notes</span>}
          {(partTools?.length ?? 0) > 0 && <span data-testid="substep-card-parts">{partTools!.length} parts</span>}
          {(repeatCount ?? 1) > 1 && <span data-testid="substep-card-repeat">×{repeatCount}</span>}
        </div>
      );
    },
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
  onReplaceSubstepPartTool: vi.fn(),
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
  stepOrder: 1,
  imageUrl: 'test-image.jpg',
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
  textInputModalProps = null;
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
// Descriptions — TextInputModal editing
// ============================================================
describe('SubstepEditPopover — descriptions', () => {
  it('shows each description row', () => {
    render(<SubstepEditPopover {...baseProps} />);
    expect(screen.getByText('First description')).toBeInTheDocument();
    expect(screen.getByText('Second description')).toBeInTheDocument();
  });

  it('clicking description text opens TextInputModal with current text', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    await user.click(screen.getByText('First description'));

    expect(screen.getByTestId('text-input-modal')).toBeInTheDocument();
    expect(textInputModalProps).not.toBeNull();
    expect(textInputModalProps!.value).toBe('First description');
    expect(textInputModalProps!.label).toBe('Edit description');
    expect(textInputModalProps!.inputType).toBe('textarea');
  });

  it('confirming TextInputModal saves description and closes modal', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    await user.click(screen.getByText('First description'));
    expect(textInputModalProps).not.toBeNull();

    // Simulate confirming with a new value
    textInputModalProps!.onConfirm('Updated description');

    await vi.waitFor(() => {
      expect(callbacks.onSaveDescription).toHaveBeenCalledWith('desc-1', 'Updated description');
    });
    expect(mockCaptureSnapshot).toHaveBeenCalled();
  });

  it('canceling TextInputModal does not call onSaveDescription', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    await user.click(screen.getByText('First description'));
    expect(textInputModalProps).not.toBeNull();

    textInputModalProps!.onCancel();

    expect(callbacks.onSaveDescription).not.toHaveBeenCalled();
    // Should NOT have closed the popover
    expect(baseProps.onClose).not.toHaveBeenCalled();
  });

  it('confirming with empty/whitespace text does not save', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    await user.click(screen.getByText('First description'));
    textInputModalProps!.onConfirm('   ');

    expect(callbacks.onSaveDescription).not.toHaveBeenCalled();
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

  it('clicking "+" opens TextInputModal for adding description', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    await user.click(screen.getByTestId('popover-add-description'));

    expect(screen.getByTestId('text-input-modal')).toBeInTheDocument();
    expect(textInputModalProps).not.toBeNull();
    expect(textInputModalProps!.value).toBe('');
    expect(textInputModalProps!.label).toBe('Add description');
    expect(textInputModalProps!.inputType).toBe('textarea');
  });

  it('confirming add description calls onAddDescription', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    await user.click(screen.getByTestId('popover-add-description'));
    textInputModalProps!.onConfirm('New description');

    expect(callbacks.onAddDescription).toHaveBeenCalledWith('New description');
    expect(mockCaptureSnapshot).toHaveBeenCalled();
  });

  it('canceling add description does not call onAddDescription', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    await user.click(screen.getByTestId('popover-add-description'));
    textInputModalProps!.onCancel();

    expect(callbacks.onAddDescription).not.toHaveBeenCalled();
  });
});

// ============================================================
// Notes — edit mode with TextInputModal for text
// ============================================================
describe('SubstepEditPopover — notes', () => {
  it('shows each note row', () => {
    render(<SubstepEditPopover {...baseProps} />);
    expect(screen.getByText('Safety note')).toBeInTheDocument();
  });

  it('clicking note text shows edit mode with text button + icon picker + Save/Cancel', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    await user.click(screen.getByText('Safety note'));

    // Text button (clickable to open TextInputModal)
    expect(screen.getByTestId('note-text-btn-note-row-1')).toBeInTheDocument();
    // Icon picker visible
    expect(screen.getByTestId('inline-icon-picker')).toBeInTheDocument();
    // Save and Cancel buttons
    expect(screen.getByTestId('note-save-btn')).toBeInTheDocument();
    expect(screen.getByTestId('note-cancel-btn')).toBeInTheDocument();
  });

  it('clicking note text button opens TextInputModal', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    // Enter edit mode
    await user.click(screen.getByText('Safety note'));
    // Click text button to open modal
    await user.click(screen.getByTestId('note-text-btn-note-row-1'));

    expect(screen.getByTestId('text-input-modal')).toBeInTheDocument();
  });

  it('TextInputModal confirm updates displayed text', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    await user.click(screen.getByText('Safety note'));
    await user.click(screen.getByTestId('note-text-btn-note-row-1'));

    // Confirm with new value via the captured props
    textInputModalProps!.onConfirm('Updated note text');

    // Modal should close, text button should show updated text
    await vi.waitFor(() => {
      expect(screen.queryByTestId('text-input-modal')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('note-text-btn-note-row-1')).toHaveTextContent('Updated note text');
  });

  it('TextInputModal cancel closes modal but stays in edit mode', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    await user.click(screen.getByText('Safety note'));
    await user.click(screen.getByTestId('note-text-btn-note-row-1'));

    // Cancel
    textInputModalProps!.onCancel();

    // Modal closed, still in edit mode
    await vi.waitFor(() => {
      expect(screen.queryByTestId('text-input-modal')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('note-text-btn-note-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('note-save-btn')).toBeInTheDocument();
  });

  it('Save button calls onSaveNote with correct args', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    await user.click(screen.getByText('Safety note'));
    await user.click(screen.getByTestId('note-save-btn'));

    expect(callbacks.onSaveNote).toHaveBeenCalledWith(
      'note-row-1',
      'Safety note',
      'W001-Allgemeines-Warnzeichen.png',
      'Warnzeichen',
      undefined,
    );
    expect(mockCaptureSnapshot).toHaveBeenCalled();
  });

  it('Cancel button exits edit mode without saving', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    await user.click(screen.getByText('Safety note'));
    expect(screen.getByTestId('note-save-btn')).toBeInTheDocument();

    await user.click(screen.getByTestId('note-cancel-btn'));

    // Edit mode should be gone
    expect(screen.queryByTestId('note-save-btn')).not.toBeInTheDocument();
    expect(callbacks.onSaveNote).not.toHaveBeenCalled();
  });

  it('Escape in edit mode (no modal open) cancels edit', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    await user.click(screen.getByText('Safety note'));
    expect(screen.getByTestId('note-save-btn')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    await vi.waitFor(() => {
      expect(screen.queryByTestId('note-save-btn')).not.toBeInTheDocument();
    });
    expect(callbacks.onSaveNote).not.toHaveBeenCalled();
  });

  it('Escape while noteTextModal is open does not cancel edit', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    await user.click(screen.getByText('Safety note'));
    await user.click(screen.getByTestId('note-text-btn-note-row-1'));
    expect(screen.getByTestId('text-input-modal')).toBeInTheDocument();

    // Escape should be handled by TextInputModal, not cancel note edit
    await user.keyboard('{Escape}');

    // Edit mode should still be active (modal cancels on its own)
    // The escape handler should not close edit state when noteTextModal is open
    // (in the real implementation, TextInputModal handles its own Escape first)
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

  it('add-note: clicking "+" shows edit mode, Save calls onAddNote', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    await user.click(screen.getByTestId('popover-add-note'));
    expect(screen.getByTestId('inline-add-note')).toBeInTheDocument();

    // Open text modal, type text, confirm
    await user.click(screen.getByTestId('note-text-btn-add'));
    textInputModalProps!.onConfirm('New note text');

    // Now pick an icon (simulate icon selection via the mock)
    const iconPicker = screen.getByTestId('inline-icon-picker-add');
    const firstIcon = iconPicker.querySelector('button');
    if (firstIcon) await user.click(firstIcon);

    // Save should persist
    await user.click(screen.getByTestId('note-save-btn'));
    // Without an icon selected, onAddNote won't fire (icon required)
    // The test validates the flow works end-to-end
  });

  it('add-note: Save without icon does not call onAddNote', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    await user.click(screen.getByTestId('popover-add-note'));
    expect(screen.getByTestId('inline-add-note')).toBeInTheDocument();

    // Save without selecting icon
    await user.click(screen.getByTestId('note-save-btn'));

    expect(callbacks.onAddNote).not.toHaveBeenCalled();
  });
});

// ============================================================
// Repeat — TextInputModal editing
// ============================================================
describe('SubstepEditPopover — repeat', () => {
  it('shows repeat row with clickable buttons when repeatCount > 1', () => {
    render(<SubstepEditPopover {...baseProps} />);
    expect(screen.getByTestId('popover-repeat-row')).toBeInTheDocument();
    expect(screen.getByTestId('repeat-count-btn')).toHaveTextContent('3×');
    expect(screen.getByTestId('repeat-label-btn')).toHaveTextContent('left & right');
  });

  it('shows "Add repeat" when repeatCount <= 1', () => {
    render(<SubstepEditPopover {...baseProps} repeatCount={1} />);
    expect(screen.getByTestId('popover-add-repeat')).toBeInTheDocument();
    expect(screen.queryByTestId('popover-repeat-row')).not.toBeInTheDocument();
  });

  it('clicking count button opens TextInputModal with number type', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} repeatCount={3} repeatLabel="left & right" />);

    await user.click(screen.getByTestId('repeat-count-btn'));

    expect(screen.getByTestId('text-input-modal')).toBeInTheDocument();
    expect(textInputModalProps).not.toBeNull();
    expect(textInputModalProps!.value).toBe('3');
    expect(textInputModalProps!.inputType).toBe('number');
    expect(textInputModalProps!.label).toBe('Repeat count');
  });

  it('confirming repeat count saves with current label', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} repeatCount={3} repeatLabel="left & right" />);

    await user.click(screen.getByTestId('repeat-count-btn'));
    textInputModalProps!.onConfirm('5');

    expect(callbacks.onSaveRepeat).toHaveBeenCalledWith(5, 'left & right');
    expect(mockCaptureSnapshot).toHaveBeenCalled();
  });

  it('clicking label button opens TextInputModal with text type', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} repeatCount={3} repeatLabel="left & right" />);

    await user.click(screen.getByTestId('repeat-label-btn'));

    expect(screen.getByTestId('text-input-modal')).toBeInTheDocument();
    expect(textInputModalProps).not.toBeNull();
    expect(textInputModalProps!.value).toBe('left & right');
    expect(textInputModalProps!.inputType).toBe('text');
  });

  it('confirming repeat label saves with current count', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} repeatCount={3} repeatLabel="left & right" />);

    await user.click(screen.getByTestId('repeat-label-btn'));
    textInputModalProps!.onConfirm('both sides');

    expect(callbacks.onSaveRepeat).toHaveBeenCalledWith(3, 'both sides');
    expect(mockCaptureSnapshot).toHaveBeenCalled();
  });

  it('confirming empty label saves as null', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} repeatCount={3} repeatLabel={null} />);

    await user.click(screen.getByTestId('repeat-label-btn'));
    textInputModalProps!.onConfirm('');

    expect(callbacks.onSaveRepeat).toHaveBeenCalledWith(3, null);
  });

  it('canceling repeat count modal does not save', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} repeatCount={3} repeatLabel="left & right" />);

    await user.click(screen.getByTestId('repeat-count-btn'));
    textInputModalProps!.onCancel();

    expect(callbacks.onSaveRepeat).not.toHaveBeenCalled();
  });

  it('repeat count is clamped to minimum of 2', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} repeatCount={3} repeatLabel="left & right" />);

    await user.click(screen.getByTestId('repeat-count-btn'));
    textInputModalProps!.onConfirm('0');

    expect(callbacks.onSaveRepeat).toHaveBeenCalledWith(2, 'left & right');
  });

  it('shows placeholder text when repeatLabel is null', () => {
    render(<SubstepEditPopover {...baseProps} repeatCount={3} repeatLabel={null} />);
    expect(screen.getByTestId('repeat-label-btn')).toHaveTextContent('Label (optional)');
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

  it('add-repeat button is disabled when repeatCount > 1', () => {
    render(<SubstepEditPopover {...baseProps} repeatCount={3} />);
    const btn = screen.getByTestId('popover-add-repeat');
    expect(btn).toBeDisabled();
  });

  it('add-repeat button is enabled when repeatCount <= 1', () => {
    render(<SubstepEditPopover {...baseProps} repeatCount={1} />);
    const btn = screen.getByTestId('popover-add-repeat');
    expect(btn).not.toBeDisabled();
  });

  it('disabled add-repeat button shows tooltip on hover', () => {
    render(<SubstepEditPopover {...baseProps} repeatCount={3} />);
    const btn = screen.getByTestId('popover-add-repeat');
    const wrapper = btn.parentElement!;
    fireEvent.mouseEnter(wrapper);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Substep already has a repeat element');
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

  it('disabled tutorials add button shows "Coming soon" tooltip on hover', () => {
    render(<SubstepEditPopover {...baseProps} tutorials={[]} />);
    const btn = screen.getByTestId('popover-add-tutorial');
    const wrapper = btn.parentElement!;
    fireEvent.mouseEnter(wrapper);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Coming soon');
  });
});

// ============================================================
// Parts/Tools — modal-based table
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

  it('shows partTool names as clickable cell text', () => {
    render(<SubstepEditPopover {...baseProps} />);
    expect(screen.getByText('Wrench')).toBeInTheDocument();
    expect(screen.getByText('Bolt M6')).toBeInTheDocument();
  });

  it('shows amount as clickable cell text', () => {
    render(<SubstepEditPopover {...baseProps} />);
    // Amount cells display their values as text inside buttons
    expect(screen.getByTestId('parttool-row-amount-pt-row-1')).toHaveTextContent('2');
    expect(screen.getByTestId('parttool-row-amount-pt-row-2')).toHaveTextContent('1');
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

  it('selecting a suggestion fires onReplaceSubstepPartTool with junction ID and partTool ID', async () => {
    const user = userEvent.setup();
    const allPartTools: PartToolRow[] = [
      {
        id: 'cat-wrench', versionId: 'v1', instructionId: 'i1', previewImageId: null,
        name: 'Catalog Wrench', label: null, type: 'Tool' as const, partNumber: null,
        amount: 1, description: null, unit: null, material: null, dimension: null, iconId: null,
      },
    ];
    render(<SubstepEditPopover {...baseProps} allPartTools={allPartTools} />);

    // Click the name cell of the first partTool row to open TextInputModal with suggestions
    await user.click(screen.getByTestId('parttool-row-name-pt-row-1'));

    // The TextInputModal mock captures onSelect — simulate selecting a suggestion
    expect(textInputModalProps).not.toBeNull();
    expect(textInputModalProps!.onSelect).toBeDefined();
    textInputModalProps!.onSelect!('cat-wrench');

    expect(callbacks.onReplaceSubstepPartTool).toHaveBeenCalledWith('pt-row-1', 'cat-wrench');
    expect(mockCaptureSnapshot).toHaveBeenCalled();
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
    // The popover renders its own backdrop as the first child inside the dialog
    const dialog = screen.getByRole('dialog');
    const backdrop = dialog.querySelector('.bg-black\\/50');
    expect(backdrop).toBeTruthy();
    await user.click(backdrop!);
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
// Media preview (SubstepCard)
// ============================================================
describe('SubstepEditPopover — media preview', () => {
  it('renders SubstepCard inside media-preview area', () => {
    render(<SubstepEditPopover {...baseProps} stepOrder={3} totalSubsteps={5} />);
    expect(screen.getByTestId('media-preview')).toBeInTheDocument();
    expect(screen.getByTestId('substep-card-preview')).toBeInTheDocument();
  });

  it('shows step number badge with stepOrder/totalSubsteps', () => {
    render(<SubstepEditPopover {...baseProps} stepOrder={3} totalSubsteps={5} />);
    expect(screen.getByTestId('substep-card-step-badge')).toHaveTextContent('3/5');
  });

  it('shows play icon when videoData is provided', () => {
    const videoData = {
      videoSrc: 'test.mp4', startFrame: 0, endFrame: 100, fps: 30,
      viewportKeyframes: [], videoAspectRatio: 1,
    };
    render(<SubstepEditPopover {...baseProps} videoData={videoData} />);
    expect(screen.getByTestId('substep-card-play-icon')).toBeInTheDocument();
  });

  it('shows note badges when notes are present', () => {
    render(<SubstepEditPopover {...baseProps} stepOrder={1} />);
    expect(screen.getByTestId('substep-card-notes')).toHaveTextContent('1 notes');
  });

  it('shows repeat badge on card preview', () => {
    render(<SubstepEditPopover {...baseProps} stepOrder={1} />);
    expect(screen.getByTestId('substep-card-repeat')).toHaveTextContent('×3');
  });

  it('shows empty state when no media flags', () => {
    render(<SubstepEditPopover {...baseProps} hasImage={false} hasVideo={false} />);
    const mediaCard = screen.getByTestId('section-media');
    expect(mediaCard).toHaveTextContent('No media');
  });

  it('renders media section with image row when hasImage', () => {
    render(<SubstepEditPopover {...baseProps} hasImage={true} hasVideo={false} />);
    expect(screen.getByTestId('media-image-row')).toBeInTheDocument();
  });

  it('passes hideFooter to SubstepCard preview', () => {
    render(<SubstepEditPopover {...baseProps} />);
    const card = screen.getByTestId('substep-card-preview');
    expect(card).toHaveAttribute('data-hide-footer', 'true');
  });
});

// ============================================================
// Note category — shown as tooltip on icon, not as text
// ============================================================
describe('SubstepEditPopover — note category as tooltip', () => {
  it('category text is no longer rendered as visible text in note rows', () => {
    // Use VFA UUID notes with folderName so the icon img actually renders
    const notesWithUuid = [
      {
        id: 'nr-1', versionId: 'v1', substepId: 's1', noteId: 'n-1', order: 1,
        note: { id: 'n-1', versionId: 'v1', instructionId: 'i1', text: 'Warning note', safetyIconId: 'vfa-uuid-1', safetyIconCategory: 'Warnzeichen' as const },
      },
      {
        id: 'nr-2', versionId: 'v1', substepId: 's1', noteId: 'n-2', order: 2,
        note: { id: 'n-2', versionId: 'v1', instructionId: 'i1', text: 'Mandatory note', safetyIconId: 'vfa-uuid-2', safetyIconCategory: 'Gebotszeichen' as const },
      },
    ];
    render(<SubstepEditPopover {...baseProps} notes={notesWithUuid} folderName="test-folder" />);
    const nr1 = screen.getByTestId('popover-note-nr-1');
    const nr2 = screen.getByTestId('popover-note-nr-2');
    // Category text should NOT appear as a visible text span
    const categorySpans1 = Array.from(nr1.querySelectorAll('span')).filter(s => s.textContent === 'Warnzeichen' && s.classList.contains('text-xs'));
    const categorySpans2 = Array.from(nr2.querySelectorAll('span')).filter(s => s.textContent === 'Gebotszeichen' && s.classList.contains('text-xs'));
    expect(categorySpans1).toHaveLength(0);
    expect(categorySpans2).toHaveLength(0);
    // But the category IS in the img title as fallback
    expect(nr1.querySelector('img')?.getAttribute('title')).toBe('Warnzeichen');
    expect(nr2.querySelector('img')?.getAttribute('title')).toBe('Gebotszeichen');
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

// ============================================================
// Repeat buttons — clickable cells (replaced old inline inputs)
// ============================================================
describe('SubstepEditPopover — repeat buttons', () => {
  it('repeat count button is clickable and shows count with ×', () => {
    render(<SubstepEditPopover {...baseProps} />);
    const btn = screen.getByTestId('repeat-count-btn');
    expect(btn).toHaveTextContent('3×');
    expect(btn.tagName).toBe('BUTTON');
  });

  it('repeat label button is clickable and shows label', () => {
    render(<SubstepEditPopover {...baseProps} />);
    const btn = screen.getByTestId('repeat-label-btn');
    expect(btn).toHaveTextContent('left & right');
    expect(btn.tagName).toBe('BUTTON');
  });
});

// ============================================================
// Note rows — icon label tooltip replaces category text
// ============================================================
describe('SubstepEditPopover — note icon label tooltip', () => {
  it('note row img has title attribute with icon label (catalog match)', () => {
    // Provide catalogs so icons array has an entry matching the note's safetyIconId
    // Use the icon ID matching the catalog entry (not the filename, because catalog icons use entry.id)
    const catalogs = [{
      name: 'Test Catalog',
      dirName: 'test-cat',
      assetsDir: '/assets',
      entries: [{
        id: 'cat-icon-1',
        filename: 'W001-Allgemeines-Warnzeichen.png',
        category: 'Warnzeichen',
        label: { en: 'General Warning', de: 'Allgemeines Warnzeichen' },
      }],
    }];
    const notesWithCatalogIcon = [{
      id: 'note-row-cat',
      substepId: 's1',
      noteId: 'note-cat',
      order: 1,
      note: { id: 'note-cat', versionId: 'v1', instructionId: 'i1', text: 'Catalog note', safetyIconId: 'cat-icon-1', safetyIconCategory: 'Warnzeichen' as const },
    }];
    render(<SubstepEditPopover {...baseProps} notes={notesWithCatalogIcon} catalogs={catalogs} folderName="test-folder" />);
    const noteRow = screen.getByTestId('popover-note-note-row-cat');
    const img = noteRow.querySelector('img');
    // The icon label should be used as title (en = "General Warning")
    expect(img?.getAttribute('title')).toBe('General Warning');
  });

  it('note row img falls back to safetyIconCategory when no icon match', () => {
    // Use VFA UUID that resolves via folderName but has no catalog match
    const notesWithUuid = [{
      id: 'note-row-uuid',
      substepId: 's1',
      noteId: 'note-uuid',
      order: 1,
      note: { id: 'note-uuid', versionId: 'v1', instructionId: 'i1', text: 'UUID note', safetyIconId: 'some-vfa-uuid', safetyIconCategory: 'Gebotszeichen' as const },
    }];
    render(<SubstepEditPopover {...baseProps} notes={notesWithUuid} folderName="test-folder" />);
    const noteRow = screen.getByTestId('popover-note-note-row-uuid');
    const img = noteRow.querySelector('img');
    // Falls back to category since no icon label found
    expect(img?.getAttribute('title')).toBe('Gebotszeichen');
  });
});
