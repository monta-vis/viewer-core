/**
 * SortableStepGrid
 *
 * Unified DnD components for step, assembly, and substep reordering.
 * Uses a single @dnd-kit DndContext to avoid nested context conflicts.
 *
 * StepDndProvider — wraps all assemblies with one DndContext
 * SortableStepContainer — wraps a single assembly's step grid with SortableContext
 * SortableAssembly — wraps an assembly section with drag handle for header-only dragging
 * SortableSubstepContainer — wraps a step's substep grid with SortableContext
 */

import { type ReactNode, memo, useCallback, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type CollisionDetection,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ============================================
// Drag item type discriminator
// ============================================

type DndItemType = 'step' | 'assembly' | 'substep';

/** Prefix for assembly sortable IDs to avoid collision with step container droppable IDs */
const ASSEMBLY_SORT_PREFIX = 'asm-sort::';

// ============================================
// Custom collision detection for mixed entity types
// ============================================

interface MultiTypeCollisionConfig {
  stepToContainer: Map<string, string>;
  substepToContainer: Map<string, string>;
  containerIds: Set<string>;
  stepContainerIds: Set<string>;
  /** Injectable for testing; defaults to @dnd-kit closestCenter */
  closestCenterFn?: CollisionDetection;
}

/**
 * Creates a CollisionDetection function that filters droppables by the
 * type of the item being dragged, then delegates to closestCenter.
 *
 * - Assembly drag → only other assembly droppables (prefixed `asm-sort::`)
 * - Step drag → steps + container droppables + assembly sortables
 * - Substep drag → substeps + step container droppables
 */
export function createMultiTypeCollisionDetection({
  stepToContainer,
  substepToContainer,
  containerIds,
  stepContainerIds,
  closestCenterFn = closestCenter,
}: MultiTypeCollisionConfig): CollisionDetection {
  return (args) => {
    const dragType = (args.active.data.current?.type as DndItemType | undefined) ?? 'step';
    let filtered = args.droppableContainers;

    if (dragType === 'assembly') {
      filtered = args.droppableContainers.filter(
        (d) => typeof d.id === 'string' && d.id.startsWith(ASSEMBLY_SORT_PREFIX),
      );
    } else if (dragType === 'step') {
      filtered = args.droppableContainers.filter((d) => {
        const id = d.id as string;
        return (
          stepToContainer.has(id) ||
          containerIds.has(id) ||
          id.startsWith(ASSEMBLY_SORT_PREFIX)
        );
      });
    } else if (dragType === 'substep') {
      filtered = args.droppableContainers.filter((d) => {
        const id = d.id as string;
        return substepToContainer.has(id) || stepContainerIds.has(id);
      });
    }

    return closestCenterFn({ ...args, droppableContainers: filtered });
  };
}

// ============================================
// StepDndProvider — unified DndContext
// ============================================

export interface StepDndProviderProps {
  /** Step containers: assembly sections + optional unassigned */
  containers: Array<{ containerId: string; stepIds: string[] }>;
  /** Called when a step is reordered within the same container */
  onReorder: (stepId: string, containerId: string, newIndex: number) => void;
  /** Called when a step is moved to a different container */
  onMove: (stepId: string, targetContainerId: string, targetIndex: number) => void;
  /** Assembly IDs in order (for assembly DnD) */
  assemblyIds?: string[];
  /** Called when an assembly is reordered */
  onReorderAssembly?: (assemblyId: string, newIndex: number) => void;
  /** Substep containers for substep DnD */
  substepContainers?: Array<{ containerId: string; substepIds: string[] }>;
  /** Called when a substep is reordered within the same step */
  onReorderSubstep?: (substepId: string, containerId: string, newIndex: number) => void;
  /** Called when a substep is moved to a different step */
  onMoveSubstep?: (substepId: string, targetContainerId: string, targetIndex: number) => void;
  children: ReactNode;
}

export function StepDndProvider({
  containers,
  onReorder,
  onMove,
  assemblyIds,
  onReorderAssembly,
  substepContainers,
  onReorderSubstep,
  onMoveSubstep,
  children,
}: StepDndProviderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Build a lookup: stepId → containerId
  const stepToContainer = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of containers) {
      for (const id of c.stepIds) {
        map.set(id, c.containerId);
      }
    }
    return map;
  }, [containers]);

  // Build a lookup: substepId → containerId (stepId)
  const substepToContainer = useMemo(() => {
    const map = new Map<string, string>();
    if (substepContainers) {
      for (const c of substepContainers) {
        for (const id of c.substepIds) {
          map.set(id, c.containerId);
        }
      }
    }
    return map;
  }, [substepContainers]);

  // Build container ID sets for collision filtering
  const containerIdSet = useMemo(
    () => new Set(containers.map((c) => c.containerId)),
    [containers],
  );
  const stepContainerIdSet = useMemo(
    () => new Set((substepContainers ?? []).map((c) => c.containerId)),
    [substepContainers],
  );

  // Custom collision detection: filter droppables by drag type, then use closestCenter
  const collisionDetection = useMemo(
    () =>
      createMultiTypeCollisionDetection({
        stepToContainer,
        substepToContainer,
        containerIds: containerIdSet,
        stepContainerIds: stepContainerIdSet,
      }),
    [stepToContainer, substepToContainer, containerIdSet, stepContainerIdSet],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;
      if (activeId === overId) return;

      const activeType = (active.data.current?.type as DndItemType | undefined) ?? 'step';

      // ── Assembly drag ──
      if (activeType === 'assembly' && assemblyIds && onReorderAssembly) {
        const overType = (over.data.current?.type as DndItemType | undefined);

        let resolvedOverAssemblyId: string | undefined;

        if (overType === 'assembly') {
          // Dropped on another assembly sortable — strip prefix
          resolvedOverAssemblyId = typeof overId === 'string' && overId.startsWith(ASSEMBLY_SORT_PREFIX)
            ? overId.slice(ASSEMBLY_SORT_PREFIX.length)
            : overId;
        } else if (overType === 'step') {
          // Dropped on a step inside an assembly — resolve to parent assembly
          resolvedOverAssemblyId = stepToContainer.get(overId);
        }

        if (!resolvedOverAssemblyId) {
          console.warn('[SortableStepGrid] Assembly drag: could not resolve target assembly from over:', overId);
          return;
        }

        const realActiveId = typeof activeId === 'string' && activeId.startsWith(ASSEMBLY_SORT_PREFIX)
          ? activeId.slice(ASSEMBLY_SORT_PREFIX.length)
          : activeId;
        const newIndex = assemblyIds.indexOf(resolvedOverAssemblyId);
        if (newIndex === -1) return;
        onReorderAssembly(realActiveId as string, newIndex);
        return;
      }

      // ── Substep drag ──
      if (activeType === 'substep' && substepContainers) {
        const sourceContainer = substepToContainer.get(activeId);
        if (!sourceContainer) return;

        let targetContainer = substepToContainer.get(overId);
        let targetIndex: number;

        if (targetContainer) {
          const targetSubstepIds = substepContainers.find((c) => c.containerId === targetContainer)?.substepIds ?? [];
          targetIndex = targetSubstepIds.indexOf(overId);
          if (targetIndex === -1) targetIndex = targetSubstepIds.length;
        } else {
          // Dropped on a container droppable itself — append at end
          targetContainer = overId;
          const targetSubstepIds = substepContainers.find((c) => c.containerId === overId)?.substepIds ?? [];
          targetIndex = targetSubstepIds.length;
        }

        if (sourceContainer === targetContainer) {
          onReorderSubstep?.(activeId, sourceContainer, targetIndex);
        } else {
          onMoveSubstep?.(activeId, targetContainer, targetIndex);
        }
        return;
      }

      // ── Step drag (default) ──
      const sourceContainer = stepToContainer.get(activeId);
      if (!sourceContainer) return;

      let targetContainer = stepToContainer.get(overId);
      let targetIndex: number;

      if (targetContainer) {
        const targetStepIds = containers.find((c) => c.containerId === targetContainer)?.stepIds ?? [];
        targetIndex = targetStepIds.indexOf(overId);
        if (targetIndex === -1) targetIndex = targetStepIds.length;
      } else {
        // Dropped over a non-step element (container droppable or assembly sortable)
        const rawId = typeof overId === 'string' && overId.startsWith(ASSEMBLY_SORT_PREFIX)
          ? overId.slice(ASSEMBLY_SORT_PREFIX.length)
          : overId;
        targetContainer = rawId as string;
        targetIndex = containers.find(c => c.containerId === rawId)?.stepIds.length ?? 0;
      }

      if (sourceContainer === targetContainer) {
        onReorder(activeId, sourceContainer, targetIndex);
      } else {
        onMove(activeId, targetContainer, targetIndex);
      }
    },
    [containers, stepToContainer, onReorder, onMove, assemblyIds, onReorderAssembly, substepContainers, substepToContainer, onReorderSubstep, onMoveSubstep],
  );

  // Build combined assembly sortable items
  const assemblyItemIds = useMemo(
    () => (assemblyIds ?? []).map(id => `${ASSEMBLY_SORT_PREFIX}${id}`),
    [assemblyIds],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={assemblyItemIds} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

// ============================================
// SortableAssembly — drag handle for assembly reordering
// ============================================

export interface DragHandleProps {
  /** Spread onto the drag handle element */
  listeners: DraggableSyntheticListeners;
  /** Spread onto the drag handle element */
  attributes: DraggableAttributes;
}

export interface SortableAssemblyRenderProps {
  /** Props to spread on the drag handle element (e.g. GripVertical icon) */
  dragHandleProps: DragHandleProps;
  /** Whether the assembly is currently being dragged */
  isDragging: boolean;
}

export interface SortableAssemblyProps {
  /** Assembly ID */
  id: string;
  /** Render function receiving drag handle props */
  children: (props: SortableAssemblyRenderProps) => ReactNode;
}

export function SortableAssembly({ id, children }: SortableAssemblyProps) {
  const sortableId = `${ASSEMBLY_SORT_PREFIX}${id}`;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId, data: { type: 'assembly' as DndItemType } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children({
        dragHandleProps: {
          listeners,
          attributes,
        },
        isDragging,
      })}
    </div>
  );
}

