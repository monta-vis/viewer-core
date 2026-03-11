/**
 * SortableStepGrid
 *
 * Unified DnD components for step reordering within and across assemblies.
 * Uses a single @dnd-kit DndContext to avoid nested context conflicts.
 *
 * StepDndProvider — wraps all assemblies with one DndContext
 * SortableStepContainer — wraps a single assembly's step grid with SortableContext
 */

import { type ReactNode, memo, useCallback, useMemo } from 'react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
  children: ReactNode;
}

export function StepDndProvider({
  containers,
  onReorder,
  onMove,
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

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;
      if (activeId === overId) return;

      const sourceContainer = stepToContainer.get(activeId);
      if (!sourceContainer) return;

      // Determine target container: either from the over item's container, or the over ID is a container itself
      let targetContainer = stepToContainer.get(overId);
      let targetIndex: number;

      if (targetContainer) {
        // Dropped over another step — find its index in the target container
        const targetStepIds = containers.find((c) => c.containerId === targetContainer)?.stepIds ?? [];
        targetIndex = targetStepIds.indexOf(overId);
        if (targetIndex === -1) targetIndex = targetStepIds.length;
      } else {
        // Dropped over a container (empty droppable area)
        targetContainer = overId;
        targetIndex = 0;
      }

      if (sourceContainer === targetContainer) {
        // Same container — reorder
        onReorder(activeId, sourceContainer, targetIndex);
      } else {
        // Different container — move
        onMove(activeId, targetContainer, targetIndex);
      }
    },
    [containers, stepToContainer, onReorder, onMove],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
    >
      {children}
    </DndContext>
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

const SortableStepItem = memo(function SortableStepItem<T>({
  id,
  item,
  renderItem,
}: {
  id: string;
  item: T;
  renderItem: (item: T) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

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
}) as <T>(props: { id: string; item: T; renderItem: (item: T) => ReactNode }) => ReactNode;

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
                <SortableStepItem key={id} id={id} item={item} renderItem={renderItem} />
              );
            })
          : emptyContent}
      </div>
    </SortableContext>
  );
}
