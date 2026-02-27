import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SubstepEditPopover } from './SubstepEditPopover';
import type { SubstepEditPopoverProps } from './SubstepEditPopover';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

afterEach(() => {
  cleanup();
});

const callbacks = {
  onEditImage: vi.fn(),
  onDeleteImage: vi.fn(),
  onEditVideo: vi.fn(),
  onDeleteVideo: vi.fn(),
  onEditDescription: vi.fn(),
  onDeleteDescription: vi.fn(),
  onAddDescription: vi.fn(),
  onEditNote: vi.fn(),
  onDeleteNote: vi.fn(),
  onAddNote: vi.fn(),
  onEditRepeat: vi.fn(),
  onDeleteRepeat: vi.fn(),
  onEditReference: vi.fn(),
  onDeleteReference: vi.fn(),
  onAddReference: vi.fn(),
  onEditPartTools: vi.fn(),
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
      note: { id: 'note-1', text: 'Safety note', level: 'Warning', safetyIconId: null },
    },
  ],
  partTools: [
    {
      id: 'pt-row-1',
      substepId: 's1',
      partToolId: 'pt-1',
      amount: 2,
      order: 1,
      partTool: { id: 'pt-1', name: 'Wrench', kind: 'tool', unit: null, imageId: null, partToolNumber: null },
    },
  ],
  repeatCount: 3,
  repeatLabel: 'left & right',
  references: [{ kind: 'see', label: 'See Step 3' }],
  hasImage: true,
  hasVideo: true,
};

beforeEach(() => {
  Object.values(callbacks).forEach((fn) => fn.mockClear());
  (baseProps.onClose as ReturnType<typeof vi.fn>).mockClear();
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
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });
});

// ============================================================
// Media section
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

  it('fires onEditImage + onClose when image edit is clicked', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    const row = screen.getByTestId('media-image-row');
    const editBtn = row.querySelector('[aria-label="Edit image"]');
    expect(editBtn).toBeTruthy();
    await user.click(editBtn!);
    expect(callbacks.onEditImage).toHaveBeenCalledOnce();
    expect(baseProps.onClose).toHaveBeenCalledOnce();
  });

  it('fires onDeleteImage + onClose when image delete is clicked', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    const row = screen.getByTestId('media-image-row');
    const deleteBtn = row.querySelector('[aria-label="Delete image"]');
    expect(deleteBtn).toBeTruthy();
    await user.click(deleteBtn!);
    expect(callbacks.onDeleteImage).toHaveBeenCalledOnce();
    expect(baseProps.onClose).toHaveBeenCalledOnce();
  });

  it('fires onEditVideo + onClose when video edit is clicked', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    const row = screen.getByTestId('media-video-row');
    const editBtn = row.querySelector('[aria-label="Edit video"]');
    expect(editBtn).toBeTruthy();
    await user.click(editBtn!);
    expect(callbacks.onEditVideo).toHaveBeenCalledOnce();
    expect(baseProps.onClose).toHaveBeenCalledOnce();
  });

  it('fires onDeleteVideo + onClose when video delete is clicked', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    const row = screen.getByTestId('media-video-row');
    const deleteBtn = row.querySelector('[aria-label="Delete video"]');
    expect(deleteBtn).toBeTruthy();
    await user.click(deleteBtn!);
    expect(callbacks.onDeleteVideo).toHaveBeenCalledOnce();
    expect(baseProps.onClose).toHaveBeenCalledOnce();
  });
});

// ============================================================
// Descriptions
// ============================================================
describe('SubstepEditPopover — descriptions', () => {
  it('shows each description row', () => {
    render(<SubstepEditPopover {...baseProps} />);
    expect(screen.getByText('First description')).toBeInTheDocument();
    expect(screen.getByText('Second description')).toBeInTheDocument();
  });

  it('fires onEditDescription(id) + onClose when edit clicked', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    const row = screen.getByTestId('popover-desc-desc-1');
    const editBtn = row.querySelector('[aria-label="Edit description"]');
    await user.click(editBtn!);
    expect(callbacks.onEditDescription).toHaveBeenCalledWith('desc-1');
    expect(baseProps.onClose).toHaveBeenCalledOnce();
  });

  it('fires onDeleteDescription(id) + onClose when delete clicked', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    const row = screen.getByTestId('popover-desc-desc-2');
    const deleteBtn = row.querySelector('[aria-label="Delete description"]');
    await user.click(deleteBtn!);
    expect(callbacks.onDeleteDescription).toHaveBeenCalledWith('desc-2');
    expect(baseProps.onClose).toHaveBeenCalledOnce();
  });

  it('fires onAddDescription + onClose when "Add description" clicked', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    await user.click(screen.getByTestId('popover-add-description'));
    expect(callbacks.onAddDescription).toHaveBeenCalledOnce();
    expect(baseProps.onClose).toHaveBeenCalledOnce();
  });
});

