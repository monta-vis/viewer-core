import { useEffect } from 'react';

/**
 * Registers a global Delete key handler that deletes the currently selected drawing(s).
 * Skips deletion when the user is typing in an input, textarea, or contenteditable element.
 *
 * When selectedDrawingIds is provided and has >1 items, calls onDelete for each.
 * Otherwise falls back to deleting the single selectedDrawingId.
 */
export function useDrawingDeleteKey(
  enabled: boolean,
  selectedDrawingId: string | null | undefined,
  onDelete: (id: string) => void,
  selectedDrawingIds?: ReadonlySet<string>,
) {
  useEffect(() => {
    if (!enabled) return;

    const hasSelection = selectedDrawingIds
      ? selectedDrawingIds.size > 0
      : !!selectedDrawingId;

    if (!hasSelection) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete') {
        const target = e.target as HTMLElement;
        if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;

        if (selectedDrawingIds && selectedDrawingIds.size > 0) {
          // Trigger batch delete: onDelete(firstId) is enough because useDrawingState.handleDrawingDelete
          // reads the full selectedDrawingIds set via ref and deletes all selected items
          const firstId = Array.from(selectedDrawingIds)[0];
          if (firstId) onDelete(firstId);
        } else if (selectedDrawingId) {
          onDelete(selectedDrawingId);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, selectedDrawingId, onDelete, selectedDrawingIds]);
}
