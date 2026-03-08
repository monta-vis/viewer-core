import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

// ---------- Mocks ----------

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock('@/hooks', () => ({
  usePreferredResolution: () => ({ resolvedResolution: '1080p' }),
}));

vi.mock('../context', () => ({
  useViewerData: () => ({
    steps: {
      's1': {
        id: 's1', versionId: 'v1', instructionId: 'i1', assemblyId: null,
        stepNumber: 1, title: 'Step 1', description: null, substepIds: [],
      },
      's2': {
        id: 's2', versionId: 'v1', instructionId: 'i1', assemblyId: null,
        stepNumber: 2, title: 'Step 2', description: null, substepIds: [],
      },
      's3': {
        id: 's3', versionId: 'v1', instructionId: 'i1', assemblyId: null,
        stepNumber: 3, title: 'Step 3', description: null, substepIds: [],
      },
    },
    substeps: {},
    substepImages: {},
    videoFrameAreas: {},
    videos: {},
    partTools: {},
    assemblies: {},
  }),
}));

vi.mock('./StepOverviewCard', () => ({
  StepOverviewCard: ({ stepNumber, stepId }: { stepNumber: number; stepId?: string }) => (
    <div data-testid={`step-card-${stepNumber}`} data-step-id={stepId}>
      Step {stepNumber}
    </div>
  ),
}));

vi.mock('./AssemblySection', () => ({
  AssemblySection: () => null,
  UnassignedSection: () => null,
  getStepPreviewUrl: () => null,
}));

vi.mock('@/features/instruction', () => ({
  UNASSIGNED_STEP_ID: '__unassigned__',
  sortSubstepsByVideoFrame: () => [],
  buildSortData: () => ({}),
}));

vi.mock('@/lib/sortedValues', () => ({
  sortedValues: (obj: Record<string, unknown>) => Object.values(obj).sort((a: Record<string, number>, b: Record<string, number>) => a.stepNumber - b.stepNumber),
  byOrder: () => 0,
  byStepNumber: () => 0,
}));

vi.mock('../utils/resolveRawFrameCapture', () => ({
  resolveRawFrameCapture: () => null,
}));

vi.mock('../utils/getUnassignedSubsteps', () => ({
  getUnassignedSubsteps: () => [],
}));

import { StepOverview } from './StepOverview';

afterEach(() => {
  cleanup();
});

describe('StepOverview auto-scroll', () => {
  it('scrolls to the active step card when activeStepId is set', async () => {
    const scrollIntoView = vi.fn();

    // Mock scrollIntoView on elements
    Element.prototype.scrollIntoView = scrollIntoView;

    render(
      <StepOverview
        onStepSelect={vi.fn()}
        activeStepId="s2"
      />,
    );

    // Wait for rAF + useEffect
    await vi.waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalled();
    });
  });

  it('does NOT scroll when activeStepId is null', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;

    render(
      <StepOverview
        onStepSelect={vi.fn()}
        activeStepId={null}
      />,
    );

    // Give time for any potential scroll call
    await new Promise((r) => setTimeout(r, 50));
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
