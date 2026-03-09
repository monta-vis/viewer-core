import type { InstructionTheme } from '@monta-vis/viewer-core';

/** Read URL search params once. */
export const urlParams = new URLSearchParams(window.location.search);

export function getUrlLanguage(): string | null {
  return urlParams.get('lang');
}

export function getUrlMode(): InstructionTheme {
  const mode = urlParams.get('mode');
  if (mode === 'dark') return 'dark';
  return 'light'; // default: light
}

export function getUrlPrimary(): string | null {
  return urlParams.get('primary');
}

export function getUrlAutostart(): boolean {
  return urlParams.get('autostart') === 'true';
}

export function getUrlBg(): string | null {
  return urlParams.get('bg');
}

export function getUrlTutorial(): boolean {
  return urlParams.get('tutorial') === 'true';
}

export function getUrlFullscreen(params: URLSearchParams = urlParams): boolean {
  return params.get('fullscreen') !== 'false';
}

export function getUrlTextSize(params: URLSearchParams = urlParams): 'small' | 'large' | null {
  const val = params.get('textsize');
  if (val === 'large' || val === 'small') return val;
  return null;
}

/** Stable values derived from URL / iframe context — never change at runtime. */
export const fullscreen = getUrlFullscreen();
export const tutorial = getUrlTutorial();
export const textSize = getUrlTextSize();
export const textSizeLarge = textSize === 'large';
export const isEmbedded = window.parent !== window;
