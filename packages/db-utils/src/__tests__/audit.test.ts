import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { buildAuditInsert, recordAudit } from "../audit.js";
import type { TableInfo } from "../types.js";

describe("buildAuditInsert", () => {
  it("builds correct INSERT SQL for a create action", () => {
    const result = buildAuditInsert(
      "audit_steps",
      ["audit_id", "id", "name", "change_type", "changed_at"],
      { id: "step-1", name: "Step One" },
      "create",
    );

    expect(result.sql).toContain('INSERT INTO "audit_steps"');
    expect(result.sql).toContain('"id"');
    expect(result.sql).toContain('"name"');
    expect(result.sql).toContain('"change_type"');
    expect(result.sql).toContain('"changed_at"');
    // audit_id should be excluded (auto-increment)
    expect(result.sql).not.toContain('"audit_id"');
    expect(result.values).toContain("step-1");
    expect(result.values).toContain("Step One");
    expect(result.values).toContain("create");
  });

  it("filters out columns not present in rowData", () => {
    const result = buildAuditInsert(
      "audit_steps",
      ["audit_id", "id", "name", "description", "change_type", "changed_at"],
      { id: "step-1" },
      "delete",
    );

    // Should include id, change_type, changed_at but NOT name or description
    expect(result.sql).toContain('"id"');
    expect(result.sql).toContain('"change_type"');
    expect(result.sql).not.toContain('"name"');
    expect(result.sql).not.toContain('"description"');
  });

  it("always includes change_type and changed_at even with no data columns", () => {
    const result = buildAuditInsert(
      "audit_steps",
      ["audit_id", "change_type", "changed_at"],
      { unrelated_field: "value" },
      "update",
    );

    expect(result.sql).toContain('"change_type"');
    expect(result.sql).toContain('"changed_at"');
  });

  it("rejects invalid audit table names", () => {
    expect(() =>
      buildAuditInsert("bad; DROP TABLE", ["id"], {}, "create"),
    ).toThrow("Invalid SQL identifier");
  });
});

describe("recordAudit", () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = new Database(":memory:");
    db.exec(`
      CREATE TABLE steps (
        id TEXT PRIMARY KEY,
        name TEXT
      )
    `);
    db.exec(`
      CREATE TABLE audit_steps (
        audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
        id TEXT,
        name TEXT,
        change_type TEXT NOT NULL,
        changed_at TEXT NOT NULL
      )
    `);
  });

  afterEach(() => {
    db.close();
  });

  it("inserts an audit row when table is mapped", () => {
    const auditTableMap = { steps: "audit_steps" };

    recordAudit(db, auditTableMap, "steps", { id: "s1", name: "Test" }, "create");

    const rows = db.prepare("SELECT * FROM audit_steps").all() as Record<string, unknown>[];
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("s1");
    expect(rows[0].name).toBe("Test");
    expect(rows[0].change_type).toBe("create");
    expect(rows[0].changed_at).toBeTruthy();
  });

  it("is a no-op when table is not in auditTableMap", () => {
    const auditTableMap = { other_table: "audit_other" };

    // Should not throw
    recordAudit(db, auditTableMap, "steps", { id: "s1" }, "update");

    const rows = db.prepare("SELECT * FROM audit_steps").all();
    expect(rows).toHaveLength(0);
  });

  it("records multiple audit entries", () => {
    const auditTableMap = { steps: "audit_steps" };

    recordAudit(db, auditTableMap, "steps", { id: "s1", name: "V1" }, "create");
    recordAudit(db, auditTableMap, "steps", { id: "s1", name: "V2" }, "update");
    recordAudit(db, auditTableMap, "steps", { id: "s1" }, "delete");

    const rows = db.prepare("SELECT * FROM audit_steps ORDER BY audit_id").all() as Record<string, unknown>[];
    expect(rows).toHaveLength(3);
    expect(rows[0].change_type).toBe("create");
    expect(rows[1].change_type).toBe("update");
    expect(rows[2].change_type).toBe("delete");
  });

  it("uses tableInfoCache to avoid repeated PRAGMA calls", () => {
    const auditTableMap = { steps: "audit_steps" };
    const cache: Record<string, TableInfo> = {};

    recordAudit(db, auditTableMap, "steps", { id: "s1" }, "create", cache);
    recordAudit(db, auditTableMap, "steps", { id: "s2" }, "create", cache);

    // Cache should have audit_steps entry
    expect(cache["audit_steps"]).toBeDefined();
    expect(cache["audit_steps"].columns).toContain("id");

    const rows = db.prepare("SELECT * FROM audit_steps").all();
    expect(rows).toHaveLength(2);
  });
});
