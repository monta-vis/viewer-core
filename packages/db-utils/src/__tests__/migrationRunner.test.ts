import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import os from "os";
import { runMigrations, ensureMigrated } from "../migrationRunner.js";
import type { Migration, MigrationConfig } from "../migrationTypes.js";

function getUserVersion(db: InstanceType<typeof Database>): number {
  const [{ user_version }] = db.pragma("user_version") as [{ user_version: number }];
  return user_version;
}

describe("runMigrations", () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = new Database(":memory:");
  });

  afterEach(() => {
    db.close();
  });

  it("runs pending migrations and sets user_version", () => {
    const up1 = vi.fn((d: InstanceType<typeof Database>) => {
      d.exec("CREATE TABLE t1 (id TEXT)");
    });
    const up2 = vi.fn((d: InstanceType<typeof Database>) => {
      d.exec("CREATE TABLE t2 (id TEXT)");
    });

    const config: MigrationConfig = {
      schemaVersion: 2,
      migrations: [
        { version: 1, description: "create t1", up: up1 },
        { version: 2, description: "create t2", up: up2 },
      ],
    };

    runMigrations(db, config);

    expect(up1).toHaveBeenCalledOnce();
    expect(up2).toHaveBeenCalledOnce();
    expect(getUserVersion(db)).toBe(2);

    // Tables actually created
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>;
    const tableNames = tables.map(t => t.name);
    expect(tableNames).toContain("t1");
    expect(tableNames).toContain("t2");
  });

  it("skips already-applied migrations", () => {
    db.pragma("user_version = 1");

    const up1 = vi.fn();
    const up2 = vi.fn((d: InstanceType<typeof Database>) => {
      d.exec("CREATE TABLE t2 (id TEXT)");
    });

    const config: MigrationConfig = {
      schemaVersion: 2,
      migrations: [
        { version: 1, description: "already done", up: up1 },
        { version: 2, description: "create t2", up: up2 },
      ],
    };

    runMigrations(db, config);

    expect(up1).not.toHaveBeenCalled();
    expect(up2).toHaveBeenCalledOnce();
    expect(getUserVersion(db)).toBe(2);
  });

  it("does nothing when all migrations already applied", () => {
    db.pragma("user_version = 3");

    const up = vi.fn();
    const config: MigrationConfig = {
      schemaVersion: 3,
      migrations: [
        { version: 1, description: "v1", up },
        { version: 2, description: "v2", up },
        { version: 3, description: "v3", up },
      ],
    };

    runMigrations(db, config);

    expect(up).not.toHaveBeenCalled();
    expect(getUserVersion(db)).toBe(3);
  });

  it("runs postMigrationSql after migrations", () => {
    const config: MigrationConfig = {
      schemaVersion: 1,
      migrations: [
        {
          version: 1,
          description: "create base",
          up: (d) => d.exec("CREATE TABLE items (id TEXT PRIMARY KEY)"),
        },
      ],
      postMigrationSql: "CREATE INDEX IF NOT EXISTS idx_items_id ON items(id);",
    };

    runMigrations(db, config);

    // Index should exist
    const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='items'").all() as Array<{ name: string }>;
    expect(indexes.some(i => i.name === "idx_items_id")).toBe(true);
  });

  it("rolls back on migration failure", () => {
    db.exec("CREATE TABLE existing (id TEXT)");

    const config: MigrationConfig = {
      schemaVersion: 2,
      migrations: [
        {
          version: 1,
          description: "create t1",
          up: (d) => d.exec("CREATE TABLE t1 (id TEXT)"),
        },
        {
          version: 2,
          description: "fails",
          up: () => { throw new Error("migration error"); },
        },
      ],
    };

    expect(() => runMigrations(db, config)).toThrow("migration error");
    expect(getUserVersion(db)).toBe(0); // rolled back
  });
});

describe("ensureMigrated", () => {
  let tmpDir: string;
  let dbPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mig-test-"));
    dbPath = path.join(tmpDir, "test.db");
    const db = new Database(dbPath);
    db.exec("CREATE TABLE base (id TEXT)");
    db.close();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("migrates a database file and sets version", async () => {
    const config: MigrationConfig = {
      schemaVersion: 1,
      migrations: [
        {
          version: 1,
          description: "add col",
          up: (d) => d.exec("ALTER TABLE base ADD COLUMN name TEXT"),
        },
      ],
    };

    await ensureMigrated(dbPath, config);

    const db = new Database(dbPath);
    expect(getUserVersion(db)).toBe(1);
    const cols = (db.pragma("table_info(base)") as Array<{ name: string }>).map(c => c.name);
    expect(cols).toContain("name");
    db.close();
  });

  it("skips if already at target version", async () => {
    const db = new Database(dbPath);
    db.pragma("user_version = 5");
    db.close();

    const up = vi.fn();
    const config: MigrationConfig = {
      schemaVersion: 5,
      migrations: [{ version: 5, description: "v5", up }],
    };

    await ensureMigrated(dbPath, config);
    expect(up).not.toHaveBeenCalled();
  });

  it("restores backup on failure", async () => {
    // Read original content
    const originalContent = fs.readFileSync(dbPath);

    const config: MigrationConfig = {
      schemaVersion: 1,
      migrations: [
        {
          version: 1,
          description: "fails",
          up: () => { throw new Error("boom"); },
        },
      ],
    };

    await expect(ensureMigrated(dbPath, config)).rejects.toThrow("boom");

    // DB should be restored
    const restoredContent = fs.readFileSync(dbPath);
    expect(restoredContent).toEqual(originalContent);

    // Backup should be cleaned up
    expect(fs.existsSync(dbPath + ".pre-migration-backup")).toBe(false);
  });
});
