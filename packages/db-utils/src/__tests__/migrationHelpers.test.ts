import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { dbColumns, hasColumn, dbTableExists } from "../migrationHelpers.js";

describe("migrationHelpers", () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = new Database(":memory:");
    db.exec(`
      CREATE TABLE items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        active INTEGER DEFAULT 0
      )
    `);
  });

  afterEach(() => {
    db.close();
  });

  describe("dbColumns", () => {
    it("returns column names for an existing table", () => {
      expect(dbColumns(db, "items")).toEqual(["id", "name", "active"]);
    });

    it("returns empty array for non-existent table", () => {
      expect(dbColumns(db, "nonexistent")).toEqual([]);
    });
  });

  describe("hasColumn", () => {
    it("returns true when column exists", () => {
      expect(hasColumn(db, "items", "name")).toBe(true);
    });

    it("returns false when column does not exist", () => {
      expect(hasColumn(db, "items", "missing")).toBe(false);
    });

    it("returns false for non-existent table", () => {
      expect(hasColumn(db, "nonexistent", "id")).toBe(false);
    });
  });

  describe("dbTableExists", () => {
    it("returns true for existing table", () => {
      expect(dbTableExists(db, "items")).toBe(true);
    });

    it("returns false for non-existent table", () => {
      expect(dbTableExists(db, "nonexistent")).toBe(false);
    });
  });
});
