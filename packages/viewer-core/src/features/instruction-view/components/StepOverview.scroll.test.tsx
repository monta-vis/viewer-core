import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

// ---------- Configurable mock data ----------

const defaultViewerData = {
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
};

let mockViewerData = defaultViewerData;

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
  useViewerData: () => mockViewerData,
}));

vi.mock('./StepOverviewCard', () => ({
  StepOverviewCard: ({ stepNumber, stepId }: { stepNumber: number; stepId?: string }) => (
    <div data-testid={`step-card-${stepNumber}`} data-step-id={stepId}>
      Step {stepNumber}
    </div>
  ),
}));

vi.mock('./AssemblySection', () => ({
  AssemblySection: ({ assembly, steps, onStepSelect }: {
    assembly: { id: string; title: string };
    steps: { id: string; order: number }[];
    onStepSelect: (id: string) => void;
  }) => (
    <div data-assembly-id={assembly.id} data-testid={`assembly-${assembly.id}`}>
      {steps.map((step) => (
        <div
          key={step.id}
          data-step-id={step.id}
          data-testid={`step-card-${step.order}`}
          onClick={() => onStepSelect(step.id)}
        >
          Step {step.order}
        </div>
      ))}
    </div>
  ),
  UnassignedSection: () => null,
  getStepPreviewUrl: () => null,
}));

vi.mock('@/features/instruction', () => ({
  UNASSIGNED_STEP_ID: '__unassigned__',
  sortSubstepsByVideoFrame: () => [],
  buildSortData: () => ({}),
}));

vi.mock('@/lib/sortedValues', () => ({
  sortedValues: (obj: Record<string, unknown>) => Object.values(obj).sort((a: Record<string, number>, b: Record<string, number>) => (a.stepNumber ?? a.order) - (b.stepNumber ?? b.order)),
  byOrder: () => 0,
  byStepNumber: () => 0,
}));

vi.mock('../utils/resolveRawFrameCapture', () => ({
  resolveRawFrameCapture: () => null,
}));

vi.mock('../utils/getUnassignedSubsteps', () => ({
  getUnassignedSubsteps: () => [],
}));

vi.mock('./PartToolSearchBar', () => ({
  PartToolSearchBar: () => null,
}));

vi.mock('../hooks/usePartToolStepMap', () => ({
  usePartToolStepMap: () => new Map(),
}));

import { StepOverview } from './StepOverview';

afterEach(() => {
  cleanup();
  mockViewerData = defaultViewerData;
});

describe('StepOverview auto-scroll', () => {
  let scrolledElements: Element[];

  beforeEach(() => {
    scrolledElements = [];
    Element.prototype.scrollIntoView = function (this: Element) {
      scrolledElements.push(this);
    };
  });

  it('scrolls to the active step card when activeStepId is set', async () => {
    render(
      <StepOverview
        onStepSelect={vi.fn()}
        activeStepId="s2"
      />,
    );

    // Wait for rAF + useEffect
    await vi.waitFor(() => {
      expect(scrolledElements.length).toBeGreaterThan(0);
    });
  });

  it('does NOT scroll when activeStepId is null', async () => {
    render(
      <StepOverview
        onStepSelect={vi.fn()}
        activeStepId={null}
      />,
    );

    // Give time for any potential scroll call
    await new Promise((r) => setTimeout(r, 50));
    expect(scrolledElements).toHaveLength(0);
  });

  it('scrolls to assembly header when activeStepId is the first step of an assembly', async () => {
    // Set up data with assemblies
    mockViewerData = {
      steps: {
        's1': {
          id: 's1', versionId: 'v1', instructionId: 'i1', assemblyId: 'a1',
          stepNumber: 1, title: 'Step 1', description: null, substepIds: [],
        },
        's2': {
          id: 's2', versionId: 'v1', instructionId: 'i1', assemblyId: 'a1',
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
      assemblies: {
        'a1': { id: 'a1', versionId: 'v1', instructionId: 'i1', title: 'Assembly 1', order: 1 },
      },
    };

    render(
      <StepOverview
        onStepSelect={vi.fn()}
        activeStepId="s1"
      />,
    );

    await vi.waitFor(() => {
      expect(scrolledElements.length).toBeGreaterThan(0);
    });

    // Verify scrollIntoView was called on the assembly element, not the step
    const scrolledEl = scrolledElements[0];
    expect(scrolledEl.getAttribute('data-assembly-id')).toBe('a1');
  });

  it('scrolls to step card (not assembly) when activeStepId is NOT the first step of an assembly', async () => {
    mockViewerData = {
      steps: {
        's1': {
          id: 's1', versionId: 'v1', instructionId: 'i1', assemblyId: 'a1',
          stepNumber: 1, title: 'Step 1', description: null, substepIds: [],
        },
        's2': {
          id: 's2', versionId: 'v1', instructionId: 'i1', assemblyId: 'a1',
          stepNumber: 2, title: 'Step 2', description: null, substepIds: [],
        },
      },
      substeps: {},
      substepImages: {},
      videoFrameAreas: {},
      videos: {},
      partTools: {},
      assemblies: {
        'a1': { id: 'a1', versionId: 'v1', instructionId: 'i1', title: 'Assembly 1', order: 1 },
      },
    };

    render(
      <StepOverview
        onStepSelect={vi.fn()}
        activeStepId="s2"
      />,
    );

    await vi.waitFor(() => {
      expect(scrolledElements.length).toBeGreaterThan(0);
    });

    // Verify scrollIntoView was called on the step element, not the assembly
    const scrolledEl = scrolledElements[0];
    expect(scrolledEl.getAttribute('data-step-id')).toBe('s2');
  });
});
