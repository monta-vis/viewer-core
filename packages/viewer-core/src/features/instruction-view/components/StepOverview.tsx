import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { usePreferredResolution } from '@/hooks';
import { UNASSIGNED_STEP_ID, sortSubstepsByVideoFrame, buildSortData } from '@/features/instruction';
import { useViewerData } from '../context';
import { sortedValues, byOrder, byStepNumber } from '@/lib/sortedValues';
import { StepOverviewCard } from './StepOverviewCard';
import { AssemblySection, UnassignedSection, getStepPreviewUrl } from './AssemblySection';
import { resolveRawFrameCapture, type FrameCaptureData } from '../utils/resolveRawFrameCapture';
import { getUnassignedSubsteps } from '../utils/getUnassignedSubsteps';

interface StepOverviewProps {
  /** Called when a step is selected */
  onStepSelect: (stepId: string) => void;
  /** Use raw video frame capture instead of pre-rendered images. Default: false */
  useRawVideo?: boolean;
  /** Project folder name for mvis-media:// URLs (enables source video in Editor preview) */
  folderName?: string;
}

/**
 * StepOverview - Grid view of all steps for navigation
 *
 * Shows each step as a card with the last substep's image as preview.
 */
export function StepOverview({ onStepSelect, useRawVideo = false, folderName }: StepOverviewProps) {
  const { t } = useTranslation();
  const { resolvedResolution } = usePreferredResolution();
  const data = useViewerData();

  // Get sorted steps
  const sortedSteps = useMemo(() => {
    if (!data?.steps) return [];
    return sortedValues(data.steps, byStepNumber);
  }, [data?.steps]);

  // Check for unassigned substeps (editor-only Step 0)
  const unassignedSubsteps = useMemo(() => {
    if (!useRawVideo || !data) return [];
    return getUnassignedSubsteps(data);
  }, [data, useRawVideo]);

  // Build preview data for each step (last substep's image)
  const stepsWithPreview = useMemo(() => {
    if (!data) return [];

    const buildStepPreview = (step: { id: string; stepNumber: number; title: string | null; description: string | null; substepIds: string[]; assemblyId?: string | null }) => {
      // Get substeps sorted by order
      const substeps = sortSubstepsByVideoFrame(
        step.substepIds.map((id) => data.substeps[id]).filter(Boolean),
        buildSortData(data),
      );

      // Get the last substep
      const lastSubstep = substeps[substeps.length - 1];

      let previewAreaId: string | null = null;
      let previewLocalPath: string | null = null;
      let frameCaptureData: FrameCaptureData | null = null;

      if (lastSubstep) {
        // Get first image of last substep
        const firstImageRowId = lastSubstep.imageRowIds[0];
        const imageRow = firstImageRowId ? data.substepImages[firstImageRowId] : null;
        const area = imageRow ? data.videoFrameAreas[imageRow.videoFrameAreaId] : null;

        if (area) {
          previewAreaId = area.id;
          previewLocalPath = area.localPath ?? null;
        }

        // Resolve raw frame capture data for Editor preview
        if (useRawVideo && folderName) {
          frameCaptureData = resolveRawFrameCapture(area, data.videos, folderName);
        }
      }

      return {
        id: step.id,
        order: step.stepNumber,
        title: step.title,
        description: step.description,
        substepCount: substeps.length,
        assemblyId: step.assemblyId ?? null,
        previewAreaId,
        previewLocalPath,
        frameCaptureData,
      };
    };

    const result = sortedSteps.map(buildStepPreview);

    // Append virtual "Unassigned" step for unassigned substeps (editor-only)
    if (unassignedSubsteps.length > 0) {
      const lastOrder = result.length > 0 ? result[result.length - 1].order : 0;
      const unassignedStep = buildStepPreview({
        id: UNASSIGNED_STEP_ID,
        stepNumber: lastOrder + 1,
        title: t('hierarchy.unassigned', 'Unassigned'),
        description: null,
        substepIds: unassignedSubsteps.map((s) => s.id),
      });
      result.push(unassignedStep);
    }

    return result;
  }, [sortedSteps, data, useRawVideo, folderName, unassignedSubsteps]);

  // Group steps by assembly
  const { sortedAssemblies, assemblyStepsMap, unassignedSteps, hasAssemblies } = useMemo(() => {
    if (!data) {
      return { sortedAssemblies: [], assemblyStepsMap: new Map(), unassignedSteps: [], hasAssemblies: false };
    }

    // Get assemblies sorted by order
    const assemblies = sortedValues(data.assemblies, byOrder);
    const hasAnyAssemblies = assemblies.length > 0;

    // Group steps by assemblyId
    const stepsByAssembly = new Map<string, typeof stepsWithPreview>();
    const noAssemblySteps: typeof stepsWithPreview = [];

    for (const step of stepsWithPreview) {
      if (step.assemblyId) {
        const existing = stepsByAssembly.get(step.assemblyId) || [];
        existing.push(step);
        stepsByAssembly.set(step.assemblyId, existing);
      } else {
        noAssemblySteps.push(step);
      }
    }

    return {
      sortedAssemblies: assemblies,
      assemblyStepsMap: stepsByAssembly,
      unassignedSteps: noAssemblySteps,
      hasAssemblies: hasAnyAssemblies,
    };
  }, [data, stepsWithPreview]);

  if (stepsWithPreview.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--color-text-muted)]">
        <p>{t('instructionView.noSteps', 'No steps available')}</p>
      </div>
    );
  }

  // Check if any assembly actually has steps assigned
  const hasAssignedSteps = sortedAssemblies.some(
    (assembly) => (assemblyStepsMap.get(assembly.id)?.length ?? 0) > 0
  );

  // Use grouped layout only if there are assemblies with assigned steps
  const useGroupedLayout = hasAssemblies && hasAssignedSteps;

  return (
    <div className="h-full overflow-y-auto scrollbar-subtle p-4 sm:p-6">
      {useGroupedLayout ? (
        // Grouped layout: Steps organized by Assembly
        <div className="flex flex-col gap-6">
          {/* Assembly Sections */}
          {sortedAssemblies.map((assembly) => {
            const steps = assemblyStepsMap.get(assembly.id) || [];
            if (steps.length === 0) return null;

            return (
              <AssemblySection
                key={assembly.id}
                assembly={assembly}
                steps={steps}
                onStepSelect={onStepSelect}
                useRawVideo={useRawVideo}
              />
            );
          })}

          {/* Unassigned Steps Section */}
          {unassignedSteps.length > 0 && (
            <UnassignedSection
              steps={unassignedSteps}
              onStepSelect={onStepSelect}
              useRawVideo={useRawVideo}
            />
          )}
        </div>
      ) : (
        // Flat layout: No assemblies or no assigned steps
        <div
          className="grid gap-4 sm:gap-6"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(20rem, 1fr))',
          }}
        >
          {stepsWithPreview.map((step) => (
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
      )}
    </div>
  );
}
