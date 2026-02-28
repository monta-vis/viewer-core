import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { InstructionView } from './InstructionView';

// ---------- Mocks ----------

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock('../context', () => ({
  useViewerData: () => ({
    steps: {
      's1': { id: 's1', versionId: 'v1', instructionId: 'i1', assemblyId: null, stepNumber: 1, title: 'Step 1', description: null, repeatCount: 1, repeatLabel: null, substepIds: ['sub1'] },
    },
    substeps: {
      'sub1': {
        id: 'sub1', stepId: 's1', substepNumber: 1, title: 'Substep 1',
        videoFrameNumber: null, repeatCount: 1, repeatLabel: null,
        imageRowIds: [], videoSectionRowIds: [], partToolRowIds: [],
        descriptionRowIds: [], noteRowIds: [], tutorialRowIds: [],
      },
    },
    substepDescriptions: {},
    substepNotes: {},
    substepPartTools: {},
    substepImages: {},
    substepTutorials: {},
    drawings: {},
    viewportKeyframes: {},
    videos: {},
    videoSections: {},
    videoFrameAreas: {},
    notes: {},
    partTools: {},
    instruction: { id: 'i1', title: 'Test' },
  }),
}));

vi.mock('@/features/video-player', () => ({
  useVideo: () => ({ playbackSpeed: 1, setPlaybackSpeed: vi.fn() }),
}));

vi.mock('@/features/feedback', () => ({
  FeedbackButton: () => null,
  StarRating: () => null,
}));

vi.mock('./SubstepCard', () => ({
  SubstepCard: ({ editMode }: { editMode?: boolean }) => (
    <div data-testid="substep-card" data-edit-mode={editMode ? 'true' : 'false'} />
  ),
}));
vi.mock('./StepOverview', () => ({ StepOverview: () => null }));
vi.mock('./PartsDrawer', () => ({ PartsDrawer: () => null }));
vi.mock('./SpeedDrawer', () => ({ SpeedDrawer: () => null }));

vi.mock('../hooks/useResponsiveGridColumns', () => ({
  useResponsiveGridColumns: () => 1,
  CARD_MIN_WIDTH_REM: 18,
  CARD_MAX_WIDTH_REM: 28,
  CARD_GAP_REM: 1,
}));
vi.mock('../hooks/useSwipeGestures', () => ({
  useSwipeGestures: () => ({}),
}));
vi.mock('../utils/resolveRawFrameCapture', () => ({
  resolveRawFrameCapture: () => null,
}));
vi.mock('../utils/getUnassignedSubsteps', () => ({
  getUnassignedSubsteps: () => [],
}));
vi.mock('../utils/resolveTutorialTargets', () => ({
  resolveTutorialTargets: () => [],
}));
vi.mock('../utils/tutorialToggle', () => ({
  computeTutorialToggle: () => ({ display: null }),
}));
vi.mock('../utils/tutorialSteps', () => ({
  getInitialTutorialStep: () => null,
  advanceOnDrawerOpen: () => null,
  advanceOnDrawerClose: () => null,
  advanceOnSubstepClick: () => null,
}));
vi.mock('@/lib/media', () => ({
  buildMediaUrl: () => '',
  MediaPaths: {},
}));

beforeEach(() => {
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
  Element.prototype.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
});

// ---------- Helpers ----------

const editCallbacks = {
  onEditImage: vi.fn(),
  onDeleteImage: vi.fn(),
  onAddSubstep: vi.fn(),
};

// ---------- Tests ----------

describe('InstructionView editModeActive prop', () => {
  it('edit mode is off by default — SubstepCards receive editMode=false', () => {
    render(
      <InstructionView selectedStepId="s1" editCallbacks={editCallbacks} />,
    );
    const cards = screen.getAllByTestId('substep-card');
    expect(cards.every((c) => c.dataset.editMode === 'false')).toBe(true);
  });

  it('edit mode is on when editModeActive=true and editCallbacks provided', () => {
    render(
      <InstructionView selectedStepId="s1" editModeActive editCallbacks={editCallbacks} />,
    );
    const cards = screen.getAllByTestId('substep-card');
    expect(cards.every((c) => c.dataset.editMode === 'true')).toBe(true);
  });

  it('edit mode stays off when editModeActive=true but no editCallbacks', () => {
    render(
      <InstructionView selectedStepId="s1" editModeActive />,
    );
    const cards = screen.getAllByTestId('substep-card');
    expect(cards.every((c) => c.dataset.editMode === 'false')).toBe(true);
  });

  it('edit mode is off when editModeActive=false even with editCallbacks', () => {
    render(
      <InstructionView selectedStepId="s1" editModeActive={false} editCallbacks={editCallbacks} />,
    );
    const cards = screen.getAllByTestId('substep-card');
    expect(cards.every((c) => c.dataset.editMode === 'false')).toBe(true);
  });
});
