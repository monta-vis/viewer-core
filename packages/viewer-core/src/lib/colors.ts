import type { CSSProperties } from 'react';

/** Convert hex color (e.g. "3b82f6") to CSS custom property overrides for brand HSL. */
export function hexToBrandStyle(hex: string): CSSProperties | undefined {
  const cleaned = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return undefined;

  const r = parseInt(cleaned.slice(0, 2), 16) / 255;
  const g = parseInt(cleaned.slice(2, 4), 16) / 255;
  const b = parseInt(cleaned.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;

  let h = 0;
  let s = 0;
  if (d > 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }

  return {
    '--hue-brand': `${Math.round(h)}`,
    '--saturation-brand': `${Math.round(s * 100)}%`,
    '--lightness-brand': `${Math.round(l * 100)}%`,
  } as CSSProperties;
}

/** Convert hex color to CSS custom property overrides for dark-theme background HSL (hue + saturation only). */
export function hexToBgStyle(hex: string): CSSProperties | undefined {
  const cleaned = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return undefined;

  const r = parseInt(cleaned.slice(0, 2), 16) / 255;
  const g = parseInt(cleaned.slice(2, 4), 16) / 255;
  const b = parseInt(cleaned.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;

  let h = 0;
  let s = 0;
  if (d > 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }

  return {
    '--hue-bg': `${Math.round(h)}`,
    '--saturation-bg': `${Math.round(s * 100)}%`,
  } as CSSProperties;
}
