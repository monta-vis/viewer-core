import type Database from "better-sqlite3";
import fs from "fs";

// ---------------------------------------------------------------------------
// Shared helpers used across export modules
// ---------------------------------------------------------------------------

export interface RowWithId {
  id: string;
  [key: string]: unknown;
}

/** Convert an array of rows to a map keyed by row ID. */
export function keyById(rows: RowWithId[]): Record<string, RowWithId> {
  const map: Record<string, RowWithId> = {};
  for (const row of rows) map[row.id] = row;
  return map;
}

/** Group row IDs by a foreign-key column (e.g. step_id). */
export function groupIds(
  rows: RowWithId[],
  foreignKey: string,
): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const row of rows) {
    const fk = row[foreignKey] as string;
    if (!fk) continue;
    if (!map[fk]) map[fk] = [];
    map[fk].push(row.id);
  }
  return map;
}

/** Remove special characters from a filename, keeping alphanumerics, dashes, dots, underscores, spaces. */
export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-.\s]/g, "").trim() || "instruction";
}

export interface InstructionMeta {
  id: string;
  name: string;
  revision: number;
  updated_at: string;
}

/** Read core instruction fields from a project's DB. Returns null on failure. */
export function readInstructionMeta(
  dbPath: string,
  DatabaseConstructor: typeof Database,
): InstructionMeta | null {
  try {
    const db = new DatabaseConstructor(dbPath, { readonly: true });
    const row = db
      .prepare("SELECT id, name, revision, updated_at FROM instructions LIMIT 1")
      .get() as InstructionMeta | undefined;
    db.close();
    return row ?? null;
  } catch {
    return null;
  }
}

/** Copy a DB file and clear all *_audit tables in the copy. */
export function createCleanedDbCopy(
  srcPath: string,
  destPath: string,
  DatabaseConstructor: typeof Database,
): void {
  fs.copyFileSync(srcPath, destPath);
  const db = new DatabaseConstructor(destPath);
  const auditTables = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%\\_audit' ESCAPE '\\'",
    )
    .all() as { name: string }[];
  for (const { name } of auditTables) {
    if (!/^[a-zA-Z0-9_]+$/.test(name)) continue;
    db.exec(`DELETE FROM "${name}"`);
  }
  db.close();
}
