import type Database from "better-sqlite3";
import type { Migration } from "./migrationTypes.js";
import { hasColumn, dbTableExists } from "./migrationHelpers.js";

/** Target schema version after all shared migrations. */
export const SHARED_SCHEMA_VERSION = 47;

/**
 * v44: Rename substep_references → substep_tutorials.
 * Idempotent: checks both table names before acting.
 */
export function migrateV44_renameTutorials(db: Database.Database): void {
  const hasOld = dbTableExists(db, "substep_references");
  const hasNew = dbTableExists(db, "substep_tutorials");

  if (hasOld && !hasNew) {
    db.exec("ALTER TABLE substep_references RENAME TO substep_tutorials");
  }
}

/**
 * v45: Add preview image columns and fps.
 * - video_frame_area_id on steps and assemblies
 * - repeat_video_frame_area_id on substeps
 * - fps on video_sections
 * Idempotent: checks hasColumn before each ALTER.
 */
export function migrateV45_previewColumns(db: Database.Database): void {
  if (!hasColumn(db, "steps", "video_frame_area_id")) {
    db.exec(
      "ALTER TABLE steps ADD COLUMN video_frame_area_id TEXT DEFAULT NULL",
    );
  }
  if (!hasColumn(db, "assemblies", "video_frame_area_id")) {
    db.exec(
      "ALTER TABLE assemblies ADD COLUMN video_frame_area_id TEXT DEFAULT NULL",
    );
  }
  if (!hasColumn(db, "substeps", "repeat_video_frame_area_id")) {
    db.exec(
      "ALTER TABLE substeps ADD COLUMN repeat_video_frame_area_id TEXT DEFAULT NULL",
    );
  }
  if (!hasColumn(db, "video_sections", "fps")) {
    db.exec(
      "ALTER TABLE video_sections ADD COLUMN fps REAL DEFAULT NULL",
    );
  }
}

/**
 * v46: Create variants + variant_exclusions tables with audit tables.
 * Uses the creator's full audit schema (changed_by, status, reviewed_by, reviewed_at).
 * Idempotent: CREATE TABLE IF NOT EXISTS.
 */
export function migrateV46_variants(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS variants (
      id TEXT PRIMARY KEY,
      version_id TEXT NOT NULL,
      instruction_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      "order" INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS variant_exclusions (
      id TEXT PRIMARY KEY,
      version_id TEXT NOT NULL,
      variant_id TEXT NOT NULL REFERENCES variants(id),
      entity_type TEXT NOT NULL CHECK(entity_type IN ('assembly', 'step', 'substep')),
      entity_id TEXT NOT NULL,
      UNIQUE(variant_id, entity_type, entity_id)
    );

    CREATE TABLE IF NOT EXISTS variants_audit (
      audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
      id TEXT NOT NULL,
      version_id TEXT,
      instruction_id TEXT,
      title TEXT,
      description TEXT,
      "order" INTEGER,
      change_type TEXT NOT NULL,
      changed_by TEXT,
      changed_at TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'pending',
      reviewed_by TEXT,
      reviewed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS variant_exclusions_audit (
      audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
      id TEXT NOT NULL,
      version_id TEXT,
      variant_id TEXT,
      entity_type TEXT,
      entity_id TEXT,
      change_type TEXT NOT NULL,
      changed_by TEXT,
      changed_at TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'pending',
      reviewed_by TEXT,
      reviewed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_variants_audit_id ON variants_audit(id);
    CREATE INDEX IF NOT EXISTS idx_variant_exclusions_audit_id ON variant_exclusions_audit(id);
  `);
}

/**
 * v47: Add video_frame_area_id to variants for preview images.
 * Idempotent: checks hasColumn before ALTER.
 */
export function migrateV47_variantPreviewImage(db: Database.Database): void {
  if (!hasColumn(db, "variants", "video_frame_area_id")) {
    db.exec(
      "ALTER TABLE variants ADD COLUMN video_frame_area_id TEXT DEFAULT NULL",
    );
  }
}

/** Shared migrations v44-v47, used by both viewer and creator. */
export const SHARED_MIGRATIONS: Migration[] = [
  {
    version: 44,
    description: "Rename substep_references to substep_tutorials",
    up: migrateV44_renameTutorials,
  },
  {
    version: 45,
    description: "Add preview image columns and fps to video_sections",
    up: migrateV45_previewColumns,
  },
  {
    version: 46,
    description: "Create variants and variant_exclusions tables",
    up: migrateV46_variants,
  },
  {
    version: 47,
    description: "Add video_frame_area_id to variants for preview images",
    up: migrateV47_variantPreviewImage,
  },
];
