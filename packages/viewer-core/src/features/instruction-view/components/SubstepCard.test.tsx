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
      note: { id: 'note-1', text: 'Safety note', safetyIconCategory: 'Warnzeichen', safetyIconId: 'W001-Allgemeines-Warnzeichen.png' },
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
  tutorials: [{ kind: 'see' as const, label: 'See Step 3', targetId: 'step-3', targetType: 'step' as const }],
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
  tutorials: [] as Array<{ kind: 'see' | 'tutorial'; label: string; targetId?: string; targetType?: 'step' | 'substep' | 'tutorial' }>,
};

const editCallbacks = {
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
  onEditTutorial: vi.fn(),
  onDeleteTutorial: vi.fn(),
  onAddTutorial: vi.fn(),
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
  it('does NOT render pencil button when editMode is undefined', () => {
    render(<SubstepCard {...baseProps} />);
    expect(screen.queryByLabelText('Edit substep')).not.toBeInTheDocument();
  });

  it('does NOT render pencil button when editMode=false', () => {
    render(<SubstepCard {...baseProps} editMode={false} />);
    expect(screen.queryByLabelText('Edit substep')).not.toBeInTheDocument();
  });

  it('renders descriptions as plain text', () => {
    render(<SubstepCard {...baseProps} />);
    expect(screen.getByText('First description')).toBeInTheDocument();
    expect(screen.getByText('Second description')).toBeInTheDocument();
  });

  it('renders repeat badge', () => {
    render(<SubstepCard {...baseProps} />);
    expect(screen.getByTestId('repeat-badge')).toBeInTheDocument();
  });
});

// ============================================================
// editMode=true — pencil button + renderEditPopover
// ============================================================
describe('SubstepCard — editMode=true', () => {
  it('renders pencil button with aria-label "Edit substep"', () => {
    render(<SubstepCard {...baseProps} editMode editCallbacks={editCallbacks} />);
    expect(screen.getByLabelText('Edit substep')).toBeInTheDocument();
  });

  it('clicking pencil opens popover via renderEditPopover', async () => {
    const user = userEvent.setup();
    const renderEditPopover = vi.fn().mockReturnValue(
      <div data-testid="mock-popover">Popover</div>
    );
    render(
      <SubstepCard
        {...baseProps}
        editMode
        editCallbacks={editCallbacks}
        renderEditPopover={renderEditPopover}
      />
    );

    await user.click(screen.getByLabelText('Edit substep'));
    expect(renderEditPopover).toHaveBeenCalled();
    expect(screen.getByTestId('mock-popover')).toBeInTheDocument();
  });

  it('does NOT show inline edit controls (no edit/delete on descriptions)', () => {
    render(<SubstepCard {...baseProps} editMode editCallbacks={editCallbacks} />);

    // No editable-description test IDs
    expect(screen.queryByTestId('editable-description')).not.toBeInTheDocument();
    // No delete buttons
    expect(screen.queryAllByLabelText('Delete')).toHaveLength(0);
    // No add description
    expect(screen.queryByText('Add description')).not.toBeInTheDocument();
    // No delete substep in footer
    expect(screen.queryByLabelText('Delete substep')).not.toBeInTheDocument();
  });

  it('does NOT show inline add placeholders for missing elements', () => {
    render(<SubstepCard {...minimalProps} editMode editCallbacks={editCallbacks} />);

    expect(screen.queryByTestId('add-note-placeholder')).not.toBeInTheDocument();
    expect(screen.queryByTestId('add-tutorial-placeholder')).not.toBeInTheDocument();
    expect(screen.queryByTestId('add-parts-placeholder')).not.toBeInTheDocument();
  });

  it('descriptions render as plain text (read-only) in edit mode', () => {
    render(<SubstepCard {...baseProps} editMode editCallbacks={editCallbacks} />);

    // Descriptions should just be plain paragraphs, not clickable edit wrappers
    expect(screen.getByText('First description')).toBeInTheDocument();
    expect(screen.queryByTestId('editable-description')).not.toBeInTheDocument();
  });
});
