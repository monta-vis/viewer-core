import path from "path";

/**
 * Normalize a file path for safe comparison.
 * On Windows, paths are lowercased to handle case-insensitive file systems.
 */
export function normalizePath(p: string): string {
  return process.platform === "win32"
    ? path.resolve(p).toLowerCase()
    : path.resolve(p);
}

/**
 * Check whether `filePath` is strictly inside `baseDir`.
 * Uses trailing path separator to prevent prefix collisions
 * (e.g. `/home/julian` vs `/home/julianattacker`).
 */
export function isInsidePath(filePath: string, baseDir: string): boolean {
  const resolved = normalizePath(filePath);
  const base = normalizePath(baseDir);
  return resolved.startsWith(base + path.sep) || resolved === base;
}
