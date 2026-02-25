import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { PartToolCard } from './PartsDrawer';
import type { AggregatedPartTool } from '../hooks/useFilteredPartsTools';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

// Mock media utils
vi.mock('@/lib/media', () => ({
  catalogAssetUrl: () => '',
}));

// Mock resolvePartToolImageUrl
vi.mock('../utils/resolvePartToolImageUrl', () => ({
  resolvePartToolImageUrl: () => null,
}));

// Mock resolveRawFrameCapture
vi.mock('../utils/resolveRawFrameCapture', () => ({
  resolvePartToolFrameCapture: () => null,
}));

// Mock VideoFrameCapture
vi.mock('./VideoFrameCapture', () => ({
  VideoFrameCapture: () => null,
}));

afterEach(() => {
  cleanup();
});

function makeItem(overrides: Partial<AggregatedPartTool['partTool']> = {}): AggregatedPartTool {
  return {
    partTool: {
      id: 'pt-1',
      versionId: 'v1',
      instructionId: 'i1',
      previewImageId: null,
      name: 'Steel Bolt',
      type: 'Part',
      partNumber: 'BLT-001',
      amount: 4,
      description: null,
      unit: null,
      material: null,
      dimension: null,
      iconId: null,
      ...overrides,
    },
    totalAmount: 4,
    usedInSteps: [1],
    amountsPerSubstep: new Map(),
  };
}

describe('PartToolCard', () => {
  it('renders material when present', () => {
    render(
      <PartToolCard
        item={makeItem({ material: 'Stainless Steel' })}
        size="large"
        onClick={() => {}}
      />,
    );
    expect(screen.getByText('Stainless Steel')).toBeInTheDocument();
  });

  it('renders dimension when present', () => {
    render(
      <PartToolCard
        item={makeItem({ dimension: 'M8x40' })}
        size="large"
        onClick={() => {}}
      />,
    );
    expect(screen.getByText('M8x40')).toBeInTheDocument();
  });

  it('does NOT render material/dimension section when both are null', () => {
    render(
      <PartToolCard
        item={makeItem({ material: null, dimension: null })}
        size="large"
        onClick={() => {}}
      />,
    );
    expect(screen.queryByText('Stainless Steel')).not.toBeInTheDocument();
    expect(screen.queryByText('M8x40')).not.toBeInTheDocument();
  });
});
