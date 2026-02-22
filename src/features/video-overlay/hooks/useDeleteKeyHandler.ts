import { useEffect } from 'react';

/**
 * Hook to handle DEL/Backspace key to delete selected items.
 * Used by AnnotationLayer and DrawingLayer.
 */
export function useDeleteKeyHandler(
  selectedId: string | null | undefined,
  onDelete: ((id: string) => void) | undefined
) {
  useEffect(() => {
    if (!selectedId || !onDelete) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDelete(selectedId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, onDelete]);
}