// ============================================
// SortableStepContainer — per-assembly step grid
// ============================================

export interface SortableStepContainerProps<T> {
  /** Container ID (assembly ID or 'unassigned') */
  containerId: string;
  /** Items to render in this container */
  items: T[];
  /** Extract unique ID from item */
  getItemId: (item: T) => string;
  /** Render function for each item */
  renderItem: (item: T) => ReactNode;
  /** CSS class for the grid container */
  className?: string;
  /** Inline styles for the grid container */
  gridStyle?: React.CSSProperties;
  /** Content to show when container is empty */
  emptyContent?: ReactNode;
}

/** Shared sortable item wrapper for step and substep DnD items. */
const SortableItem = memo(function SortableItem<T>({
  id,
  item,
  type,
  renderItem,
}: {
  id: string;
  item: T;
  type: DndItemType;
  renderItem: (item: T) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, data: { type } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {renderItem(item)}
    </div>
  );
}) as <T>(props: { id: string; item: T; type: DndItemType; renderItem: (item: T) => ReactNode }) => ReactNode;

export function SortableStepContainer<T>({
  containerId,
  items,
  getItemId,
  renderItem,
  className,
  gridStyle,
  emptyContent,
}: SortableStepContainerProps<T>) {
  // Make the container itself a droppable target (for empty containers)
  const { setNodeRef } = useDroppable({ id: containerId });

  const itemIds = useMemo(() => items.map(getItemId), [items, getItemId]);

  return (
    <SortableContext items={itemIds} strategy={rectSortingStrategy}>
      <div ref={setNodeRef} className={className} style={gridStyle}>
        {items.length > 0
          ? items.map((item) => {
              const id = getItemId(item);
              return (
                <SortableItem key={id} id={id} item={item} type="step" renderItem={renderItem} />
              );
            })
          : emptyContent}
      </div>
    </SortableContext>
  );
}

