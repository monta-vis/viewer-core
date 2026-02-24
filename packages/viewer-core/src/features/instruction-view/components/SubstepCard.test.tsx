import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SubstepCard } from './SubstepCard';
import type { SubstepDescriptionRow, EnrichedSubstepNote, EnrichedSubstepPartTool } from '@/features/instruction';

// Mock ResizeObserver (used by SubstepCard for image area sizing)
beforeEach(() => {
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
});

afterEach(() => {
  cleanup();
});

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallbackOrOpts?: string | Record<string, unknown>) => {
      if (typeof fallbackOrOpts === 'string') return fallbackOrOpts;
      if (typeof fallbackOrOpts === 'object' && fallbackOrOpts?.defaultValue) return String(fallbackOrOpts.defaultValue);
      return key;
    },
  }),
}));

// Full props — all elements present
const baseProps = {
  title: 'Test Substep',
  stepOrder: 1,
  descriptions: [
    { id: 'desc-1', substepId: 's1', text: 'First description', order: 1 },
    { id: 'desc-2', substepId: 's1', text: 'Second description', order: 2 },
  ] as SubstepDescriptionRow[],
  notes: [
    {
      id: 'note-row-1',
      substepId: 's1',
      noteId: 'note-1',
      order: 1,
      note: { id: 'note-1', text: 'Safety note', level: 'Warning', safetyIconId: null },
    },
  ] as EnrichedSubstepNote[],
  partTools: [
    {
      id: 'pt-row-1',
      substepId: 's1',
      partToolId: 'pt-1',
      amount: 2,
      order: 1,
      partTool: { id: 'pt-1', name: 'Wrench', kind: 'tool', unit: null, imageId: null, partToolNumber: null },
    },
  ] as EnrichedSubstepPartTool[],
  imageUrl: 'test-image.jpg',
  repeatCount: 3,
  repeatLabel: 'left & right',
  references: [{ kind: 'see' as const, label: 'See Step 3', targetId: 'step-3', targetType: 'step' as const }],
};

// Minimal props — missing elements (no notes, no parts, repeatCount=1, no references)
const minimalProps = {
  title: 'Minimal Substep',
  stepOrder: 2,
  descriptions: [] as SubstepDescriptionRow[],
  notes: [] as EnrichedSubstepNote[],
  partTools: [] as EnrichedSubstepPartTool[],
  imageUrl: null,
  repeatCount: 1,
  references: [] as Array<{ kind: 'see' | 'tutorial'; label: string; targetId?: string; targetType?: 'step' | 'substep' | 'tutorial' }>,
};

