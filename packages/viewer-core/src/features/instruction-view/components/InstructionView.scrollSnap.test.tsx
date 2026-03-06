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
      's1': { id: 's1', versionId: 'v1', instructionId: 'i1', assemblyId: null, stepNumber: 1, title: 'Step 1', description: null, repeatCount: 1, repeatLabel: null, substepIds: ['sub1', 'sub2'] },
    },
    substeps: {
      'sub1': {
        id: 'sub1', stepId: 's1', substepNumber: 1, title: 'Substep 1',
        videoFrameNumber: null, repeatCount: 1, repeatLabel: null,
        imageRowIds: [], videoSectionRowIds: [], partToolRowIds: [],
        descriptionRowIds: [], noteRowIds: [], tutorialRowIds: [],
      },
      'sub2': {
        id: 'sub2', stepId: 's1', substepNumber: 2, title: 'Substep 2',
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
  SubstepCard: () => <div data-testid="substep-card" />,
}));
vi.mock('./StepOverview', () => ({ StepOverview: () => null }));
vi.mock('./PartsDrawer', () => ({ PartsDrawer: () => null }));
vi.mock('./SpeedDrawer', () => ({ SpeedDrawer: () => null }));

// Default: single-column — tests can override via vi.mocked()
const mockUseResponsiveGridColumns = vi.fn(() => 1);
vi.mock('../hooks/useResponsiveGridColumns', () => ({
  useResponsiveGridColumns: (...args: unknown[]) => mockUseResponsiveGridColumns(...args),
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
  MediaPaths: { substepVideo: () => '' },
}));
vi.mock('../hooks/useVisibleStep', () => ({
  useVisibleStep: () => null,
}));
vi.mock('../utils/buildVideoEntry', () => ({
  buildVideoEntry: () => null,
}));
vi.mock('./StepSeparator', () => ({
  StepSeparator: () => null,
}));

beforeEach(() => {
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
  Element.prototype.scrollTo = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
  mockUseResponsiveGridColumns.mockReturnValue(1);
});

afterEach(() => {
  cleanup();
});

// ---------- Tests ----------

describe('InstructionView scrollable layout', () => {
  it('does NOT apply scroll-snap-type (removed pagination)', () => {
    mockUseResponsiveGridColumns.mockReturnValue(1);
    const { container } = render(
      <InstructionView selectedStepId="s1" />,
    );
    const scrollContainer = container.querySelector('.overflow-y-auto');
    expect(scrollContainer).not.toBeNull();
    expect((scrollContainer as HTMLElement).style.scrollSnapType).toBe('');
  });

  it('renders all substep cards', () => {
    const { container } = render(
      <InstructionView selectedStepId="s1" />,
    );
    const cards = container.querySelectorAll('[data-testid="substep-card"]');
    expect(cards.length).toBe(2);
  });

  it('no Previous/Next buttons in DOM', () => {
    render(
      <InstructionView selectedStepId="s1" />,
    );
    expect(screen.queryByLabelText('Previous')).toBeNull();
    expect(screen.queryByLabelText('Next')).toBeNull();
  });

  it('renders fade gradient when scroll hint is visible', () => {
    const { container } = render(
      <InstructionView selectedStepId="s1" />,
    );
    const gradientEl = container.querySelector('.bg-gradient-to-t');
    // showScrollHint starts as false, so gradient should NOT be present initially
    expect(gradientEl).toBeNull();
  });
});
