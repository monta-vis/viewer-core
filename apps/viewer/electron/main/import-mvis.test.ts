import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "path";
import fs from "fs";
import os from "os";
import Database from "better-sqlite3";
import { deduplicateFolderName, readInstructionMeta } from "./import-mvis.js";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "mvis-test-"));
}

function createMockDb(dbPath: string, meta: { id: string; name: string; revision: number }): void {
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE instructions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      revision INTEGER NOT NULL DEFAULT 1
    )
  `);
  db.prepare("INSERT INTO instructions (id, name, revision) VALUES (?, ?, ?)").run(
    meta.id,
    meta.name,
    meta.revision,
  );
  db.close();
}

// ---------------------------------------------------------------------------
// deduplicateFolderName
// ---------------------------------------------------------------------------

describe("deduplicateFolderName", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("returns the name as-is when no conflict exists", () => {
    expect(deduplicateFolderName(tempDir, "My Project")).toBe("My Project");
  });

  it("appends -1 when the name already exists", () => {
    fs.mkdirSync(path.join(tempDir, "My Project"));
    expect(deduplicateFolderName(tempDir, "My Project")).toBe("My Project-1");
  });

  it("increments the suffix when multiple conflicts exist", () => {
    fs.mkdirSync(path.join(tempDir, "My Project"));
    fs.mkdirSync(path.join(tempDir, "My Project-1"));
    fs.mkdirSync(path.join(tempDir, "My Project-2"));
    expect(deduplicateFolderName(tempDir, "My Project")).toBe("My Project-3");
  });

  it("sanitizes invalid path characters", () => {
    const result = deduplicateFolderName(tempDir, 'My<>:"/\\|?*Project');
    expect(result).toBe("My_________Project");
  });
});

// ---------------------------------------------------------------------------
// readInstructionMeta
// ---------------------------------------------------------------------------

describe("readInstructionMeta", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("reads id, name, and revision from a valid DB", () => {
    const dbPath = path.join(tempDir, "montavis.db");
    createMockDb(dbPath, { id: "abc-123", name: "Test Instruction", revision: 3 });

    const meta = readInstructionMeta(dbPath);
    expect(meta).toEqual({
      id: "abc-123",
      name: "Test Instruction",
      revision: 3,
    });
  });

  it("returns null for a non-existent file", () => {
    const meta = readInstructionMeta(path.join(tempDir, "missing.db"));
    expect(meta).toBeNull();
  });

  it("returns null for an empty database", () => {
    const dbPath = path.join(tempDir, "empty.db");
    const db = new Database(dbPath);
    db.exec("CREATE TABLE instructions (id TEXT, name TEXT, revision INTEGER)");
    db.close();

    const meta = readInstructionMeta(dbPath);
    expect(meta).toBeNull();
  });

  it("returns null for a DB without instructions table", () => {
    const dbPath = path.join(tempDir, "no-table.db");
    const db = new Database(dbPath);
    db.exec("CREATE TABLE other (id TEXT)");
    db.close();

    const meta = readInstructionMeta(dbPath);
    expect(meta).toBeNull();
  });
});
