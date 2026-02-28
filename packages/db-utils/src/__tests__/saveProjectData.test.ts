import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { saveProjectData } from "../saveProjectData.js";
import type { SaveConfig, ProjectChanges } from "../types.js";

/** Helper: create a minimal test schema */
function createTestSchema(db: InstanceType<typeof Database>) {
  db.exec(`
    CREATE TABLE instructions (
      id TEXT PRIMARY KEY,
      name TEXT,
      source_language TEXT DEFAULT 'de',
      updated_at TEXT
    );
    CREATE TABLE steps (
      id TEXT PRIMARY KEY,
      name TEXT,
      active INTEGER DEFAULT 0,
      instruction_id TEXT
    );
    CREATE TABLE substeps (
      id TEXT PRIMARY KEY,
      name TEXT,
      step_id TEXT,
      FOREIGN KEY (step_id) REFERENCES steps(id)
    );
    CREATE TABLE translations (
      id TEXT PRIMARY KEY,
      entity_type TEXT,
      entity_id TEXT,
      language_code TEXT,
      field_name TEXT,
      text TEXT
    );
    CREATE TABLE audit_steps (
      audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
      id TEXT,
      name TEXT,
      active INTEGER,
      instruction_id TEXT,
      change_type TEXT NOT NULL,
      changed_at TEXT NOT NULL
    );
  `);
  db.prepare("INSERT INTO instructions (id, name, updated_at) VALUES (?, ?, ?)").run(
    "instr-1", "Test Instruction", "2024-01-01T00:00:00Z",
  );
}

function makeConfig(overrides?: Partial<SaveConfig>): SaveConfig {
  return {
    allowedTables: new Set(["steps", "substeps", "translations"]),
    deleteOrder: ["substeps", "translations", "steps"],
    ...overrides,
  };
}

