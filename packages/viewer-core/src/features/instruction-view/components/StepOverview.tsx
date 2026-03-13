import { type ReactNode, cloneElement, isValidElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';

import { UNASSIGNED_STEP_ID, sortSubstepsByVideoFrame, buildSortData, type Assembly } from '@/features/instruction';
import { useViewerData } from '../context';
import { sortedValues, byOrder, byStepNumber } from '@/lib/sortedValues';
import { StepOverviewCard } from './StepOverviewCard';
import { AssemblySection, UnassignedSection, type StepWithPreview, type SubstepPreview } from './AssemblySection';
import { useMediaResolverOptional } from '@/lib/MediaResolverContext';
import type { ResolvedImage } from '@/lib/mediaResolver';
import { buildMediaUrl, MediaPaths } from '@/lib/media';
import { getUnassignedSubsteps } from '../utils/getUnassignedSubsteps';
import { PartToolSearchBar } from './PartToolSearchBar';
import { SubstepPreviewCard } from './SubstepPreviewCard';
import { InstructionHeroBanner } from './InstructionHeroBanner';
import { usePartToolStepMap } from '../hooks/usePartToolStepMap';

export interface StepOverviewEditCallbacks {
  onAddAssembly?: () => void;
  onDeleteAssembly?: (assemblyId: string) => void;
  onRenameAssembly?: (assemblyId: string, title: string) => void;
  onMoveStepToAssembly?: (stepId: string, assemblyId: string | null) => void;
  onRenameStep?: (stepId: string, title: string) => void;
  onDeleteStep?: (stepId: string) => void;
  onReorderAssembly?: (assemblyId: string, newIndex: number) => void;
  /** Wraps the assembly list with DnD reordering (injected by editor-core) */
  renderAssemblyList?: (
    assemblies: Assembly[],
    renderAssembly: (assembly: Assembly) => ReactNode,
  ) => ReactNode;
  /** Render prop for preview image upload button on step cards (injected by editor-core via app shell) */
  renderPreviewUpload?: (stepId: string) => ReactNode;
  /** Render prop for assembly preview image upload button (injected by editor-core via app shell) */
  renderAssemblyPreviewUpload?: (assemblyId: string) => ReactNode;
  /** Wraps all assembly sections with unified DnD context. When present, replaces renderAssemblyList. */
  renderStepDndWrapper?: (
    containers: Array<{ containerId: string; stepIds: string[] }>,
    children: ReactNode,
    options?: {
      assemblyIds?: string[];
      substepContainers?: Array<{ containerId: string; substepIds: string[] }>;
    },
  ) => ReactNode;
  /** Wraps a step grid with sortable context (editor-core). */
  renderSortableStepGrid?: (
    containerId: string,
    steps: StepWithPreview[],
    renderStep: (step: StepWithPreview) => ReactNode,
  ) => ReactNode;
  /** Wraps an assembly section with a sortable wrapper for DnD reordering by header handle. */
  renderSortableAssembly?: (
    assemblyId: string,
    children: (props: { dragHandleProps: { listeners: Record<string, unknown> | undefined; attributes: Record<string, unknown> }; isDragging: boolean }) => ReactNode,
  ) => ReactNode;
  /** Wraps a step's substep previews with sortable context (per step container). */
  renderSortableSubstepGrid?: (
    containerId: string,
    substeps: SubstepPreview[],
    renderSubstep: (substep: SubstepPreview) => ReactNode,
  ) => ReactNode;
  /** Renders a droppable zone for collapsed steps so substeps can be dropped onto them. */
  renderSubstepDropZone?: (stepId: string) => ReactNode;
  /** Called when a substep should be deleted */
  onDeleteSubstep?: (substepId: string) => void;
  /** Render prop for instruction cover image upload button (injected by editor-core via app shell) */
  renderCoverImageUpload?: () => ReactNode;
}

interface StepOverviewProps {
  /** Called when a step is selected */
  onStepSelect: (stepId: string) => void;
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
export function StepOverview({ onStepSelect, editMode = false, editCallbacks, activeStepId }: StepOverviewProps) {
  const { t } = useTranslation();
  const data = useViewerData();
  const resolver = useMediaResolverOptional();
  const isRawMode = resolver?.mode === 'raw';
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [filteredPartToolId, setFilteredPartToolId] = useState<string | null>(null);
  const [expandedStepIds, setExpandedStepIds] = useState<Set<string>>(new Set());
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

  const handleExpandToggle = useCallback((stepId: string) => {
    setExpandedStepIds((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  }, []);

  // Get sorted steps
  const sortedSteps = useMemo(() => {
    if (!data?.steps) return [];
    return sortedValues(data.steps, byStepNumber);
  }, [data?.steps]);

  // Check for unassigned substeps (editor-only Step 0)
  const unassignedSubsteps = useMemo(() => {
    if (!isRawMode || !data) return [];
    return getUnassignedSubsteps(data);
  }, [data, isRawMode]);

  // Build preview data for each step (last substep's image)
  const isEditMode = !!editCallbacks;
  const stepsWithPreview = useMemo(() => {
    if (!data) return [];

    const resolveAreaImage = (areaId: string | null): ResolvedImage | null => {
      if (!areaId || !resolver) return null;
      return resolver.resolveImage(areaId);
    };

    const buildStepPreview = (step: { id: string; stepNumber: number; title: string | null; description: string | null; substepIds: string[]; assemblyId?: string | null }) => {
      // In edit mode, preserve substepIds order (manual reorder); in view mode, sort by video frame
      const rawSubsteps = step.substepIds.map((id) => data.substeps[id]).filter(Boolean);
      const substeps = isEditMode
        ? rawSubsteps
        : sortSubstepsByVideoFrame(rawSubsteps, buildSortData(data));

      // Get the last substep
      const lastSubstep = substeps[substeps.length - 1];

      let image: ResolvedImage | null = null;

      // Check for explicit step preview override via videoFrameAreaId
      const stepData = data.steps[step.id];
      if (stepData?.videoFrameAreaId) {
        image = resolveAreaImage(stepData.videoFrameAreaId);
      } else if (lastSubstep) {
        // Fallback: Get first image of last substep
        const firstImageRowId = lastSubstep.imageRowIds[0];
        const imageRow = firstImageRowId ? data.substepImages[firstImageRowId] : null;
        const areaId = imageRow?.videoFrameAreaId ?? null;
        image = resolveAreaImage(areaId);
      }

      // Build compact substep preview data
      const substepPreviews: SubstepPreview[] = substeps.map((sub, idx) => {
        const firstImageRowId = sub.imageRowIds[0];
        const imageRow = firstImageRowId ? data.substepImages[firstImageRowId] : null;
        const areaId = imageRow?.videoFrameAreaId ?? null;

        return {
          id: sub.id,
          order: idx + 1,
          title: sub.title ?? null,
          image: resolveAreaImage(areaId),
        };
      });

      return {
        id: step.id,
        order: step.stepNumber,
        title: step.title,
        description: step.description,
        substepCount: substeps.length,
        assemblyId: step.assemblyId ?? null,
        image,
        substepPreviews,
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
  }, [sortedSteps, data, resolver, unassignedSubsteps, isEditMode]);

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

  // Refs for scroll lookup — avoids triggering the effect on data changes
  const stepsWithPreviewRef = useRef(stepsWithPreview);
  stepsWithPreviewRef.current = stepsWithPreview;
  const assemblyStepsMapRef = useRef(assemblyStepsMap);
  assemblyStepsMapRef.current = assemblyStepsMap;

  // Auto-scroll to the active step when the component mounts / activeStepId changes.
  // When the active step is the first step of its assembly, scroll to the assembly
  // header instead so the user can see which assembly they're in.
  useEffect(() => {
    if (!activeStepId) return;

    const handle = requestAnimationFrame(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      let target: Element | null = null;

      // Check if active step is the first step of its assembly
      const activeStep = stepsWithPreviewRef.current.find((s) => s.id === activeStepId);
      if (activeStep?.assemblyId) {
        const assemblySteps = assemblyStepsMapRef.current.get(activeStep.assemblyId);
        if (assemblySteps && assemblySteps.length > 0 && assemblySteps[0].id === activeStepId) {
          target = container.querySelector(`[data-assembly-id="${CSS.escape(activeStep.assemblyId)}"]`);
        }
      }

      if (!target) {
        target = container.querySelector(`[data-step-id="${CSS.escape(activeStepId)}"]`);
      }

      target?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });

    return () => cancelAnimationFrame(handle);
  }, [activeStepId]);

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

  const resolveAssemblyImageUrl = useCallback((assembly: Assembly): string | null => {
    if (!data || !resolver || !assembly.videoFrameAreaId) return null;
    const img = resolver.resolveImage(assembly.videoFrameAreaId);
    if (img?.kind === 'url') return img.url;
    if (img?.kind === 'frameCapture' && resolver.folderName) {
      return buildMediaUrl(resolver.folderName, MediaPaths.frame(assembly.videoFrameAreaId));
    }
    return null;
  }, [data, resolver]);

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

  // Resolve instruction cover image for hero banner
  const instructionHero = useMemo(() => {
    if (!data) return null;

    let image: ResolvedImage | null = null;

    // Primary: coverImageAreaId → videoFrameArea
    if (data.coverImageAreaId && resolver) {
      image = resolver.resolveImage(data.coverImageAreaId);
    }

    // Fallback: instructionPreviewImageId (static asset path)
    if (!image && data.instructionPreviewImageId) {
      image = { kind: 'url', url: data.instructionPreviewImageId };
    }

    return {
      image,
      instructionName: data.instructionName,
      articleNumber: data.articleNumber ?? null,
    };
  }, [data, resolver]);

  // Build containers array for DnD wrapper
  const dndContainers = useMemo(() => [
    ...filteredAssemblies.map((a) => ({
      containerId: a.id,
      stepIds: (filteredAssemblyStepsMap.get(a.id) ?? []).map((s: { id: string }) => s.id),
    })),
    ...(visibleUnassigned.length > 0
      ? [{ containerId: 'unassigned', stepIds: visibleUnassigned.map((s: { id: string }) => s.id) }]
      : []),
  ], [filteredAssemblies, filteredAssemblyStepsMap, visibleUnassigned]);

  // Assembly IDs for DnD reordering
  const assemblyIds = useMemo(
    () => filteredAssemblies.map((a) => a.id),
    [filteredAssemblies],
  );

  // Build substep containers — include ALL steps so collapsed steps are valid drop targets
  const substepContainers = useMemo(() =>
    stepsWithPreview.map((step) => ({
      containerId: step.id,
      substepIds: expandedStepIds.has(step.id)
        ? (step.substepPreviews?.map((sub) => sub.id) ?? [])
        : [],
    })),
    [stepsWithPreview, expandedStepIds],
  );

  const renderAssemblySectionContent = useCallback(
    (assembly: Assembly, dragHandleProps?: { listeners: Record<string, unknown> | undefined; attributes: Record<string, unknown> }) => (
      <AssemblySection
        key={assembly.id}
        assembly={assembly}
        steps={filteredAssemblyStepsMap.get(assembly.id) ?? []}
        onStepSelect={onStepSelect}
        editMode={editMode}
        allowEmpty={editMode}
        allSteps={editMode ? stepsWithPreview : undefined}
        onDeleteAssembly={editCallbacks?.onDeleteAssembly}
        onRenameAssembly={editCallbacks?.onRenameAssembly}
        onMoveStepToAssembly={editCallbacks?.onMoveStepToAssembly}
        onRenameStep={editCallbacks?.onRenameStep}
        onDeleteStep={editCallbacks?.onDeleteStep}
        renderPreviewUpload={editCallbacks?.renderPreviewUpload}
        renderAssemblyPreviewUpload={editCallbacks?.renderAssemblyPreviewUpload}
        renderSortableStepGrid={editCallbacks?.renderSortableStepGrid}
        assemblyImageUrl={resolveAssemblyImageUrl(assembly)}
        dragHandleProps={dragHandleProps}
        expandedStepIds={expandedStepIds}
        onExpandToggle={handleExpandToggle}
        renderSortableSubstepGrid={editCallbacks?.renderSortableSubstepGrid}
        renderSubstepDropZone={editCallbacks?.renderSubstepDropZone}
        onDeleteSubstep={editCallbacks?.onDeleteSubstep}
      />
    ),
    [filteredAssemblyStepsMap, onStepSelect, editMode, stepsWithPreview, editCallbacks, resolveAssemblyImageUrl, expandedStepIds, handleExpandToggle],
  );

  const renderAssemblySection = useCallback(
    (assembly: Assembly): ReactNode => {
      if (editCallbacks?.renderSortableAssembly) {
        const node = editCallbacks.renderSortableAssembly(assembly.id, (props) =>
          renderAssemblySectionContent(assembly, props.dragHandleProps),
        );
        // Ensure key on the DnD wrapper for React list rendering
        if (isValidElement(node) && node.key == null) {
          return cloneElement(node, { key: assembly.id });
        }
        return node;
      }
      return renderAssemblySectionContent(assembly);
    },
    [editCallbacks, renderAssemblySectionContent],
  );

  return (
    <div ref={scrollContainerRef} className="h-full overflow-y-auto scrollbar-subtle scroll-pt-20">
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
        {instructionHero && (
          <InstructionHeroBanner
            image={instructionHero.image}
            instructionName={instructionHero.instructionName}
            articleNumber={instructionHero.articleNumber}
            renderUpload={editCallbacks?.renderCoverImageUpload}
          />
        )}

        {useGroupedLayout ? (
          // Grouped layout: Steps organized by Assembly
          (() => {
            const assemblySections = editCallbacks?.renderStepDndWrapper
              // renderStepDndWrapper replaces renderAssemblyList (unified DndContext)
              ? null
              : editCallbacks?.renderAssemblyList
                ? editCallbacks.renderAssemblyList(filteredAssemblies, renderAssemblySection)
                : filteredAssemblies.map(renderAssemblySection);

            const innerContent = (
              <div className="flex flex-col gap-6">
                {assemblySections ?? filteredAssemblies.map(renderAssemblySection)}

                {/* Add Assembly button (edit mode only) — before Unassigned */}
                {editMode && !filteredStepIds && (
                  <button
                    type="button"
                    onClick={() => editCallbacks?.onAddAssembly?.()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-[var(--color-border)] rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-base)] hover:border-[var(--color-text-muted)] transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {t('instructionView.addAssembly', 'Add assembly')}
                    </span>
                  </button>
                )}

                {/* Unassigned Steps Section */}
                {visibleUnassigned.length > 0 && (
                  <UnassignedSection
                    steps={visibleUnassigned}
                    onStepSelect={onStepSelect}
                    editMode={editMode}
                    onMoveStepToAssembly={editCallbacks?.onMoveStepToAssembly}
                    onRenameStep={editCallbacks?.onRenameStep}
                    onDeleteStep={editCallbacks?.onDeleteStep}
                    renderPreviewUpload={editCallbacks?.renderPreviewUpload}
                    renderSortableStepGrid={editCallbacks?.renderSortableStepGrid}
                  />
                )}
              </div>
            );

            return editCallbacks?.renderStepDndWrapper
              ? editCallbacks.renderStepDndWrapper(dndContainers, innerContent, {
                  assemblyIds,
                  substepContainers: substepContainers.length > 0 ? substepContainers : undefined,
                })
              : innerContent;
          })()
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
                image={step.image}
                onClick={() => onStepSelect(step.id)}
                editMode={editMode}
                onRenameStep={editCallbacks?.onRenameStep}
                onDeleteStep={editCallbacks?.onDeleteStep}
                renderPreviewUpload={editCallbacks?.renderPreviewUpload}
                expanded={expandedStepIds.has(step.id)}
                onExpandToggle={handleExpandToggle}
                renderSubstepDropZone={editCallbacks?.renderSubstepDropZone}
              >
                {step.substepPreviews && step.substepPreviews.length > 0 && (
                  editCallbacks?.renderSortableSubstepGrid
                    ? editCallbacks.renderSortableSubstepGrid(
                        step.id,
                        step.substepPreviews,
                        (sub) => (
                          <SubstepPreviewCard
                            key={sub.id}
                            substepId={sub.id}
                            order={sub.order}
                            title={sub.title}
                            image={sub.image}
                            onClick={() => onStepSelect(step.id)}
                            editMode={editMode}
                            onDeleteSubstep={editCallbacks?.onDeleteSubstep}
                          />
                        ),
                      )
                    : (
                      <div
                        className="grid gap-2 p-3"
                        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(6rem, 1fr))' }}
                      >
                        {step.substepPreviews.map((sub) => (
                          <SubstepPreviewCard
                            key={sub.id}
                            substepId={sub.id}
                            order={sub.order}
                            title={sub.title}
                            image={sub.image}
                            onClick={() => onStepSelect(step.id)}
                            editMode={editMode}
                            onDeleteSubstep={editCallbacks?.onDeleteSubstep}
                          />
                        ))}
                      </div>
                    )
                )}
              </StepOverviewCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
