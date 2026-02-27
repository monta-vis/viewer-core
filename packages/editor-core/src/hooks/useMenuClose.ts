import { useEffect, useCallback } from 'react';
import type { RefObject } from 'react';

/**
 * Hook to detect clicks outside AND Escape key presses.
 * Useful for dropdowns, modals, and menus.
 *
 * @param ref - React ref to the element to monitor
 * @param onClose - Callback fired when click outside or Escape pressed
 * @param isEnabled - Whether the hook is active (default: true)
 */
export function useMenuClose(
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
  isEnabled: boolean = true
): void {
  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    },
    [ref, onClose]
  );

  const handleEscape = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!isEnabled) return;

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isEnabled, handleClickOutside, handleEscape]);
}
