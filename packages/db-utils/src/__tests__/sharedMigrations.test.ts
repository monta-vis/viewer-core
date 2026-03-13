import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import {
  migrateV44_renameTutorials,
  migrateV45_previewColumns,
  migrateV46_variants,
  migrateV47_variantPreviewImage,
  SHARED_MIGRATIONS,
  SHARED_SCHEMA_VERSION,
} from "../sharedMigrations.js";
import { hasColumn, dbTableExists } from "../migrationHelpers.js";

function tableExists(db: InstanceType<typeof Database>, name: string): boolean {
  return (
    (
      db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      ).get(name) as { name: string } | undefined
    ) != null
  );
}

describe("sharedMigrations", () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = new Database(":memory:");
    // Create a baseline schema resembling a v43 DB
    db.exec(`
      CREATE TABLE instructions (id TEXT PRIMARY KEY, title TEXT);
      CREATE TABLE assemblies (id TEXT PRIMARY KEY, instruction_id TEXT, title TEXT);
      CREATE TABLE steps (id TEXT PRIMARY KEY, instruction_id TEXT, assembly_id TEXT, step_number INTEGER);
      CREATE TABLE substeps (id TEXT PRIMARY KEY, step_id TEXT, step_order INTEGER);
      CREATE TABLE videos (id TEXT PRIMARY KEY);
      CREATE TABLE video_sections (id TEXT PRIMARY KEY, video_id TEXT, start_frame INTEGER, end_frame INTEGER);
      CREATE TABLE video_frame_areas (id TEXT PRIMARY KEY);
      CREATE TABLE substep_references (id TEXT PRIMARY KEY, substep_id TEXT, target_type TEXT NOT NULL, target_id TEXT NOT NULL);
    `);
  });

  afterEach(() => {
    db.close();
  });

  describe("SHARED_SCHEMA_VERSION", () => {
    it("is 47", () => {
      expect(SHARED_SCHEMA_VERSION).toBe(47);
    });
  });

  describe("SHARED_MIGRATIONS", () => {
    it("contains 4 migrations for v44-v47", () => {
      expect(SHARED_MIGRATIONS).toHaveLength(4);
      expect(SHARED_MIGRATIONS.map((m) => m.version)).toEqual([44, 45, 46, 47]);
    });
  });

  describe("migrateV44_renameTutorials", () => {
    it("renames substep_references to substep_tutorials", () => {
      migrateV44_renameTutorials(db);
      expect(tableExists(db, "substep_tutorials")).toBe(true);
      expect(tableExists(db, "substep_references")).toBe(false);
    });

    it("is idempotent — no-op if substep_tutorials already exists", () => {
      migrateV44_renameTutorials(db);
      // Run again — should not throw
      migrateV44_renameTutorials(db);
      expect(tableExists(db, "substep_tutorials")).toBe(true);
    });

    it("handles DB with neither table (no-op)", () => {
      db.exec("DROP TABLE substep_references");
      // Should not throw
      migrateV44_renameTutorials(db);
    });

    it("handles DB that already has substep_tutorials and not substep_references", () => {
      db.exec("ALTER TABLE substep_references RENAME TO substep_tutorials");
      // Should not throw
      migrateV44_renameTutorials(db);
      expect(tableExists(db, "substep_tutorials")).toBe(true);
    });
  });

  describe("migrateV45_previewColumns", () => {
    it("adds video_frame_area_id to steps and assemblies", () => {
      migrateV45_previewColumns(db);
      expect(hasColumn(db, "steps", "video_frame_area_id")).toBe(true);
      expect(hasColumn(db, "assemblies", "video_frame_area_id")).toBe(true);
    });

    it("adds repeat_video_frame_area_id to substeps", () => {
      migrateV45_previewColumns(db);
      expect(hasColumn(db, "substeps", "repeat_video_frame_area_id")).toBe(true);
    });

    it("adds fps to video_sections", () => {
      migrateV45_previewColumns(db);
      expect(hasColumn(db, "video_sections", "fps")).toBe(true);
    });

    it("is idempotent — no-op on second run", () => {
      migrateV45_previewColumns(db);
      migrateV45_previewColumns(db);
      expect(hasColumn(db, "steps", "video_frame_area_id")).toBe(true);
      expect(hasColumn(db, "video_sections", "fps")).toBe(true);
    });
  });

  describe("migrateV46_variants", () => {
    it("creates variants table", () => {
      migrateV46_variants(db);
      expect(dbTableExists(db, "variants")).toBe(true);

      // Check columns
      const cols = (db.pragma('table_info("variants")') as Array<{ name: string }>).map(c => c.name);
      expect(cols).toContain("id");
      expect(cols).toContain("version_id");
      expect(cols).toContain("instruction_id");
      expect(cols).toContain("title");
      expect(cols).toContain("description");
      expect(cols).toContain("order");
    });

    it("creates variant_exclusions table", () => {
      migrateV46_variants(db);
      expect(dbTableExists(db, "variant_exclusions")).toBe(true);

      const cols = (db.pragma('table_info("variant_exclusions")') as Array<{ name: string }>).map(c => c.name);
      expect(cols).toContain("variant_id");
      expect(cols).toContain("entity_type");
      expect(cols).toContain("entity_id");
    });

    it("creates audit tables with full schema (changed_by, status, reviewed_by, reviewed_at)", () => {
      migrateV46_variants(db);

      for (const auditTable of ["variants_audit", "variant_exclusions_audit"]) {
        expect(dbTableExists(db, auditTable)).toBe(true);
        const cols = (db.pragma(`table_info("${auditTable}")`) as Array<{ name: string }>).map(c => c.name);
        expect(cols).toContain("change_type");
        expect(cols).toContain("changed_by");
        expect(cols).toContain("changed_at");
        expect(cols).toContain("status");
        expect(cols).toContain("reviewed_by");
        expect(cols).toContain("reviewed_at");
      }
    });

    it("is idempotent — CREATE TABLE IF NOT EXISTS", () => {
      migrateV46_variants(db);
      migrateV46_variants(db);
      expect(dbTableExists(db, "variants")).toBe(true);
    });
  });

  describe("migrateV47_variantPreviewImage", () => {
    it("adds video_frame_area_id to variants table", () => {
      // v46 creates the variants table
      migrateV46_variants(db);
      migrateV47_variantPreviewImage(db);
      expect(hasColumn(db, "variants", "video_frame_area_id")).toBe(true);
    });

    it("defaults video_frame_area_id to NULL", () => {
      migrateV46_variants(db);
      db.prepare("INSERT INTO variants (id, version_id, instruction_id, title, \"order\") VALUES (?, ?, ?, ?, ?)").run("v1", "ver1", "ins1", "Variant 1", 0);
      migrateV47_variantPreviewImage(db);

      const row = db.prepare("SELECT video_frame_area_id FROM variants WHERE id = ?").get("v1") as { video_frame_area_id: string | null };
      expect(row.video_frame_area_id).toBeNull();
    });

    it("is idempotent — no-op on second run", () => {
      migrateV46_variants(db);
      migrateV47_variantPreviewImage(db);
      migrateV47_variantPreviewImage(db);
      expect(hasColumn(db, "variants", "video_frame_area_id")).toBe(true);
    });
  });
});
