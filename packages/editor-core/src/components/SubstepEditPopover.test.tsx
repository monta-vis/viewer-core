import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
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

// Mock viewer-core exports used by inline note editing
vi.mock('@monta-vis/viewer-core', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    categoryToNoteLevel: (cat: string) => {
      const map: Record<string, string> = {
        Verbote: 'Critical',
        Gebote: 'Warning',
        Warnzeichen: 'Warning',
        Sonstige: 'Info',
      };
      return map[cat] ?? 'Info';
    },
    SAFETY_ICON_MANIFEST: [],
    buildMediaUrl: (folder: string, path: string) => `mvis-media://${folder}/${path}`,
  };
});

afterEach(() => {
  cleanup();
});

const callbacks = {
  onEditImage: vi.fn(),
  onDeleteImage: vi.fn(),
  onEditVideo: vi.fn(),
  onDeleteVideo: vi.fn(),
  onSaveDescription: vi.fn(),
  onDeleteDescription: vi.fn(),
  onAddDescription: vi.fn(),
  onSaveNote: vi.fn(),
  onDeleteNote: vi.fn(),
  onAddNote: vi.fn(),
  onEditRepeat: vi.fn(),
  onDeleteRepeat: vi.fn(),
  onEditTutorial: vi.fn(),
  onDeleteTutorial: vi.fn(),
  onAddTutorial: vi.fn(),
  onEditPartTools: vi.fn(),
  onUpdatePartTool: vi.fn(),
  onUpdateSubstepPartToolAmount: vi.fn(),
  onAddSubstepPartTool: vi.fn(),
  onDeleteSubstepPartTool: vi.fn(),
  onDeleteSubstep: vi.fn(),
};

