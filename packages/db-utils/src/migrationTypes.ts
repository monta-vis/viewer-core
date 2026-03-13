import type Database from "better-sqlite3";
import type { Logger } from "./types.js";

/** A single versioned migration. */
export interface Migration {
  version: number;
  description: string;
  up: (db: Database.Database) => void;
}

/** Configuration for the migration runner. */
export interface MigrationConfig {
  /** Target schema version (highest migration version). */
  schemaVersion: number;
  /** Ordered list of migrations to apply. */
  migrations: Migration[];
  /** SQL to run after all migrations (idempotent audit tables, indexes, etc.). */
  postMigrationSql?: string;
  /** Optional logger — defaults to console. */
  logger?: Logger;
}