// ============================================
// SortableSubstepContainer — per-step substep grid
// ============================================

export interface SortableSubstepContainerProps<T> {
  /** Container ID (step ID) */
  containerId: string;
  /** Items to render in this container */
  items: T[];
  /** Extract unique ID from item */
  getItemId: (item: T) => string;
  /** Render function for each item */
  renderItem: (item: T) => ReactNode;
  /** CSS class for the grid container */
  className?: string;
  /** Inline styles for the grid container */
  gridStyle?: React.CSSProperties;
}

export function SortableSubstepContainer<T>({
  containerId,
  items,
  getItemId,
  renderItem,
  className,
  gridStyle,
}: SortableSubstepContainerProps<T>) {
  const { setNodeRef } = useDroppable({ id: containerId });

  const itemIds = useMemo(() => items.map(getItemId), [items, getItemId]);

  return (
    <SortableContext items={itemIds} strategy={rectSortingStrategy}>
      <div ref={setNodeRef} className={className} style={gridStyle}>
        {items.map((item) => {
          const id = getItemId(item);
          return (
            <SortableItem key={id} id={id} item={item} type="substep" renderItem={renderItem} />
          );
        })}
      </div>
    </SortableContext>
  );
}

// ============================================
// SubstepDropZone — droppable target for collapsed steps
// ============================================

export interface SubstepDropZoneProps {
  /** Step ID to use as droppable container */
  stepId: string;
}

/**
 * SubstepDropZone — thin droppable indicator shown on collapsed steps in edit mode.
 * Allows dragging substeps to collapsed steps that don't have an expanded substep grid.
 */
export function SubstepDropZone({ stepId }: SubstepDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stepId });

  return (
    <div
      ref={setNodeRef}
      data-testid={`substep-drop-zone-${stepId}`}
      className={`mx-3 mb-2 rounded border-2 border-dashed transition-colors min-h-[2rem] flex items-center justify-center ${
        isOver
          ? 'border-[var(--color-secondary)] bg-[var(--color-secondary)]/10'
          : 'border-[var(--color-border)] opacity-50'
      }`}
    />
  );
}