// ============================================================
// Notes
// ============================================================
describe('SubstepEditPopover — notes', () => {
  it('shows each note row', () => {
    render(<SubstepEditPopover {...baseProps} />);
    expect(screen.getByText('Safety note')).toBeInTheDocument();
  });

  it('fires onEditNote(id) + onClose when edit clicked', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    const row = screen.getByTestId('popover-note-note-row-1');
    const editBtn = row.querySelector('[aria-label="Edit note"]');
    await user.click(editBtn!);
    expect(callbacks.onEditNote).toHaveBeenCalledWith('note-row-1');
    expect(baseProps.onClose).toHaveBeenCalledOnce();
  });

  it('fires onDeleteNote(id) + onClose when delete clicked', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    const row = screen.getByTestId('popover-note-note-row-1');
    const deleteBtn = row.querySelector('[aria-label="Delete note"]');
    await user.click(deleteBtn!);
    expect(callbacks.onDeleteNote).toHaveBeenCalledWith('note-row-1');
    expect(baseProps.onClose).toHaveBeenCalledOnce();
  });

  it('fires onAddNote + onClose when "Add note" clicked', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    await user.click(screen.getByTestId('popover-add-note'));
    expect(callbacks.onAddNote).toHaveBeenCalledOnce();
    expect(baseProps.onClose).toHaveBeenCalledOnce();
  });
});

// ============================================================
// Repeat
// ============================================================
describe('SubstepEditPopover — repeat', () => {
  it('shows repeat row when repeatCount > 1', () => {
    render(<SubstepEditPopover {...baseProps} />);
    expect(screen.getByTestId('popover-repeat-row')).toBeInTheDocument();
    expect(screen.getByText(/×3/)).toBeInTheDocument();
  });

  it('fires onEditRepeat + onClose when repeat edit clicked', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    const row = screen.getByTestId('popover-repeat-row');
    const editBtn = row.querySelector('[aria-label="Edit repeat"]');
    await user.click(editBtn!);
    expect(callbacks.onEditRepeat).toHaveBeenCalledOnce();
    expect(baseProps.onClose).toHaveBeenCalledOnce();
  });

  it('fires onDeleteRepeat + onClose when repeat delete clicked', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    const row = screen.getByTestId('popover-repeat-row');
    const deleteBtn = row.querySelector('[aria-label="Delete repeat"]');
    await user.click(deleteBtn!);
    expect(callbacks.onDeleteRepeat).toHaveBeenCalledOnce();
    expect(baseProps.onClose).toHaveBeenCalledOnce();
  });

  it('shows "Add repeat" when repeatCount <= 1', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} repeatCount={1} />);

    const addBtn = screen.getByTestId('popover-add-repeat');
    await user.click(addBtn);
    expect(callbacks.onEditRepeat).toHaveBeenCalledOnce();
    expect(baseProps.onClose).toHaveBeenCalledOnce();
  });
});

// ============================================================
// References
// ============================================================
describe('SubstepEditPopover — references', () => {
  it('shows reference rows', () => {
    render(<SubstepEditPopover {...baseProps} />);
    expect(screen.getByText('See Step 3')).toBeInTheDocument();
  });

  it('fires onEditReference(0) + onClose when edit clicked', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    const row = screen.getByTestId('popover-ref-0');
    const editBtn = row.querySelector('[aria-label="Edit reference"]');
    await user.click(editBtn!);
    expect(callbacks.onEditReference).toHaveBeenCalledWith(0);
    expect(baseProps.onClose).toHaveBeenCalledOnce();
  });

  it('fires onDeleteReference(0) + onClose when delete clicked', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    const row = screen.getByTestId('popover-ref-0');
    const deleteBtn = row.querySelector('[aria-label="Delete reference"]');
    await user.click(deleteBtn!);
    expect(callbacks.onDeleteReference).toHaveBeenCalledWith(0);
    expect(baseProps.onClose).toHaveBeenCalledOnce();
  });

  it('shows "Add reference" button and fires callback', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} references={[]} />);

    const addBtn = screen.getByTestId('popover-add-reference');
    await user.click(addBtn);
    expect(callbacks.onAddReference).toHaveBeenCalledOnce();
    expect(baseProps.onClose).toHaveBeenCalledOnce();
  });
});

// ============================================================
// Parts/Tools
// ============================================================
describe('SubstepEditPopover — parts/tools', () => {
  it('shows parts/tools row when partTools exist', () => {
    render(<SubstepEditPopover {...baseProps} />);
    expect(screen.getByTestId('popover-parts-row')).toBeInTheDocument();
  });

  it('fires onEditPartTools + onClose when parts edit clicked', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    const row = screen.getByTestId('popover-parts-row');
    const editBtn = row.querySelector('[aria-label="Edit parts/tools"]');
    await user.click(editBtn!);
    expect(callbacks.onEditPartTools).toHaveBeenCalledOnce();
    expect(baseProps.onClose).toHaveBeenCalledOnce();
  });

  it('shows "Add parts/tools" when no parts', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} partTools={[]} />);

    const addBtn = screen.getByTestId('popover-add-parts');
    await user.click(addBtn);
    expect(callbacks.onEditPartTools).toHaveBeenCalledOnce();
    expect(baseProps.onClose).toHaveBeenCalledOnce();
  });
});

// ============================================================
// Delete substep
// ============================================================
describe('SubstepEditPopover — delete substep', () => {
  it('shows delete substep button', () => {
    render(<SubstepEditPopover {...baseProps} />);
    expect(screen.getByTestId('popover-delete-substep')).toBeInTheDocument();
  });

  it('fires onDeleteSubstep + onClose when clicked', async () => {
    const user = userEvent.setup();
    render(<SubstepEditPopover {...baseProps} />);

    await user.click(screen.getByTestId('popover-delete-substep'));
    expect(callbacks.onDeleteSubstep).toHaveBeenCalledOnce();
    expect(baseProps.onClose).toHaveBeenCalledOnce();
  });
});