const editCallbacks = {
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

beforeEach(() => {
  Object.values(editCallbacks).forEach((fn) => fn.mockClear());
});

// ============================================================
// editMode=false — no edit controls at all
// ============================================================
describe('SubstepCard — editMode=false (default)', () => {
  it('does NOT render any edit controls when editMode is undefined', () => {
    render(<SubstepCard {...baseProps} />);

    // No image edit buttons (both have aria-label "Edit")
    expect(screen.queryAllByLabelText('Edit')).toHaveLength(0);
    // No delete buttons
    expect(screen.queryAllByLabelText('Delete')).toHaveLength(0);
    // No add placeholders
    expect(screen.queryByText('Add description')).not.toBeInTheDocument();
    expect(screen.queryByText('Add note')).not.toBeInTheDocument();
    expect(screen.queryByText('Add reference')).not.toBeInTheDocument();
    // No delete substep
    expect(screen.queryByLabelText('Delete substep')).not.toBeInTheDocument();
  });

  it('does NOT render any edit controls when editMode=false', () => {
    render(<SubstepCard {...baseProps} editMode={false} />);

    expect(screen.queryAllByLabelText('Edit')).toHaveLength(0);
    expect(screen.queryByLabelText('Delete substep')).not.toBeInTheDocument();
  });
});

// ============================================================
// editMode=true — tap-to-edit behavior
// ============================================================
describe('SubstepCard — editMode=true', () => {
  // --- Image area: video-edit + image-edit buttons ---
  describe('image area', () => {
    it('shows video-edit and image-edit buttons', () => {
      render(<SubstepCard {...baseProps} editMode editCallbacks={editCallbacks} />);

      // Both buttons have aria-label "Edit" (one for video, one for image)
      const editBtns = screen.getAllByLabelText('Edit');
      expect(editBtns).toHaveLength(2);
    });

    it('fires onEditVideo when video-edit button is clicked', async () => {
      const user = userEvent.setup();
      render(<SubstepCard {...baseProps} editMode editCallbacks={editCallbacks} />);

      // First "Edit" button is the video edit (appears first in DOM)
      const editBtns = screen.getAllByLabelText('Edit');
      await user.click(editBtns[0]);
      expect(editCallbacks.onEditVideo).toHaveBeenCalledOnce();
    });

    it('fires onEditImage when image-edit button is clicked', async () => {
      const user = userEvent.setup();
      render(<SubstepCard {...baseProps} editMode editCallbacks={editCallbacks} />);

      // Second "Edit" button is the image edit
      const editBtns = screen.getAllByLabelText('Edit');
      await user.click(editBtns[1]);
      expect(editCallbacks.onEditImage).toHaveBeenCalledOnce();
    });
  });

  // --- Descriptions: tappable + delete ---
  describe('descriptions', () => {
    it('tapping a description fires onEditDescription with correct ID', async () => {
      const user = userEvent.setup();
      render(<SubstepCard {...baseProps} editMode editCallbacks={editCallbacks} />);

      // Descriptions should be tappable — click the text itself
      const desc1 = screen.getByText('First description');
      await user.click(desc1.closest('[data-testid="editable-description"]')!);
      expect(editCallbacks.onEditDescription).toHaveBeenCalledWith('desc-1');
    });

    it('delete button on description fires onDeleteDescription', async () => {
      const user = userEvent.setup();
      render(<SubstepCard {...baseProps} editMode editCallbacks={editCallbacks} />);

      // All delete buttons now have aria-label "Delete"
      const deleteBtns = screen.getAllByLabelText('Delete');
      // Find the description delete buttons (inside editable-description elements)
      const descDeleteBtns = deleteBtns.filter(
        (btn) => btn.closest('[data-testid="editable-description"]') !== null
      );
      expect(descDeleteBtns).toHaveLength(2);
      await user.click(descDeleteBtns[1]);
      expect(editCallbacks.onDeleteDescription).toHaveBeenCalledWith('desc-2');
    });

    it('"+ Add description" fires onAddDescription', async () => {
      const user = userEvent.setup();
      render(<SubstepCard {...baseProps} editMode editCallbacks={editCallbacks} />);

      await user.click(screen.getByText('Add description'));
      expect(editCallbacks.onAddDescription).toHaveBeenCalledOnce();
    });
  });

  // --- Notes: tappable + delete ---
  describe('notes', () => {
    it('tapping a note fires onEditNote with correct ID', async () => {
      const user = userEvent.setup();
      render(<SubstepCard {...baseProps} editMode editCallbacks={editCallbacks} />);

      const noteEl = screen.getByTestId('editable-note-note-row-1');
      await user.click(noteEl);
      expect(editCallbacks.onEditNote).toHaveBeenCalledWith('note-row-1');
    });

    it('delete button on note fires onDeleteNote', async () => {
      const user = userEvent.setup();
      render(<SubstepCard {...baseProps} editMode editCallbacks={editCallbacks} />);

      // The note delete button is inside editable-note-* testid
      const noteEl = screen.getByTestId('editable-note-note-row-1');
      const deleteBtn = noteEl.querySelector('[aria-label="Delete"]');
      expect(deleteBtn).toBeTruthy();
      await user.click(deleteBtn!);
      expect(editCallbacks.onDeleteNote).toHaveBeenCalledWith('note-row-1');
    });

  });

  // --- Repeat badge: tappable ---
  describe('repeat badge', () => {
    it('tapping repeat badge fires onEditRepeat', async () => {
      const user = userEvent.setup();
      render(<SubstepCard {...baseProps} editMode editCallbacks={editCallbacks} />);

      const badge = screen.getByTestId('repeat-badge');
      await user.click(badge);
      expect(editCallbacks.onEditRepeat).toHaveBeenCalledOnce();
    });

    it('delete button on repeat badge fires onDeleteRepeat', async () => {
      const user = userEvent.setup();
      render(<SubstepCard {...baseProps} editMode editCallbacks={editCallbacks} />);

      // Find delete button inside the repeat badge
      const badge = screen.getByTestId('repeat-badge');
      const deleteBtn = badge.querySelector('[aria-label="Delete"]');
      expect(deleteBtn).toBeTruthy();
      await user.click(deleteBtn!);
      expect(editCallbacks.onDeleteRepeat).toHaveBeenCalledOnce();
    });
  });

  // --- Reference badge: tappable + delete ---
  describe('reference badge', () => {
    it('tapping reference badge fires onEditReference with index 0', async () => {
      const user = userEvent.setup();
      render(<SubstepCard {...baseProps} editMode editCallbacks={editCallbacks} />);

      const refBadge = screen.getByTestId('editable-reference-0');
      await user.click(refBadge);
      expect(editCallbacks.onEditReference).toHaveBeenCalledWith(0);
    });

    it('delete button on reference fires onDeleteReference', async () => {
      const user = userEvent.setup();
      render(<SubstepCard {...baseProps} editMode editCallbacks={editCallbacks} />);

      // Find delete button inside the reference badge
      const refBadge = screen.getByTestId('editable-reference-0');
      const deleteBtn = refBadge.querySelector('[aria-label="Delete"]');
      expect(deleteBtn).toBeTruthy();
      await user.click(deleteBtn!);
      expect(editCallbacks.onDeleteReference).toHaveBeenCalledWith(0);
    });

  });

  // --- Parts badge: tappable ---
  describe('parts badge', () => {
    it('tapping parts badge fires onEditPartTools', async () => {
      const user = userEvent.setup();
      render(<SubstepCard {...baseProps} editMode editCallbacks={editCallbacks} />);

      const partsBadge = screen.getByTestId('editable-parts-badge');
      await user.click(partsBadge);
      expect(editCallbacks.onEditPartTools).toHaveBeenCalledOnce();
    });
  });

  // --- Delete substep ---
  describe('delete substep', () => {
    it('fires onDeleteSubstep when delete button is clicked', async () => {
      const user = userEvent.setup();
      render(<SubstepCard {...baseProps} editMode editCallbacks={editCallbacks} />);

      await user.click(screen.getByLabelText('Delete substep'));
      expect(editCallbacks.onDeleteSubstep).toHaveBeenCalledOnce();
    });
  });
});

// ============================================================
// editMode=true — "add" placeholders for missing elements
// ============================================================
describe('SubstepCard — editMode=true, missing elements show add placeholders', () => {
  it('shows "+ Repeat" when repeatCount=1', () => {
    render(<SubstepCard {...minimalProps} editMode editCallbacks={editCallbacks} />);

    expect(screen.getByText('Repeat')).toBeInTheDocument();
  });

  it('fires onEditRepeat when "+ Repeat" is clicked', async () => {
    const user = userEvent.setup();
    render(<SubstepCard {...minimalProps} editMode editCallbacks={editCallbacks} />);

    await user.click(screen.getByText('Repeat'));
    expect(editCallbacks.onEditRepeat).toHaveBeenCalledOnce();
  });

  it('shows "+ Add reference" when no references', () => {
    render(<SubstepCard {...minimalProps} editMode editCallbacks={editCallbacks} />);

    // The add reference link in the top-right overlay area
    expect(screen.getByTestId('add-reference-placeholder')).toBeInTheDocument();
  });

  it('shows "+ Add parts/tools" when no parts', () => {
    render(<SubstepCard {...minimalProps} editMode editCallbacks={editCallbacks} />);

    expect(screen.getByTestId('add-parts-placeholder')).toBeInTheDocument();
  });

  it('fires onEditPartTools when "+ Add parts/tools" is clicked', async () => {
    const user = userEvent.setup();
    render(<SubstepCard {...minimalProps} editMode editCallbacks={editCallbacks} />);

    await user.click(screen.getByTestId('add-parts-placeholder'));
    expect(editCallbacks.onEditPartTools).toHaveBeenCalledOnce();
  });

  it('shows "+ Add note" placeholder in image overlay when no notes', () => {
    render(<SubstepCard {...minimalProps} editMode editCallbacks={editCallbacks} />);

    expect(screen.getByTestId('add-note-placeholder')).toBeInTheDocument();
  });

  it('fires onAddNote when note placeholder is clicked', async () => {
    const user = userEvent.setup();
    render(<SubstepCard {...minimalProps} editMode editCallbacks={editCallbacks} />);

    await user.click(screen.getByTestId('add-note-placeholder'));
    expect(editCallbacks.onAddNote).toHaveBeenCalledOnce();
  });
});
