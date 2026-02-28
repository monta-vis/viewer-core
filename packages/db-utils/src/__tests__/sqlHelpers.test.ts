import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { assertValidIdentifier, getTableInfo, toSqliteValue } from "../sqlHelpers.js";
import type { TableInfo } from "../types.js";

describe("assertValidIdentifier", () => {
  it("accepts valid SQL identifiers", () => {
    expect(() => assertValidIdentifier("steps")).not.toThrow();
    expect(() => assertValidIdentifier("video_frame_areas")).not.toThrow();
    expect(() => assertValidIdentifier("_private")).not.toThrow();
    expect(() => assertValidIdentifier("Table1")).not.toThrow();
  });

  it("rejects identifiers with special characters", () => {
    expect(() => assertValidIdentifier("steps; DROP TABLE")).toThrow("Invalid SQL identifier");
    expect(() => assertValidIdentifier('table"name')).toThrow("Invalid SQL identifier");
    expect(() => assertValidIdentifier("table name")).toThrow("Invalid SQL identifier");
    expect(() => assertValidIdentifier("")).toThrow("Invalid SQL identifier");
    expect(() => assertValidIdentifier("123start")).toThrow("Invalid SQL identifier");
  });
});

describe("getTableInfo", () => {
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
    db.exec(`
      CREATE TABLE composite_pk (
        part_a TEXT NOT NULL,
        part_b TEXT NOT NULL,
        value TEXT,
        PRIMARY KEY (part_a, part_b)
      )
    `);
  });

  afterEach(() => {
    db.close();
  });

  it("returns columns and primary key for a simple table", () => {
    const cache: Record<string, TableInfo> = {};
    const info = getTableInfo(db, "items", cache);

    expect(info.columns).toEqual(new Set(["id", "name", "active"]));
    expect(info.pkColumns).toEqual(["id"]);
  });

  it("returns composite primary keys in order", () => {
    const cache: Record<string, TableInfo> = {};
    const info = getTableInfo(db, "composite_pk", cache);

    expect(info.columns).toEqual(new Set(["part_a", "part_b", "value"]));
    expect(info.pkColumns).toEqual(["part_a", "part_b"]);
  });

  it("caches results on second call", () => {
    const cache: Record<string, TableInfo> = {};
    const first = getTableInfo(db, "items", cache);
    const second = getTableInfo(db, "items", cache);

    expect(first).toBe(second); // same object reference
  });

  it("returns empty columns for non-existent table", () => {
    const cache: Record<string, TableInfo> = {};
    const info = getTableInfo(db, "nonexistent", cache);

    expect(info.columns.size).toBe(0);
    expect(info.pkColumns).toEqual([]);
  });

  it("rejects invalid table names", () => {
    const cache: Record<string, TableInfo> = {};
    expect(() => getTableInfo(db, "bad; DROP TABLE", cache)).toThrow("Invalid SQL identifier");
  });
});

describe("toSqliteValue", () => {
  it("converts true to 1", () => {
    expect(toSqliteValue(true)).toBe(1);
  });

  it("converts false to 0", () => {
    expect(toSqliteValue(false)).toBe(0);
  });

  it("converts undefined to null", () => {
    expect(toSqliteValue(undefined)).toBeNull();
  });

  it("passes null through", () => {
    expect(toSqliteValue(null)).toBeNull();
  });

  it("passes strings through", () => {
    expect(toSqliteValue("hello")).toBe("hello");
  });

  it("passes numbers through", () => {
    expect(toSqliteValue(42)).toBe(42);
  });
});
