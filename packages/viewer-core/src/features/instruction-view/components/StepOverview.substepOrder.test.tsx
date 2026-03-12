import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type { ReactNode } from 'react';

// ---------- Mock data: substeps with video frames in REVERSE order of substepIds ----------

const mockViewerData = {
  steps: {
    's1': {
      id: 's1', versionId: 'v1', instructionId: 'i1', assemblyId: 'asm-1',
      stepNumber: 1, title: 'Step 1', description: null,
      // substepIds order: sub-a, sub-b, sub-c — this is the manual reorder order
      substepIds: ['sub-a', 'sub-b', 'sub-c'],
      videoFrameAreaId: null,
    },
  },
  substeps: {
    'sub-a': {
      id: 'sub-a', versionId: 'v1', stepId: 's1', stepOrder: 1,
      creationOrder: 3, title: 'Substep A', description: null,
      repeatCount: 1, repeatLabel: null, repeatVideoFrameAreaId: null,
      imageRowIds: ['img-a'], partToolRowIds: [], tutorialRowIds: [],
      noteRowIds: [], isBlurred: false,
    },
    'sub-b': {
      id: 'sub-b', versionId: 'v1', stepId: 's1', stepOrder: 2,
      creationOrder: 2, title: 'Substep B', description: null,
      repeatCount: 1, repeatLabel: null, repeatVideoFrameAreaId: null,
      imageRowIds: ['img-b'], partToolRowIds: [], tutorialRowIds: [],
      noteRowIds: [], isBlurred: false,
    },
    'sub-c': {
      id: 'sub-c', versionId: 'v1', stepId: 's1', stepOrder: 3,
      creationOrder: 1, title: 'Substep C', description: null,
      repeatCount: 1, repeatLabel: null, repeatVideoFrameAreaId: null,
      imageRowIds: ['img-c'], partToolRowIds: [], tutorialRowIds: [],
      noteRowIds: [], isBlurred: false,
    },
  },
  substepImages: {
    'img-a': { id: 'img-a', versionId: 'v1', substepId: 'sub-a', videoFrameAreaId: 'vfa-a', order: 1 },
    'img-b': { id: 'img-b', versionId: 'v1', substepId: 'sub-b', videoFrameAreaId: 'vfa-b', order: 1 },
    'img-c': { id: 'img-c', versionId: 'v1', substepId: 'sub-c', videoFrameAreaId: 'vfa-c', order: 1 },
  },
  videoFrameAreas: {
    'vfa-a': { id: 'vfa-a', versionId: 'v1', videoId: 'vid-1', frameNumber: 300, x: 0, y: 0, width: 100, height: 100, type: 'Substep', localPath: null },
    'vfa-b': { id: 'vfa-b', versionId: 'v1', videoId: 'vid-1', frameNumber: 200, x: 0, y: 0, width: 100, height: 100, type: 'Substep', localPath: null },
    'vfa-c': { id: 'vfa-c', versionId: 'v1', videoId: 'vid-1', frameNumber: 100, x: 0, y: 0, width: 100, height: 100, type: 'Substep', localPath: null },
  },
  videos: {
    'vid-1': { id: 'vid-1', versionId: 'v1', order: 1, fileName: 'test.mp4', fps: 30, durationFrames: 600, localPath: null },
  },
  partTools: {},
  assemblies: {
    'asm-1': {
      id: 'asm-1', versionId: 'v1', instructionId: 'i1',
      title: 'Assembly 1', description: null, order: 1,
      videoFrameAreaId: null, stepIds: ['s1'],
    },
  },
};

// ---------- Mocks ----------

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string, opts?: Record<string, unknown>) => {
      if (opts?.count !== undefined) return `${opts.count} ${fallback?.replace('{{count}} ', '') ?? _key}`;
      return fallback ?? _key;
    },
  }),
}));

vi.mock('@/hooks', () => ({
  usePreferredResolution: () => ({ resolvedResolution: '1080p' }),
}));

vi.mock('../context', () => ({
  useViewerData: () => mockViewerData,
}));

// Mock sortSubstepsByVideoFrame to sort by frame number (mimics real behavior)
const sortSubstepsByVideoFrameSpy = vi.fn(
  (substeps: Array<{ id: string }>) => {
    // Sort by frame number ascending via videoFrameArea lookup
    return [...substeps].sort((a, b) => {
      const imgA = Object.values(mockViewerData.substepImages).find((i) => i.substepId === a.id);
      const imgB = Object.values(mockViewerData.substepImages).find((i) => i.substepId === b.id);
      const frameA = imgA ? mockViewerData.videoFrameAreas[imgA.videoFrameAreaId]?.frameNumber ?? 0 : 0;
      const frameB = imgB ? mockViewerData.videoFrameAreas[imgB.videoFrameAreaId]?.frameNumber ?? 0 : 0;
      return frameA - frameB;
    });
  },
);

