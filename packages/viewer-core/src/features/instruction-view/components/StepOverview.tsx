import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';

import { usePreferredResolution } from '@/hooks';
import { UNASSIGNED_STEP_ID, sortSubstepsByVideoFrame, buildSortData, type Assembly } from '@/features/instruction';
import { useViewerData } from '../context';
import { sortedValues, byOrder, byStepNumber } from '@/lib/sortedValues';
import { StepOverviewCard } from './StepOverviewCard';
import { AssemblySection, UnassignedSection, getStepPreviewUrl } from './AssemblySection';
import { resolveRawFrameCapture, type FrameCaptureData } from '../utils/resolveRawFrameCapture';
import { getUnassignedSubsteps } from '../utils/getUnassignedSubsteps';
import { PartToolSearchBar } from './PartToolSearchBar';
import { usePartToolStepMap } from '../hooks/usePartToolStepMap';

export interface StepOverviewEditCallbacks {
  onAddAssembly?: () => void;
  onDeleteAssembly?: (assemblyId: string) => void;
  onRenameAssembly?: (assemblyId: string, title: string) => void;
  onMoveStepToAssembly?: (stepId: string, assemblyId: string | null) => void;
  onReorderAssembly?: (assemblyId: string, newIndex: number) => void;
  /** Wraps the assembly list with DnD reordering (injected by editor-core) */
  renderAssemblyList?: (
    assemblies: Assembly[],
    renderAssembly: (assembly: Assembly) => ReactNode,
  ) => ReactNode;
}

interface StepOverviewProps {
  /** Called when a step is selected */
  onStepSelect: (stepId: string) => void;
  /** Use raw video frame capture instead of pre-rendered images. Default: false */
  useRawVideo?: boolean;
  /** Project folder name for mvis-media:// URLs (enables source video in Editor preview) */
  folderName?: string;
  /** Edit mode active */
  editMode?: boolean;
  /** Edit callbacks for assembly management */
  editCallbacks?: StepOverviewEditCallbacks;
  /** Currently visible step ID — used to auto-scroll when the drawer opens */
  activeStepId?: string | null;
}

/**
 * StepOverview - Grid view of all steps for navigation
 *
 * Shows each step as a card with the last substep's image as preview.
 */
