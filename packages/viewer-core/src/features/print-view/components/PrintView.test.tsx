import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { PrintView } from './PrintView';
import type { InstructionData } from '@/features/instruction';
import { renderImageWithDrawings } from '../utils/renderImageWithDrawings';

// Mock dependencies
let mockData: InstructionData | null = null;

vi.mock('@/features/instruction-view/context', () => ({
  useViewerData: () => mockData,
}));

vi.mock('../utils/renderImageWithDrawings', () => ({
  renderImageWithDrawings: vi.fn().mockResolvedValue('data:image/png;base64,rendered'),
}));

const mockRenderImageWithDrawings = vi.mocked(renderImageWithDrawings);

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback ?? key,
    i18n: { language: 'en' },
  }),
}));

beforeEach(() => {
  mockRenderImageWithDrawings.mockReset();
  mockRenderImageWithDrawings.mockResolvedValue('data:image/png;base64,rendered');
});

afterEach(async () => {
  // Flush pending microtasks before cleanup to avoid "window is not defined"
  await act(async () => {});
  cleanup();
  mockData = null;
});

function makeData(overrides: Partial<InstructionData> = {}): InstructionData {
  return {
    instructionId: 'inst-1',
    instructionName: 'Test Instruction',
    instructionDescription: 'A test description',
    instructionPreviewImageId: null,
    coverImageAreaId: 'cover-vfa',
    articleNumber: 'ART-001',
    estimatedDuration: 30,
    sourceLanguage: 'en',
    useBlurred: false,
    currentVersionId: 'v1',
    liteSubstepLimit: null,
    assemblies: {},
    steps: {
      'step-1': {
        id: 'step-1', versionId: 'v1', instructionId: 'inst-1', assemblyId: null,
        stepNumber: 1, title: 'First Step', description: null, repeatCount: 1, repeatLabel: null,
        substepIds: ['sub-1'],
      },
    },
    substeps: {
      'sub-1': {
        id: 'sub-1', versionId: 'v1', stepId: 'step-1', stepOrder: 0, creationOrder: 0,
        title: null, description: null, displayMode: 'normal', repeatCount: 1, repeatLabel: null,
        imageRowIds: [], videoSectionRowIds: [], partToolRowIds: [],
        noteRowIds: [], descriptionRowIds: [], tutorialRowIds: [],
      },
    },
    videos: {},
    videoSections: {},
    videoFrameAreas: {},
    viewportKeyframes: {},
    partTools: {},
    notes: {},
    substepImages: {},
    substepPartTools: {},
    substepNotes: {},
    substepDescriptions: {},
    substepVideoSections: {},
    partToolVideoFrameAreas: {},
    drawings: {},
    substepTutorials: {},
    safetyIcons: {},
    ...overrides,
  } as InstructionData;
}

describe('PrintView', () => {
  it('renders nothing when data is null', () => {
    mockData = null;
    const { container } = render(<PrintView folderName="test-folder" />);
    expect(container.querySelector('[data-testid="print-view"]')).toBeNull();
  });

  it('renders cover page, step pages', async () => {
    mockData = makeData();
    render(<PrintView folderName="test-folder" />);
    await act(async () => {});

    expect(screen.getByTestId('print-cover-page')).toBeTruthy();
    expect(screen.getByTestId('print-step-page')).toBeTruthy();
  });

  it('renders instruction name on cover page', async () => {
    mockData = makeData();
    const { container } = render(<PrintView folderName="test-folder" />);
    await act(async () => {});

    const coverPage = container.querySelector('[data-testid="print-cover-page"]');
    expect(coverPage).toBeTruthy();
    expect(coverPage!.querySelector('h1')!.textContent).toBe('Test Instruction');
  });

  it('renders step page with correct test id', async () => {
    mockData = makeData();
    const { container } = render(<PrintView folderName="test-folder" />);
    await act(async () => {});

    const stepPages = container.querySelectorAll('[data-testid="print-step-page"]');
    expect(stepPages).toHaveLength(1);
  });

  it('renders print-view root element', async () => {
    mockData = makeData();
    const { container } = render(<PrintView folderName="test-folder" />);
    await act(async () => {});

    const view = container.querySelector('[data-testid="print-view"]');
    expect(view).toBeTruthy();
  });

  it('does not render step pages before renderAll completes', async () => {
    // Create a deferred promise so renderImageWithDrawings blocks
    let resolveRender!: (url: string) => void;
    mockRenderImageWithDrawings.mockImplementation(
      () => new Promise((resolve) => { resolveRender = resolve; }),
    );

    mockData = makeDataWithDrawings();
    const { container } = render(<PrintView folderName="test-folder" />);

    // Flush initial render
    await act(async () => {});

    // renderAll has NOT completed yet — step pages should not be rendered
    expect(container.querySelector('[data-testid="print-step-page"]')).toBeNull();

    // Now resolve rendering
    await act(async () => { resolveRender('data:image/png;base64,rendered'); });

    // After renderAll completes, step pages should appear
    expect(container.querySelector('[data-testid="print-step-page"]')).toBeTruthy();
  });

  it('shows loading state while rendering images with drawings', async () => {
    let resolveRender!: (url: string) => void;
    mockRenderImageWithDrawings.mockImplementation(
      () => new Promise((resolve) => { resolveRender = resolve; }),
    );

    mockData = makeDataWithDrawings();
    const { container } = render(<PrintView folderName="test-folder" />);
    await act(async () => {});

    // Should show loading indicator while rendering
    expect(container.querySelector('[data-testid="print-view-loading"]')).toBeTruthy();

    await act(async () => { resolveRender('data:image/png;base64,rendered'); });

    // Loading should be gone after rendering completes
    expect(container.querySelector('[data-testid="print-view-loading"]')).toBeNull();
  });
});

/** Creates test data with a substep that has an image and a drawing annotation. */
function makeDataWithDrawings(): InstructionData {
  return makeData({
    steps: {
      'step-1': {
        id: 'step-1', versionId: 'v1', instructionId: 'inst-1', assemblyId: null,
        stepNumber: 1, title: 'Step With Drawing', description: null, repeatCount: 1, repeatLabel: null,
        substepIds: ['sub-1'],
      },
    },
    substeps: {
      'sub-1': {
        id: 'sub-1', versionId: 'v1', stepId: 'step-1', stepOrder: 0, creationOrder: 0,
        title: null, description: null, displayMode: 'normal', repeatCount: 1, repeatLabel: null,
        imageRowIds: ['img-row-1'], videoSectionRowIds: [], partToolRowIds: [],
        noteRowIds: [], descriptionRowIds: [], tutorialRowIds: [],
      },
    },
    substepImages: {
      'img-row-1': {
        id: 'img-row-1', substepId: 'sub-1', videoFrameAreaId: 'vfa-1', order: 0,
      },
    } as Record<string, never>,
    drawings: {
      'draw-1': {
        id: 'draw-1', type: 'rectangle', color: 'red', strokeWidth: 2,
        x1: 0.1, y1: 0.1, x2: 0.5, y2: 0.5,
        x: null, y: null, content: null, fontSize: null, points: null,
        substepImageId: 'img-row-1', videoSectionId: null,
      },
    } as Record<string, never>,
    coverImageAreaId: null, // No cover image to simplify test
  });
}