vi.mock('@/features/instruction', () => ({
  UNASSIGNED_STEP_ID: '__unassigned__',
  sortSubstepsByVideoFrame: (...args: unknown[]) => sortSubstepsByVideoFrameSpy(...(args as [Array<{ id: string }>])),
  buildSortData: () => ({}),
}));

vi.mock('@/lib/sortedValues', () => ({
  sortedValues: (obj: Record<string, unknown>, _sortFn: unknown) => {
    return Object.values(obj).sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
      ((a.stepNumber as number) ?? (a.order as number) ?? 0) - ((b.stepNumber as number) ?? (b.order as number) ?? 0),
    );
  },
  byOrder: () => 0,
  byStepNumber: () => 0,
}));

vi.mock('@/lib/media', () => ({
  buildMediaUrl: () => null,
  MediaPaths: { frame: () => '' },
}));

vi.mock('../utils/resolveRawFrameCapture', () => ({
  resolveRawFrameCapture: () => null,
}));

vi.mock('../utils/getUnassignedSubsteps', () => ({
  getUnassignedSubsteps: () => [],
}));

vi.mock('../hooks/usePartToolStepMap', () => ({
  usePartToolStepMap: () => new Map(),
}));

vi.mock('./PartToolSearchBar', () => ({
  PartToolSearchBar: () => null,
}));

vi.mock('./SubstepPreviewCard', () => ({
  SubstepPreviewCard: () => null,
}));

vi.mock('./VideoFrameCapture', () => ({
  VideoFrameCapture: () => null,
}));

vi.mock('./StepAssignmentDialog', () => ({
  StepAssignmentDialog: () => null,
}));

// Capture substepPreviews order from the AssemblySection mock
let capturedSubstepPreviewIds: string[] = [];

vi.mock('./AssemblySection', () => ({
  AssemblySection: ({ steps }: { steps: Array<{ id: string; substepPreviews?: Array<{ id: string }> }> }) => {
    // Capture the substep preview order from the first step
    if (steps.length > 0 && steps[0].substepPreviews) {
      capturedSubstepPreviewIds = steps[0].substepPreviews.map((s) => s.id);
    }
    return <div data-testid="assembly-section">{steps.map((s) => s.id).join(',')}</div>;
  },
  UnassignedSection: () => null,
  getStepPreviewUrl: () => null,
}));

vi.mock('./StepOverviewCard', () => ({
  StepOverviewCard: ({ stepNumber }: { stepNumber: number }) => (
    <div data-testid={`step-card-${stepNumber}`}>Step {stepNumber}</div>
  ),
}));

vi.mock('@/lib/icons', () => ({
  AssemblyIcon: () => null,
}));

vi.mock('@/components/ui', () => ({
  Card: ({ children, ...props }: Record<string, unknown> & { children: ReactNode }) => <div {...props}>{children}</div>,
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  IconButton: () => null,
  TextInputModal: () => null,
  DialogShell: () => null,
  Button: ({ children }: { children: ReactNode }) => <button>{children}</button>,
}));

vi.mock('@/components/ui/CollapsiblePanel', () => ({
  CollapsiblePanel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import { StepOverview } from './StepOverview';

afterEach(() => {
  cleanup();
  capturedSubstepPreviewIds = [];
  sortSubstepsByVideoFrameSpy.mockClear();
});

describe('StepOverview substep ordering', () => {
  it('in edit mode, substep preview order follows substepIds array (not video frame sort)', () => {
    render(
      <StepOverview
        onStepSelect={vi.fn()}
        editMode
        editCallbacks={{}}
      />,
    );

    // In edit mode, substepPreviews should follow substepIds order: sub-a, sub-b, sub-c
    expect(capturedSubstepPreviewIds).toEqual(['sub-a', 'sub-b', 'sub-c']);
  });

  it('in view mode, substep preview order follows video frame sort', () => {
    render(
      <StepOverview
        onStepSelect={vi.fn()}
        editMode={false}
      />,
    );

    // In view mode, sortSubstepsByVideoFrame should sort by frame number:
    // sub-c (100), sub-b (200), sub-a (300)
    expect(capturedSubstepPreviewIds).toEqual(['sub-c', 'sub-b', 'sub-a']);
  });
});
