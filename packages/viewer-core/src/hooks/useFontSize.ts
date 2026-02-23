import { useState, useCallback, useEffect } from 'react';

export type FontSize = 'small' | 'medium' | 'large';

const FONT_SIZE_STORAGE_KEY = 'montavis-font-size';
const VALID_SIZES: FontSize[] = ['small', 'medium', 'large'];

const CLASS_MAP: Record<FontSize, string | null> = {
  small: 'font-size-small',
  medium: null,
  large: 'font-size-large',
};

function getStoredFontSize(): FontSize {
  if (typeof window === 'undefined') return 'medium';
  const stored = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
  if (stored && VALID_SIZES.includes(stored as FontSize)) {
    return stored as FontSize;
  }
  return 'medium';
}

function applyFontSizeClass(size: FontSize) {
  const root = document.documentElement;
  root.classList.remove('font-size-small', 'font-size-large');
  const cls = CLASS_MAP[size];
  if (cls) root.classList.add(cls);
}

export function useFontSize() {
  const [fontSize, setFontSizeState] = useState<FontSize>(getStoredFontSize);

  const setFontSize = useCallback((newSize: FontSize) => {
    setFontSizeState(newSize);
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, newSize);
    applyFontSizeClass(newSize);
  }, []);

  // Apply on mount
  useEffect(() => {
    applyFontSizeClass(fontSize);
  }, [fontSize]);

  return { fontSize, setFontSize };
}
