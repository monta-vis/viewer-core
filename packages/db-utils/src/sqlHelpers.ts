import type Database from "better-sqlite3";
import type { TableInfo } from "./types.js";

const VALID_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * Validate that a string is a safe SQL identifier.
 * Throws if the name contains characters that could enable SQL injection.
 */
export function assertValidIdentifier(name: string): void {
  if (!VALID_IDENTIFIER.test(name)) {
    throw new Error(`Invalid SQL identifier: ${name}`);
  }
}

/**
 * Get column names and primary key columns for a table via PRAGMA table_info.
 * Results are cached in the provided cache object.
 */
export function getTableInfo(
  db: Database.Database,
  table: string,
  cache: Record<string, TableInfo>,
): TableInfo {
  if (cache[table]) return cache[table];

  assertValidIdentifier(table);

  const info = db.pragma(`table_info("${table}")`) as Array<{
    name: string;
    pk: number;
  }>;

  const result: TableInfo = {
    columns: new Set(info.map((c) => c.name)),
    pkColumns: info
      .filter((c) => c.pk > 0)
      .sort((a, b) => a.pk - b.pk)
      .map((c) => c.name),
  };

  cache[table] = result;
  return result;
}

/**
 * Convert a JS value to a SQLite-compatible value.
 * - boolean → 0/1
 * - undefined → null
 * - everything else passes through
 */
export function toSqliteValue(val: unknown): unknown {
  if (typeof val === "boolean") return val ? 1 : 0;
  if (val === undefined) return null;
  return val ?? null;
}
