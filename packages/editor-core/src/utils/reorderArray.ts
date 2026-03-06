/**
 * Reorder a sorted array by moving an item from its current position to newIndex.
 * Returns the new array, or null if the item wasn't found or position didn't change.
 */
export function reorderArray<T extends { id: string }>(
  items: T[],
  draggedId: string,
  newIndex: number,
): T[] | null {
  const oldIndex = items.findIndex(item => item.id === draggedId);
  if (oldIndex === -1 || oldIndex === newIndex) return null;

  const reordered = [...items];
  const [removed] = reordered.splice(oldIndex, 1);
  reordered.splice(newIndex, 0, removed);
  return reordered;
}
