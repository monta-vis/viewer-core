import type { en } from './en';

/** Recursively widen string literals to `string` while preserving object structure */
type Widen<T> = T extends string
  ? string
  : T extends Record<string, unknown>
    ? { [K in keyof T]: Widen<T[K]> }
    : T;

/** Type derived from the English translations — all languages must match this structure */
export type TranslationNamespaces = Widen<typeof en>;
