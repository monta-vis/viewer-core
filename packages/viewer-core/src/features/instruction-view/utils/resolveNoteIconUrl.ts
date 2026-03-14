import { safetyIconUrl } from '@/features/instruction';
import type { MediaResolver } from '@/lib/mediaResolver';

/**
 * Resolve a note's safety icon to a displayable URL.
 *
 * - Legacy filenames (`.png`, `.jpg`, `.gif`) → static asset via `safetyIconUrl`
 * - VFA UUIDs → `resolver.resolveImage()`, extract URL if `kind === 'url'`
 *
 * Returns `null` when the icon can't be resolved (missing resolver, frameCapture, unknown area).
 */
export function resolveNoteIconUrl(
  safetyIconId: string,
  resolver: MediaResolver | null,
): string | null {
  if (/\.(png|jpg|gif)$/i.test(safetyIconId)) {
    return safetyIconUrl(safetyIconId);
  }

  const resolved = resolver?.resolveImage(safetyIconId);
  return resolved?.kind === 'url' ? resolved.url : null;
}
