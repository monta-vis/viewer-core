import type Database from "better-sqlite3";

/** Generic changes format — matches getChangedData() output from the Zustand store. */
export interface ProjectChanges {
  changed: Record<string, Record<string, unknown>[]>;
  deleted: Record<string, string[]>;
}

/** Audit change types. */
export type AuditChangeType = "create" | "update" | "delete";

/** Logger interface for optional structured logging. */
export interface Logger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

/** Configuration for saveProjectData — each app provides its own. */
export interface SaveConfig {
  /** Set of table names allowed for upsert/delete operations. */
  allowedTables: Set<string>;
  /** FK-safe delete order: child/junction tables first, parents last. */
  deleteOrder: string[];
  /** Map of data table → audit table. undefined = no audit. */
  auditTableMap?: Record<string, string>;
  /** Tables that need source_language backfill on insert. undefined = no backfill. */
  sourceLanguageBackfillTables?: string[];
  /** Whether to delete associated translations when deleting rows. Default: true. */
  cleanupTranslationsOnDelete?: boolean;
  /** Optional logger. */
  logger?: Logger;
}

/** Result of a save operation. */
export type SaveResult =
  | { success: true }
  | { success: false; error: string };

/** Cached table metadata from PRAGMA table_info. */
export interface TableInfo {
  columns: Set<string>;
  pkColumns: string[];
}

/** Type alias for better-sqlite3 Database — avoids importing in every file. */
export type { Database };
