import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Package } from 'lucide-react';
import { clsx } from 'clsx';

import { Card, Badge } from '@/components/ui';
import { usePreferredResolution } from '@/hooks';
import type { Assembly } from '@/features/instruction';
import { StepOverviewCard } from './StepOverviewCard';
import type { FrameCaptureData } from '../utils/resolveRawFrameCapture';

/**
 * Get the preview image URL for a step (local mode: use localPath only).
 */
export function getStepPreviewUrl(
  step: StepWithPreview,
  useRawVideo: boolean,
  _resolution: string
): string | null {
  if (useRawVideo) return null;
  return step.previewLocalPath || null;
}

export interface StepWithPreview {
  id: string;
  order: number;
  title: string | null;
  description: string | null;
  substepCount: number;
  /** VideoFrameArea ID for exported image URL */
  previewAreaId?: string | null;
  /** Pre-exported image URL (for standalone/snapshot mode) */
  previewLocalPath?: string | null;
  /** Raw frame capture data for Editor preview (resolves source video) */
  frameCaptureData?: FrameCaptureData | null;
}

interface AssemblySectionProps {
  /** Assembly data */
  assembly: Assembly;
  /** Steps belonging to this assembly */
  steps: StepWithPreview[];
  /** Called when a step is selected */
  onStepSelect: (stepId: string) => void;
  /** Whether section is expanded by default */
  defaultExpanded?: boolean;
  /** Use raw video frame capture instead of pre-rendered images. Default: false */
  useRawVideo?: boolean;
}

/**
 * AssemblySection - Collapsible section displaying steps grouped by assembly
 *
 * Glassmorphism card with header and grid of StepOverviewCards.
 */
export function AssemblySection({
  assembly,
  steps,
  onStepSelect,
  defaultExpanded = true,
  useRawVideo = false,
}: AssemblySectionProps) {
  const { t } = useTranslation();
  const { resolvedResolution } = usePreferredResolution();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (steps.length === 0) return null;

  return (
    <Card
      variant="glass"
      padding="none"
      className="overflow-hidden"
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={clsx(
          'w-full flex items-center gap-3 px-4 py-3',
          'text-left transition-colors',
          'hover:bg-white/[0.03]',
          isExpanded && 'shadow-sm'
        )}
      >
        {/* Assembly Icon */}
        <Package className="h-4 w-4 text-[var(--color-text-muted)] flex-shrink-0" />

        {/* Title */}
        <span className="flex-1 font-medium text-[var(--color-text-base)] truncate">
          {assembly.title}
        </span>

        {/* Step Count Badge */}
        <Badge variant="default" className="text-xs">
          {steps.length} {steps.length === 1 ? t('instructionView.step', 'Step') : t('instructionView.steps', 'Steps')}
        </Badge>

        {/* Collapse Icon */}
        <ChevronDown
          className={clsx(
            'h-4 w-4 text-[var(--color-text-muted)] transition-transform duration-200',
            !isExpanded && '-rotate-90'
          )}
        />
      </button>

      {/* Content - Step Grid */}
      {isExpanded && (
        <div className="p-4 max-h-[30rem] overflow-y-auto scrollbar-subtle">
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(20rem, 1fr))',
            }}
          >
            {steps.map((step) => (
              <StepOverviewCard
                key={step.id}
                stepNumber={step.order}
                title={step.title}
                description={step.description}
                substepCount={step.substepCount}
                previewImageUrl={getStepPreviewUrl(step, useRawVideo, resolvedResolution)}
                useRawVideo={useRawVideo}
                frameCaptureData={step.frameCaptureData}
                onClick={() => onStepSelect(step.id)}
              />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

interface UnassignedSectionProps {
  /** Steps without assembly assignment */
  steps: StepWithPreview[];
  /** Called when a step is selected */
  onStepSelect: (stepId: string) => void;
  /** Whether section is expanded by default */
  defaultExpanded?: boolean;
  /** Use raw video frame capture instead of pre-rendered images. Default: false */
  useRawVideo?: boolean;
}

/**
 * UnassignedSection - Section for steps without assembly assignment
 */
export function UnassignedSection({
  steps,
  onStepSelect,
  defaultExpanded = true,
  useRawVideo = false,
}: UnassignedSectionProps) {
  const { t } = useTranslation();
  const { resolvedResolution } = usePreferredResolution();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (steps.length === 0) return null;

  return (
    <Card
      variant="glass"
      padding="none"
      className="overflow-hidden"
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={clsx(
          'w-full flex items-center gap-3 px-4 py-3',
          'text-left transition-colors',
          'hover:bg-white/[0.03]',
          isExpanded && 'shadow-sm'
        )}
      >
        {/* Title */}
        <span className="flex-1 font-medium text-[var(--color-text-muted)] truncate">
          {t('instructionView.unassignedSteps', 'Other Steps')}
        </span>

        {/* Step Count Badge */}
        <Badge variant="default" className="text-xs">
          {steps.length}
        </Badge>

        {/* Collapse Icon */}
        <ChevronDown
          className={clsx(
            'h-4 w-4 text-[var(--color-text-muted)] transition-transform duration-200',
            !isExpanded && '-rotate-90'
          )}
        />
      </button>

      {/* Content - Step Grid */}
      {isExpanded && (
        <div className="p-4 max-h-[30rem] overflow-y-auto scrollbar-subtle">
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(20rem, 1fr))',
            }}
          >
            {steps.map((step) => (
              <StepOverviewCard
                key={step.id}
                stepNumber={step.order}
                title={step.title}
                description={step.description}
                substepCount={step.substepCount}
                previewImageUrl={getStepPreviewUrl(step, useRawVideo, resolvedResolution)}
                useRawVideo={useRawVideo}
                frameCaptureData={step.frameCaptureData}
                onClick={() => onStepSelect(step.id)}
              />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
