import type Database from "better-sqlite3";
import { assertValidIdentifier } from "./sqlHelpers.js";

/** Get column names from a table via PRAGMA table_info. */
export function dbColumns(db: Database.Database, table: string): string[] {
  assertValidIdentifier(table);
  return (db.pragma(`table_info("${table}")`) as Array<{ name: string }>).map(
    (c) => c.name,
  );
}

/** Check if a column exists in a table. */
export function hasColumn(
  db: Database.Database,
  table: string,
  column: string,
): boolean {
  return dbColumns(db, table).includes(column);
}

/** Check if a table exists (has at least one column). */
export function dbTableExists(db: Database.Database, table: string): boolean {
  assertValidIdentifier(table);
  return (
    (db.pragma(`table_info("${table}")`) as Array<{ name: string }>).length > 0
  );
}
