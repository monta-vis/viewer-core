/** Shared compact button class constants for editor inline actions (1.75rem touch targets, desktop-only). */

export const ICON_BTN_CLASS = 'w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0';
export const EDIT_BTN_CLASS = `${ICON_BTN_CLASS} hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)]`;
export const DELETE_BTN_CLASS = `${ICON_BTN_CLASS} hover:bg-red-500/10 text-red-500`;
export const ADD_BTN_CLASS = `${ICON_BTN_CLASS} hover:bg-[var(--color-bg-hover)] text-[var(--color-secondary)]`;
export const SAVE_BTN_CLASS = `${ICON_BTN_CLASS} hover:bg-[var(--color-secondary)]/20 text-[var(--color-secondary)]`;
export const CANCEL_BTN_CLASS = `${ICON_BTN_CLASS} hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)]`;
