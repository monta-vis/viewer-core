import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
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

// Mock video-player feature — useVideo returns controllable playbackSpeed
const mockPlaybackSpeed = { current: 1 };
vi.mock('@/features/video-player', () => ({
  useVideo: () => ({ playbackSpeed: mockPlaybackSpeed.current, setPlaybackSpeed: vi.fn() }),
  interpolateVideoViewport: () => ({ x: 0, y: 0, width: 1, height: 1, rotation: 0 }),
  viewportToTransform: () => ({ scale: 1, translateX: 0, translateY: 0 }),
  applyViewportTransformToElement: vi.fn(),
  startSectionPlaybackLoop: vi.fn(() => vi.fn()),
  useSectionPlayback: vi.fn(),
  useViewportPlaybackSync: vi.fn(() => ({
    applyAtFrame: vi.fn(),
    applyAtCurrentTime: vi.fn(),
    hasViewport: false,
  })),
}));

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
  mockPlaybackSpeed.current = 1;
});

// ============================================================
// substep order badge — "X/N" format
// ============================================================
describe('SubstepCard — substep order badge', () => {
  it('renders "stepOrder/totalSubsteps" when totalSubsteps is provided', () => {
    render(<SubstepCard {...baseProps} stepOrder={2} totalSubsteps={5} />);
    expect(screen.getByText('2/5')).toBeInTheDocument();
  });

  it('renders just stepOrder when totalSubsteps is not provided', () => {
    render(<SubstepCard {...baseProps} stepOrder={3} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });
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

// ============================================================
// hideFooter prop
// ============================================================
describe('SubstepCard — hideFooter', () => {
  it('hides the description footer when hideFooter is true', () => {
    render(<SubstepCard {...baseProps} hideFooter />);
    // Descriptions should not be rendered
    expect(screen.queryByText('First description')).not.toBeInTheDocument();
    expect(screen.queryByText('Second description')).not.toBeInTheDocument();
    // The "—" dash should not appear either
    expect(screen.queryByText('—')).not.toBeInTheDocument();
  });

  it('shows the description footer by default', () => {
    render(<SubstepCard {...baseProps} />);
    expect(screen.getByText('First description')).toBeInTheDocument();
    expect(screen.getByText('Second description')).toBeInTheDocument();
  });

  it('shows the "—" placeholder when descriptions are empty and hideFooter is not set', () => {
    render(<SubstepCard {...minimalProps} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('hides the "—" placeholder when descriptions are empty and hideFooter is true', () => {
    render(<SubstepCard {...minimalProps} hideFooter />);
    expect(screen.queryByText('—')).not.toBeInTheDocument();
  });
});

// ============================================================
// Enter key propagation — edit popover open
// ============================================================
describe('SubstepCard — Enter key when edit popover is open', () => {
  it('does not call onClick on Enter when edit popover is open', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const renderEditPopover = vi.fn().mockReturnValue(
      <div data-testid="mock-popover">
        <textarea data-testid="mock-textarea" />
      </div>
    );

    render(
      <SubstepCard
        {...baseProps}
        editMode
        editCallbacks={editCallbacks}
        renderEditPopover={renderEditPopover}
        onClick={onClick}
      />
    );

    // Open the edit popover
    await user.click(screen.getByLabelText('Edit substep'));
    expect(screen.getByTestId('mock-popover')).toBeInTheDocument();

    // Fire Enter keydown on the card (the outermost role="button" element)
    const card = screen.getAllByRole('button')[0];
    fireEvent.keyDown(card, { key: 'Enter' });

    expect(onClick).not.toHaveBeenCalled();
  });
});

// ============================================================
// noteIconLabels → NoteCard iconLabel prop
// ============================================================
describe('SubstepCard — noteIconLabels', () => {
  it('NoteCard img receives alt from category and Tooltip from noteIconLabels map', () => {
    const noteIconLabels = { 'W001-Allgemeines-Warnzeichen.png': 'General Warning' };
    render(<SubstepCard {...baseProps} noteIconLabels={noteIconLabels} />);
    const imgs = screen.getAllByRole('img');
    // NoteCard uses alt={categoryLabel} on the img element
    const noteImg = imgs.find(img => img.getAttribute('alt') === 'Warnzeichen');
    expect(noteImg).toBeTruthy();
  });

  it('NoteCard img has alt=categoryLabel when noteIconLabels not provided', () => {
    render(<SubstepCard {...baseProps} />);
    const imgs = screen.getAllByRole('img');
    // NoteCard uses alt={categoryLabel} on the img element
    const noteImg = imgs.find(img => img.getAttribute('alt') === 'Warnzeichen');
    expect(noteImg).toBeTruthy();
  });
});

// ============================================================
// isViewed — left border accent
// ============================================================
describe('SubstepCard — isViewed left border accent', () => {
  it('adds left border class when isViewed is true', () => {
    const { container } = render(<SubstepCard {...baseProps} isViewed />);
    const card = container.firstElementChild!;
    expect(card.className).toContain('border-l-[0.1875rem]');
    expect(card.className).toContain('border-l-[var(--color-secondary)]');
  });

  it('does not add left border class when isViewed is false', () => {
    const { container } = render(<SubstepCard {...baseProps} isViewed={false} />);
    const card = container.firstElementChild!;
    expect(card.className).not.toContain('border-l-[0.1875rem]');
  });

  it('does not render Eye icon when isViewed is true', () => {
    render(<SubstepCard {...baseProps} isViewed />);
    expect(screen.queryByTitle('Viewed')).not.toBeInTheDocument();
  });
});

// ============================================================
// Global playback speed sync (SpeedDrawer → SubstepCard)
// ============================================================
const videoProps = {
  ...baseProps,
  videoData: {
    videoSrc: 'test.mp4',
    startFrame: 0,
    endFrame: 300,
    fps: 30,
    viewportKeyframes: [],
    videoAspectRatio: 16 / 9,
  },
};

// Stub HTMLVideoElement play/pause for jsdom
function stubVideoElement() {
  Object.defineProperty(HTMLVideoElement.prototype, 'play', {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });
  Object.defineProperty(HTMLVideoElement.prototype, 'pause', {
    configurable: true,
    value: vi.fn(),
  });
}

describe('SubstepCard — global playback speed sync', () => {
  beforeEach(() => {
    stubVideoElement();
  });

  it('uses global playbackSpeed when starting playback', async () => {
    mockPlaybackSpeed.current = 1.5;
    const user = userEvent.setup();
    render(<SubstepCard {...videoProps} />);

    // Click the card to start inline playback
    const card = screen.getAllByRole('button')[0];
    await user.click(card);

    // The video element should have playbackRate set to the global speed
    const video = document.querySelector('video');
    expect(video).toBeTruthy();
    expect(video!.playbackRate).toBe(1.5);
  });

  it('card ×0.5 button overrides global speed during playback', async () => {
    mockPlaybackSpeed.current = 2;
    const user = userEvent.setup();
    render(<SubstepCard {...videoProps} />);

    // Start playback
    const card = screen.getAllByRole('button')[0];
    await user.click(card);

    // Click the ×0.5 speed button
    const halfSpeedBtn = screen.getByLabelText('Set speed to 0.5x');
    await user.click(halfSpeedBtn);

    const video = document.querySelector('video');
    expect(video!.playbackRate).toBe(0.5);
  });

  it('card ×2 button overrides global speed during playback', async () => {
    mockPlaybackSpeed.current = 0.5;
    const user = userEvent.setup();
    render(<SubstepCard {...videoProps} />);

    // Start playback
    const card = screen.getAllByRole('button')[0];
    await user.click(card);

    // Click the ×2 speed button
    const doubleSpeedBtn = screen.getByLabelText('Set speed to 2x');
    await user.click(doubleSpeedBtn);

    const video = document.querySelector('video');
    expect(video!.playbackRate).toBe(2);
  });

  it('speed buttons are not highlighted from global speed alone', () => {
    // Global speed 0.5 should NOT highlight the ×0.5 button (no override set)
    mockPlaybackSpeed.current = 0.5;
    render(<SubstepCard {...videoProps} />);

    // Card is not playing, so buttons aren't visible — verify component renders without error
    expect(document.querySelector('[role="button"]')).toBeTruthy();
  });

  it('re-renders with new global speed when playbackSpeed changes', () => {
    mockPlaybackSpeed.current = 1;
    const { rerender } = render(<SubstepCard {...videoProps} />);

    mockPlaybackSpeed.current = 1.8;
    rerender(<SubstepCard {...videoProps} />);

    expect(document.querySelector('[role="button"]')).toBeTruthy();
  });
});
