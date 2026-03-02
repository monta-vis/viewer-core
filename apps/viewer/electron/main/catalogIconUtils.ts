/**
 * Parse a composite icon ID ("catalogName/filename") into its parts.
 */
export function parseIconId(iconId: string): { catalogName: string; filename: string } | null {
  const slashIdx = iconId.indexOf("/");
  if (slashIdx <= 0 || slashIdx >= iconId.length - 1) return null;
  const catalogName = iconId.slice(0, slashIdx);
  const filename = iconId.slice(slashIdx + 1);
  // Reject path traversal: no extra slashes, backslashes, or ".."
  if (filename.includes("/") || filename.includes("\\") || filename.includes("..")) return null;
  if (catalogName.includes("\\") || catalogName.includes("..")) return null;
  return { catalogName, filename };
}
