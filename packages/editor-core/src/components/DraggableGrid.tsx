import { type ReactNode, useCallback, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { clsx } from 'clsx';

interface DraggableGridProps<T> {
  items: T[];
  getItemId: (item: T) => string;
  onReorder: (id: string, newIndex: number) => void;
  onItemClick?: (id: string) => void;
  renderItem: (item: T, index: number, isDragging: boolean, isSelected: boolean) => ReactNode;
  selectedItemId?: string | null;
  className?: string;
  gap?: string;
}

interface SortableItemProps {
  id: string;
  index: number;
  item: unknown;
  renderItem: (item: unknown, index: number, isDragging: boolean, isSelected: boolean) => ReactNode;
  onItemClick?: (id: string) => void;
  isSelected: boolean;
}

function SortableItem({ id, index, item, renderItem, onItemClick, isSelected }: SortableItemProps) {
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
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => !isDragging && onItemClick?.(id)}
    >
      {renderItem(item, index, isDragging, isSelected)}
    </div>
  );
}

export function DraggableGrid<T>({
  items,
  getItemId,
  onReorder,
  onItemClick,
  renderItem,
  selectedItemId,
  className,
  gap = '0.5rem',
}: DraggableGridProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const newIndex = items.findIndex((item) => getItemId(item) === over.id);
    if (newIndex !== -1) {
      onReorder(active.id as string, newIndex);
    }
  }, [items, getItemId, onReorder]);

  const itemIds = useMemo(() => items.map(getItemId), [items, getItemId]);

  if (items.length === 0) return null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={itemIds} strategy={rectSortingStrategy}>
        <div className={clsx('flex flex-wrap', className)} style={{ gap }}>
          {items.map((item, index) => {
            const itemId = getItemId(item);
            return (
              <SortableItem
                key={itemId}
                id={itemId}
                index={index}
                item={item}
                renderItem={renderItem as (item: unknown, index: number, isDragging: boolean, isSelected: boolean) => ReactNode}
                onItemClick={onItemClick}
                isSelected={selectedItemId === itemId}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