export function StepOverview({ onStepSelect, useRawVideo = false, folderName, editMode = false, editCallbacks, activeStepId }: StepOverviewProps) {
  const { t } = useTranslation();
  const { resolvedResolution } = usePreferredResolution();
  const data = useViewerData();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [filteredPartToolId, setFilteredPartToolId] = useState<string | null>(null);
  const partToolStepMap = usePartToolStepMap();

  const allPartTools = useMemo(
    () => (data ? Object.values(data.partTools) : []),
    [data],
  );

  const selectedPartTool = useMemo(
    () => (filteredPartToolId && data ? data.partTools[filteredPartToolId] ?? null : null),
    [filteredPartToolId, data],
  );

  const filteredStepIds = useMemo<Set<string> | null>(() => {
    if (!filteredPartToolId) return null;
    return partToolStepMap.get(filteredPartToolId) ?? new Set();
  }, [filteredPartToolId, partToolStepMap]);

  const handlePartToolSelect = useCallback((partToolId: string) => {
    setFilteredPartToolId(partToolId);
  }, []);

  const handlePartToolClear = useCallback(() => {
    setFilteredPartToolId(null);
  }, []);

  // Auto-scroll to the active step when the component mounts / activeStepId changes
  useEffect(() => {
    if (!activeStepId) return;

    const handle = requestAnimationFrame(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const target = container.querySelector(`[data-step-id="${CSS.escape(activeStepId)}"]`);
      target?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });

    return () => cancelAnimationFrame(handle);
  }, [activeStepId]);

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

  if (stepsWithPreview.length === 0 && !editMode) {
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

  // In edit mode: always use grouped layout so assemblies are visible
  // In view mode: only group if assemblies exist with assigned steps
  const useGroupedLayout = editMode
    ? (hasAssemblies || stepsWithPreview.length === 0)
    : (hasAssemblies && hasAssignedSteps);

  // Filter assemblies and their steps by partTool filter
  const filteredAssemblies = useMemo(() => {
    if (!filteredStepIds) return sortedAssemblies;
    return sortedAssemblies.filter((a) => {
      const steps = assemblyStepsMap.get(a.id) ?? [];
      return steps.some((s: { id: string }) => filteredStepIds.has(s.id));
    });
  }, [sortedAssemblies, assemblyStepsMap, filteredStepIds]);

  const filteredAssemblyStepsMap = useMemo(() => {
    if (!filteredStepIds) return assemblyStepsMap;
    const map = new Map<string, typeof stepsWithPreview>();
    for (const [id, steps] of assemblyStepsMap) {
      map.set(id, steps.filter((s: { id: string }) => filteredStepIds.has(s.id)));
    }
    return map;
  }, [assemblyStepsMap, filteredStepIds]);

  // Apply partTool filter to steps
  const visibleSteps = useMemo(() => {
    if (!filteredStepIds) return stepsWithPreview;
    return stepsWithPreview.filter((s) => filteredStepIds.has(s.id));
  }, [stepsWithPreview, filteredStepIds]);

  // Apply partTool filter to unassigned steps
  const visibleUnassigned = useMemo(() => {
    if (!filteredStepIds) return unassignedSteps;
    return unassignedSteps.filter((s) => filteredStepIds.has(s.id));
  }, [unassignedSteps, filteredStepIds]);

  return (
    <div ref={scrollContainerRef} className="h-full overflow-y-auto scrollbar-subtle">
      {/* Sticky search bar */}
      {allPartTools.length > 0 && (
        <div className="sticky top-0 z-10 bg-[var(--color-bg-surface)] px-4 pt-4 pb-2 sm:px-6 sm:pt-6">
          <PartToolSearchBar
            partTools={allPartTools}
            selectedPartTool={selectedPartTool}
            onSelect={handlePartToolSelect}
            onClear={handlePartToolClear}
          />
        </div>
      )}

      <div className="px-4 pb-4 sm:px-6 sm:pb-6">
        {useGroupedLayout ? (
          // Grouped layout: Steps organized by Assembly
          <div className="flex flex-col gap-6">
            {/* Assembly Sections — wrap with DnD if renderAssemblyList provided */}
            {editCallbacks?.renderAssemblyList
              ? editCallbacks.renderAssemblyList(
                  filteredAssemblies,
                  (assembly) => (
                    <AssemblySection
                      assembly={assembly}
                      steps={filteredAssemblyStepsMap.get(assembly.id) ?? []}
                      onStepSelect={onStepSelect}
                      useRawVideo={useRawVideo}
                      editMode={editMode}
                      allowEmpty={editMode}
                      allSteps={editMode ? stepsWithPreview : undefined}
                      onDeleteAssembly={editCallbacks?.onDeleteAssembly}
                      onRenameAssembly={editCallbacks?.onRenameAssembly}
                      onMoveStepToAssembly={editCallbacks?.onMoveStepToAssembly}
                    />
                  ),
                )
              : filteredAssemblies.map((assembly) => (
                  <AssemblySection
                    key={assembly.id}
                    assembly={assembly}
                    steps={filteredAssemblyStepsMap.get(assembly.id) ?? []}
                    onStepSelect={onStepSelect}
                    useRawVideo={useRawVideo}
                    editMode={editMode}
                    allowEmpty={editMode}
                    allSteps={editMode ? stepsWithPreview : undefined}
                    onDeleteAssembly={editCallbacks?.onDeleteAssembly}
                    onRenameAssembly={editCallbacks?.onRenameAssembly}
                    onMoveStepToAssembly={editCallbacks?.onMoveStepToAssembly}
                  />
                ))
            }

            {/* Add Assembly button (edit mode only) — before Unassigned */}
            {editMode && !filteredStepIds && (
              <button
                type="button"
                onClick={() => editCallbacks?.onAddAssembly?.()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-[var(--color-border)] rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-base)] hover:border-[var(--color-text-muted)] transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {t('editorCore.addAssembly', 'Add assembly')}
                </span>
              </button>
            )}

            {/* Unassigned Steps Section */}
            {visibleUnassigned.length > 0 && (
              <UnassignedSection
                steps={visibleUnassigned}
                onStepSelect={onStepSelect}
                useRawVideo={useRawVideo}
                editMode={editMode}
                onMoveStepToAssembly={editCallbacks?.onMoveStepToAssembly}
              />
            )}
          </div>
        ) : (
          // Flat layout: No assemblies or no assigned steps
          <div
            className="grid gap-4 sm:gap-6"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(24rem, 1fr))',
            }}
          >
            {visibleSteps.map((step) => (
              <StepOverviewCard
                key={step.id}
                stepId={step.id}
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
    </div>
  );
}