const baseProps: SubstepEditPopoverProps = {
  open: true,
  onClose: vi.fn(),
  callbacks,
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
      note: { id: 'note-1', versionId: 'v1', instructionId: 'i1', text: 'Safety note', level: 'Warning', safetyIconId: null, safetyIconCategory: null },
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
        name: 'Wrench', type: 'Tool' as const, partNumber: 'PT-001',
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
        name: 'Bolt M6', type: 'Part' as const, partNumber: null,
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

  it('renders danger-zone footer when open', () => {
    render(<SubstepEditPopover {...baseProps} />);
    expect(screen.getByTestId('danger-zone')).toBeInTheDocument();
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

  it('fires onEditImage WITHOUT closing when image edit is clicked', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    const row = screen.getByTestId('media-image-row');
    const editBtn = row.querySelector('[aria-label="Edit image"]');
    expect(editBtn).toBeTruthy();
    await user.click(editBtn!);
    expect(callbacks.onEditImage).toHaveBeenCalledOnce();
    expect(mockCaptureSnapshot).toHaveBeenCalledOnce();
    expect(baseProps.onClose).not.toHaveBeenCalled();
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

  it('clicking edit pencil switches description row to textarea with current text', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    const row = screen.getByTestId('popover-desc-desc-1');
    const editBtn = row.querySelector('[aria-label="Edit description"]');
    await user.click(editBtn!);

    const textarea = screen.getByTestId('inline-edit-desc-desc-1');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue('First description');
  });

  it('Escape cancels inline edit, returns to display mode', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    // Enter edit mode
    const row = screen.getByTestId('popover-desc-desc-1');
    const editBtn = row.querySelector('[aria-label="Edit description"]');
    await user.click(editBtn!);
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

    // Enter edit mode
    const row = screen.getByTestId('popover-desc-desc-1');
    const editBtn = row.querySelector('[aria-label="Edit description"]');
    await user.click(editBtn!);

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

  it('clicking save button calls onSaveDescription(id, text)', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    const row = screen.getByTestId('popover-desc-desc-1');
    const editBtn = row.querySelector('[aria-label="Edit description"]');
    await user.click(editBtn!);

    const textarea = screen.getByTestId('inline-edit-desc-desc-1');
    await user.clear(textarea);
    await user.type(textarea, 'New text');

    await user.click(screen.getByTestId('save-desc-desc-1'));

    expect(callbacks.onSaveDescription).toHaveBeenCalledWith('desc-1', 'New text');
    expect(mockCaptureSnapshot).toHaveBeenCalled();
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

  it('clicking "+" shows inline add textarea, save calls onAddDescription(text)', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    await user.click(screen.getByTestId('popover-add-description'));
    expect(screen.getByTestId('inline-add-desc')).toBeInTheDocument();

    const textarea = screen.getByTestId('inline-add-desc-input');
    await user.type(textarea, 'New description');

    await user.click(screen.getByTestId('save-add-desc'));

    expect(callbacks.onAddDescription).toHaveBeenCalledWith('New description');
    expect(mockCaptureSnapshot).toHaveBeenCalled();
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

  it('clicking edit on note expands row with input + SafetyIconPicker', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    const row = screen.getByTestId('popover-note-note-row-1');
    const editBtn = row.querySelector('[aria-label="Edit note"]');
    await user.click(editBtn!);

    expect(screen.getByTestId('inline-edit-note-note-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('inline-icon-picker')).toBeInTheDocument();
  });

  it('save on note calls onSaveNote(id, text, level, iconId, iconCat)', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    const row = screen.getByTestId('popover-note-note-row-1');
    const editBtn = row.querySelector('[aria-label="Edit note"]');
    await user.click(editBtn!);

    const input = screen.getByTestId('inline-edit-note-note-row-1');
    await user.clear(input);
    await user.type(input, 'Updated note');

    await user.click(screen.getByTestId('save-note-note-row-1'));

    expect(callbacks.onSaveNote).toHaveBeenCalledWith(
      'note-row-1',
      'Updated note',
      'Info', // categoryToNoteLevel('Sonstige') returns 'Info' (no category selected)
      null,
      null,
    );
    expect(mockCaptureSnapshot).toHaveBeenCalled();
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

  it('clicking "+" shows inline add note, save calls onAddNote', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    await user.click(screen.getByTestId('popover-add-note'));
    expect(screen.getByTestId('inline-add-note')).toBeInTheDocument();

    const input = screen.getByTestId('inline-add-note-input');
    await user.type(input, 'New note text');

    await user.click(screen.getByTestId('save-add-note'));

    expect(callbacks.onAddNote).toHaveBeenCalledWith(
      'New note text',
      'Info', // default category 'Sonstige' -> 'Info'
      null,
      null,
    );
    expect(mockCaptureSnapshot).toHaveBeenCalled();
  });
});

// ============================================================
// Repeat — actions do NOT auto-close
// ============================================================
describe('SubstepEditPopover — repeat', () => {
  it('shows repeat row when repeatCount > 1', () => {
    render(<SubstepEditPopover {...baseProps} />);
    expect(screen.getByTestId('popover-repeat-row')).toBeInTheDocument();
    expect(screen.getByText(/×3/)).toBeInTheDocument();
  });

  it('fires onEditRepeat WITHOUT closing when repeat edit clicked', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    const row = screen.getByTestId('popover-repeat-row');
    const editBtn = row.querySelector('[aria-label="Edit repeat"]');
    await user.click(editBtn!);
    expect(callbacks.onEditRepeat).toHaveBeenCalledOnce();
    expect(mockCaptureSnapshot).toHaveBeenCalledOnce();
    expect(baseProps.onClose).not.toHaveBeenCalled();
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

  it('shows "Add repeat" when repeatCount <= 1', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} repeatCount={1} />);

    const addBtn = screen.getByTestId('popover-add-repeat');
    await user.click(addBtn);
    expect(callbacks.onEditRepeat).toHaveBeenCalledOnce();
    expect(mockCaptureSnapshot).toHaveBeenCalledOnce();
    expect(baseProps.onClose).not.toHaveBeenCalled();
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

  it('fires onEditTutorial(0) WITHOUT closing when edit clicked', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    const row = screen.getByTestId('popover-tutorial-0');
    const editBtn = row.querySelector('[aria-label="Edit tutorial"]');
    await user.click(editBtn!);
    expect(callbacks.onEditTutorial).toHaveBeenCalledWith(0);
    expect(mockCaptureSnapshot).toHaveBeenCalledOnce();
    expect(baseProps.onClose).not.toHaveBeenCalled();
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

  it('shows "Add tutorial" button and fires callback WITHOUT closing', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} tutorials={[]} />);

    const addBtn = screen.getByTestId('popover-add-tutorial');
    await user.click(addBtn);
    expect(callbacks.onAddTutorial).toHaveBeenCalledOnce();
    expect(mockCaptureSnapshot).toHaveBeenCalledOnce();
    expect(baseProps.onClose).not.toHaveBeenCalled();
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
// Modal close behavior
// ============================================================
describe('SubstepEditPopover — modal close', () => {
  it('fires onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);
    const dialog = screen.getByRole('dialog');
    // Click the backdrop (first child of the dialog overlay)
    await user.click(dialog.firstElementChild!);
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
// Note level badges
// ============================================================
describe('SubstepEditPopover — note level badges', () => {
  it('shows note level text in each note row', () => {
    render(<SubstepEditPopover {...baseProps} />);
    const noteRow = screen.getByTestId('popover-note-note-row-1');
    expect(noteRow).toHaveTextContent('Warning');
  });

  it('shows level text for each note level', () => {
    const multiNotes = [
      {
        id: 'nr-1', versionId: 'v1', substepId: 's1', noteId: 'n-1', order: 1,
        note: { id: 'n-1', versionId: 'v1', instructionId: 'i1', text: 'Critical note', level: 'Critical' as const, safetyIconId: null, safetyIconCategory: null },
      },
      {
        id: 'nr-2', versionId: 'v1', substepId: 's1', noteId: 'n-2', order: 2,
        note: { id: 'n-2', versionId: 'v1', instructionId: 'i1', text: 'Info note', level: 'Info' as const, safetyIconId: null, safetyIconCategory: null },
      },
    ];
    render(<SubstepEditPopover {...baseProps} notes={multiNotes} />);
    expect(screen.getByTestId('popover-note-nr-1')).toHaveTextContent('Critical');
    expect(screen.getByTestId('popover-note-nr-2')).toHaveTextContent('Info');
  });
});

// ============================================================
// Two-column layout
// ============================================================
describe('SubstepEditPopover — layout', () => {
  it('renders left column (media) and right column (sections)', () => {
    render(<SubstepEditPopover {...baseProps} />);
    expect(screen.getByTestId('popover-left-column')).toBeInTheDocument();
    expect(screen.getByTestId('popover-right-column')).toBeInTheDocument();
  });
});

// ============================================================
// Delete substep — no auto-close
// ============================================================
describe('SubstepEditPopover — delete substep', () => {
  it('shows delete substep button', () => {
    render(<SubstepEditPopover {...baseProps} />);
    expect(screen.getByTestId('popover-delete-substep')).toBeInTheDocument();
  });

  it('fires onDeleteSubstep WITHOUT closing when clicked', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    await user.click(screen.getByTestId('popover-delete-substep'));
    expect(callbacks.onDeleteSubstep).toHaveBeenCalledOnce();
    expect(mockCaptureSnapshot).toHaveBeenCalledOnce();
    expect(baseProps.onClose).not.toHaveBeenCalled();
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