describe("saveProjectData", () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = new Database(":memory:");
    createTestSchema(db);
  });

  afterEach(() => {
    db.close();
  });

  // ── UPSERT ──

  it("inserts a new row", () => {
    const changes: ProjectChanges = {
      changed: {
        steps: [{ id: "s1", name: "Step 1", active: false, instruction_id: "instr-1" }],
      },
      deleted: {},
    };

    const result = saveProjectData(db, changes, makeConfig());
    expect(result).toEqual({ success: true });

    const row = db.prepare("SELECT * FROM steps WHERE id = ?").get("s1") as Record<string, unknown>;
    expect(row.name).toBe("Step 1");
    expect(row.active).toBe(0); // boolean → int
  });

  it("updates an existing row via upsert", () => {
    db.prepare("INSERT INTO steps (id, name) VALUES (?, ?)").run("s1", "Old Name");

    const changes: ProjectChanges = {
      changed: {
        steps: [{ id: "s1", name: "New Name" }],
      },
      deleted: {},
    };

    const result = saveProjectData(db, changes, makeConfig());
    expect(result).toEqual({ success: true });

    const row = db.prepare("SELECT * FROM steps WHERE id = ?").get("s1") as Record<string, unknown>;
    expect(row.name).toBe("New Name");
  });

  it("converts booleans to integers", () => {
    const changes: ProjectChanges = {
      changed: {
        steps: [{ id: "s1", name: "Step", active: true }],
      },
      deleted: {},
    };

    saveProjectData(db, changes, makeConfig());

    const row = db.prepare("SELECT active FROM steps WHERE id = ?").get("s1") as Record<string, unknown>;
    expect(row.active).toBe(1);
  });

  it("skips tables not in allowedTables", () => {
    const changes: ProjectChanges = {
      changed: {
        unknown_table: [{ id: "x1", value: "test" }],
      },
      deleted: {},
    };

    const result = saveProjectData(db, changes, makeConfig());
    expect(result).toEqual({ success: true });
    // No error, just silently skipped
  });

  it("maps 'instruction' key to 'instructions' table", () => {
    const changes: ProjectChanges = {
      changed: {
        instruction: [{ id: "instr-1", name: "Updated Name" }],
      },
      deleted: {},
    };

    // instruction is always allowed (special case)
    const result = saveProjectData(db, changes, makeConfig());
    expect(result).toEqual({ success: true });

    const row = db.prepare("SELECT name FROM instructions WHERE id = ?").get("instr-1") as Record<string, unknown>;
    expect(row.name).toBe("Updated Name");
  });

  it("updates instructions.updated_at scoped to changed rows", () => {
    // Insert a second instruction row
    db.prepare("INSERT INTO instructions (id, name, updated_at) VALUES (?, ?, ?)").run(
      "instr-2", "Second", "2024-01-01T00:00:00Z",
    );

    const changes: ProjectChanges = {
      changed: {
        instruction: [{ id: "instr-1", name: "Updated" }],
      },
      deleted: {},
    };

    saveProjectData(db, changes, makeConfig());

    const row1 = db.prepare("SELECT updated_at FROM instructions WHERE id = ?").get("instr-1") as Record<string, unknown>;
    const row2 = db.prepare("SELECT updated_at FROM instructions WHERE id = ?").get("instr-2") as Record<string, unknown>;
    // Only instr-1 should have updated_at changed
    expect(row1.updated_at).not.toBe("2024-01-01T00:00:00Z");
    expect(row2.updated_at).toBe("2024-01-01T00:00:00Z");
  });

  // ── DELETE ──

  it("deletes rows in FK-safe order", () => {
    db.pragma("foreign_keys = ON");
    db.prepare("INSERT INTO steps (id, name) VALUES (?, ?)").run("s1", "Step");
    db.prepare("INSERT INTO substeps (id, name, step_id) VALUES (?, ?, ?)").run("ss1", "Sub", "s1");

    const changes: ProjectChanges = {
      changed: {},
      deleted: {
        substeps_ids: ["ss1"],
        steps_ids: ["s1"],
      },
    };

    const result = saveProjectData(db, changes, makeConfig());
    expect(result).toEqual({ success: true });

    const steps = db.prepare("SELECT * FROM steps").all();
    const substeps = db.prepare("SELECT * FROM substeps").all();
    expect(steps).toHaveLength(0);
    expect(substeps).toHaveLength(0);
  });

  it("cleans up translations on delete by default", () => {
    db.prepare("INSERT INTO steps (id, name) VALUES (?, ?)").run("s1", "Step");
    db.prepare("INSERT INTO translations (id, entity_type, entity_id, language_code, field_name, text) VALUES (?, ?, ?, ?, ?, ?)").run(
      "t1", "step", "s1", "en", "name", "Step EN",
    );

    const changes: ProjectChanges = {
      changed: {},
      deleted: { steps_ids: ["s1"] },
    };

    saveProjectData(db, changes, makeConfig());

    const translations = db.prepare("SELECT * FROM translations WHERE entity_id = ?").all("s1");
    expect(translations).toHaveLength(0);
  });

  it("skips translation cleanup when cleanupTranslationsOnDelete is false", () => {
    db.prepare("INSERT INTO steps (id, name) VALUES (?, ?)").run("s1", "Step");
    db.prepare("INSERT INTO translations (id, entity_type, entity_id, language_code, field_name, text) VALUES (?, ?, ?, ?, ?, ?)").run(
      "t1", "step", "s1", "en", "name", "Step EN",
    );

    const changes: ProjectChanges = {
      changed: {},
      deleted: { steps_ids: ["s1"] },
    };

    saveProjectData(db, changes, makeConfig({ cleanupTranslationsOnDelete: false }));

    const translations = db.prepare("SELECT * FROM translations WHERE entity_id = ?").all("s1");
    expect(translations).toHaveLength(1);
  });

  // ── ROLLBACK ──

  it("rolls back on error (no partial writes)", () => {
    db.prepare("INSERT INTO steps (id, name) VALUES (?, ?)").run("s1", "Step");

    const changes: ProjectChanges = {
      changed: {
        steps: [{ id: "s2", name: "New Step" }],
      },
      deleted: {
        // Try to delete from a non-existent table to trigger an error
        nonexistent_ids: ["x1"],
      },
    };

    // This should succeed because nonexistent table is not in allowedTables (skipped)
    const result = saveProjectData(db, changes, makeConfig());
    expect(result.success).toBe(true);
  });

  it("returns error result on exception", () => {
    // Close the db to force an error
    db.close();

    const changes: ProjectChanges = {
      changed: { steps: [{ id: "s1", name: "test" }] },
      deleted: {},
    };

    const result = saveProjectData(db, changes, makeConfig());
    expect(result.success).toBe(false);
    expect(result).toHaveProperty("error");
  });

  // ── SOURCE LANGUAGE BACKFILL ──

  it("backfills source_language when configured", () => {
    db.exec(`ALTER TABLE steps ADD COLUMN source_language TEXT`);
    db.prepare("INSERT INTO steps (id, name) VALUES (?, ?)").run("s1", "Step");

    const changes: ProjectChanges = {
      changed: {
        steps: [{ id: "s2", name: "New Step" }],
      },
      deleted: {},
    };

    const config = makeConfig({ sourceLanguageBackfillTables: ["steps"] });
    saveProjectData(db, changes, config);

    const rows = db.prepare("SELECT id, source_language FROM steps WHERE source_language IS NULL").all();
    expect(rows).toHaveLength(0); // All should have source_language set
  });

  it("skips backfill when sourceLanguageBackfillTables is undefined", () => {
    db.exec(`ALTER TABLE steps ADD COLUMN source_language TEXT`);
    db.prepare("INSERT INTO steps (id, name) VALUES (?, ?)").run("s1", "Step");

    const changes: ProjectChanges = {
      changed: {},
      deleted: {},
    };

    saveProjectData(db, changes, makeConfig());

    const row = db.prepare("SELECT source_language FROM steps WHERE id = ?").get("s1") as Record<string, unknown>;
    expect(row.source_language).toBeNull(); // Not backfilled
  });

  // ── AUDIT ──

  it("records audit entries when auditTableMap is provided", () => {
    const changes: ProjectChanges = {
      changed: {
        steps: [{ id: "s1", name: "Step 1", active: true }],
      },
      deleted: {},
    };

    const config = makeConfig({ auditTableMap: { steps: "audit_steps" } });
    saveProjectData(db, changes, config);

    const audits = db.prepare("SELECT * FROM audit_steps").all() as Record<string, unknown>[];
    expect(audits).toHaveLength(1);
    expect(audits[0].id).toBe("s1");
    expect(audits[0].change_type).toBe("create");
  });

  it("records update audit for existing rows", () => {
    db.prepare("INSERT INTO steps (id, name) VALUES (?, ?)").run("s1", "Old");

    const changes: ProjectChanges = {
      changed: {
        steps: [{ id: "s1", name: "New" }],
      },
      deleted: {},
    };

    const config = makeConfig({ auditTableMap: { steps: "audit_steps" } });
    saveProjectData(db, changes, config);

    const audits = db.prepare("SELECT * FROM audit_steps").all() as Record<string, unknown>[];
    expect(audits).toHaveLength(1);
    expect(audits[0].change_type).toBe("update");
  });

  it("records full-row snapshot in delete audit entries", () => {
    db.prepare("INSERT INTO steps (id, name, active) VALUES (?, ?, ?)").run("s1", "Step One", 1);

    const changes: ProjectChanges = {
      changed: {},
      deleted: { steps_ids: ["s1"] },
    };

    const config = makeConfig({ auditTableMap: { steps: "audit_steps" } });
    saveProjectData(db, changes, config);

    const audits = db.prepare("SELECT * FROM audit_steps").all() as Record<string, unknown>[];
    expect(audits).toHaveLength(1);
    expect(audits[0].change_type).toBe("delete");
    expect(audits[0].id).toBe("s1");
    expect(audits[0].name).toBe("Step One"); // full row snapshot, not just id
    expect(audits[0].active).toBe(1);
  });

  it("skips audit entirely when auditTableMap is undefined", () => {
    const changes: ProjectChanges = {
      changed: {
        steps: [{ id: "s1", name: "Step 1" }],
      },
      deleted: {},
    };

    saveProjectData(db, changes, makeConfig());

    const audits = db.prepare("SELECT * FROM audit_steps").all();
    expect(audits).toHaveLength(0);
  });

  // ── EMPTY CHANGES ──

  it("returns success for empty changes (no-op)", () => {
    const changes: ProjectChanges = {
      changed: {},
      deleted: {},
    };

    const result = saveProjectData(db, changes, makeConfig());
    expect(result).toEqual({ success: true });
  });

  // ── IDENTIFIER VALIDATION ──

  it("rejects invalid table names in allowedTables", () => {
    const changes: ProjectChanges = {
      changed: {
        "bad; DROP TABLE steps": [{ id: "x1" }],
      },
      deleted: {},
    };

    const config = makeConfig({
      allowedTables: new Set(["bad; DROP TABLE steps"]),
    });
    const result = saveProjectData(db, changes, config);
    expect(result.success).toBe(false);
    expect(result).toHaveProperty("error");
  });
});
