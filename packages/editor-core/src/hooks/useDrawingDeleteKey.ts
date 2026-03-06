import { useEffect } from 'react';

/**
 * Registers a global Delete key handler that deletes the currently selected drawing.
 * Skips deletion when the user is typing in an input, textarea, or contenteditable element.
 */
export function useDrawingDeleteKey(
  enabled: boolean,
  selectedDrawingId: string | null | undefined,
  onDelete: (id: string) => void,
) {
  useEffect(() => {
    if (!enabled || !selectedDrawingId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedDrawingId) {
        const target = e.target as HTMLElement;
        if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;
        onDelete(selectedDrawingId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, selectedDrawingId, onDelete]);
}
